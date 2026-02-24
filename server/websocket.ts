import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { sdk } from "./_core/sdk";
import * as chatDb from "./chat-db";
import { sendChatPushNotification } from "./push-notifications";
import * as db from "./db";

// Map of userId -> Set of WebSocket connections (user can have multiple devices)
const userConnections = new Map<number, Set<WebSocket>>();

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    let userId: number | null = null;

    // Authenticate on first message
    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Authentication message
        if (msg.type === "auth") {
          try {
            // Create a fake request object for authentication
            const fakeReq = {
              headers: {
                authorization: msg.token ? `Bearer ${msg.token}` : undefined,
                cookie: msg.cookie || undefined,
              },
            } as any;
            console.log(`[WS] Auth attempt - token present: ${!!msg.token}, cookie present: ${!!msg.cookie}, userId: ${msg.userId} (type: ${typeof msg.userId})`);
            const user = await sdk.authenticateRequest(fakeReq);
            userId = user.id;

            // Register connection
            if (!userConnections.has(userId)) {
              userConnections.set(userId, new Set());
            }
            userConnections.get(userId)!.add(ws);

            // Send auth success
            ws.send(JSON.stringify({ type: "auth_success", userId }));

            // Send unread message count
            const unreadCount = await chatDb.getUnreadCount(userId);
            ws.send(JSON.stringify({ type: "unread_count", count: unreadCount }));

            console.log(`[WS] User ${userId} connected. Total connections: ${userConnections.get(userId)!.size}`);
          } catch (err: any) {
            console.log(`[WS] Primary auth failed:`, err?.message || err);
            // If auth fails, try fallback: userId from message
            const fallbackId = msg.userId ? Number(msg.userId) : null;
            console.log(`[WS] Trying fallback auth with userId:`, fallbackId);
            if (fallbackId && !isNaN(fallbackId) && fallbackId > 0) {
              try {
                // Verify this user exists in the users table
                const existingUser = await db.getUserById(fallbackId);
                console.log(`[WS] Fallback user lookup result:`, existingUser ? `found (id=${existingUser.id})` : 'not found');
                if (existingUser) {
                  userId = fallbackId;
                  if (!userConnections.has(fallbackId)) {
                    userConnections.set(fallbackId, new Set());
                  }
                  userConnections.get(fallbackId)!.add(ws);
                  ws.send(JSON.stringify({ type: "auth_success", userId: fallbackId }));
                  const unreadCount = await chatDb.getUnreadCount(fallbackId);
                  ws.send(JSON.stringify({ type: "unread_count", count: unreadCount }));
                  console.log(`[WS] User ${fallbackId} connected via fallback auth.`);
                  return;
                }
              } catch (fallbackErr: any) {
                console.error(`[WS] Fallback auth error:`, fallbackErr?.message || fallbackErr);
              }
            }
            ws.send(JSON.stringify({ type: "auth_error", message: "Authentication failed" }));
            ws.close();
          }
          return;
        }

        // All other messages require authentication
        if (!userId) {
          ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
          return;
        }

        // Send message
        if (msg.type === "send_message") {
          const { receiverId, message, messageType } = msg;
          if (!receiverId || !message) {
            ws.send(JSON.stringify({ type: "error", message: "Missing receiverId or message" }));
            return;
          }

          // Save to database
          const savedMsg = await chatDb.saveMessage({
            senderId: userId,
            receiverId: Number(receiverId),
            message: message.trim(),
            messageType: messageType || "text",
          });

          if (!savedMsg) {
            ws.send(JSON.stringify({ type: "error", message: "Failed to save message" }));
            return;
          }

          // Send to sender (confirmation)
          const outgoing = {
            type: "new_message",
            message: savedMsg,
          };
          ws.send(JSON.stringify(outgoing));

          // Send to receiver if online
          const receiverSockets = userConnections.get(Number(receiverId));
          let receiverOnline = false;
          if (receiverSockets) {
            const payload = JSON.stringify(outgoing);
            receiverSockets.forEach((sock) => {
              if (sock.readyState === WebSocket.OPEN) {
                sock.send(payload);
                receiverOnline = true;
              }
            });
          }

          // Send push notification if receiver is offline
          if (!receiverOnline) {
            const senderMonster = await db.getActiveMonster(userId);
            const senderName = senderMonster?.name || "Someone";
            const preview = (messageType === "image") ? "📷 Photo"
              : (messageType === "audio") ? "🎤 Voice message"
              : message.trim().substring(0, 100);
            sendChatPushNotification(userId, Number(receiverId), senderName, preview)
              .catch(err => console.error("[WS] Push notification failed:", err));
          }
        }

        // Mark messages as read
        if (msg.type === "mark_read") {
          const { senderId } = msg;
          if (senderId) {
            await chatDb.markMessagesAsRead(Number(senderId), userId);
            // Notify the sender that their messages were read
            const senderSockets = userConnections.get(Number(senderId));
            if (senderSockets) {
              const payload = JSON.stringify({
                type: "messages_read",
                readerId: userId,
              });
              senderSockets.forEach((sock) => {
                if (sock.readyState === WebSocket.OPEN) {
                  sock.send(payload);
                }
              });
            }
          }
        }

        // Request chat history
        if (msg.type === "get_history") {
          const { friendId, before, limit } = msg;
          if (!friendId) return;
          const messages = await chatDb.getChatHistory(
            userId,
            Number(friendId),
            limit || 50,
            before ? new Date(before) : undefined
          );
          ws.send(JSON.stringify({
            type: "chat_history",
            friendId: Number(friendId),
            messages,
          }));
        }

        // Typing indicator
        if (msg.type === "typing") {
          const { receiverId } = msg;
          const receiverSockets = userConnections.get(Number(receiverId));
          if (receiverSockets) {
            const payload = JSON.stringify({
              type: "typing",
              senderId: userId,
            });
            receiverSockets.forEach((sock) => {
              if (sock.readyState === WebSocket.OPEN) {
                sock.send(payload);
              }
            });
          }
        }

      } catch (err) {
        console.error("[WS] Error processing message:", err);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    });

    ws.on("close", () => {
      if (userId) {
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            userConnections.delete(userId);
          }
        }
        console.log(`[WS] User ${userId} disconnected.`);
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] WebSocket error:", err);
    });
  });

  console.log("[WS] WebSocket server initialized on /ws");
  return wss;
}

// Helper to send push-style notification to online users
export function sendToUser(userId: number, payload: object) {
  const sockets = userConnections.get(userId);
  if (!sockets) return false;
  const data = JSON.stringify(payload);
  let sent = false;
  sockets.forEach((sock) => {
    if (sock.readyState === WebSocket.OPEN) {
      sock.send(data);
      sent = true;
    }
  });
  return sent;
}

// Check if user is online
export function isUserOnline(userId: number): boolean {
  const sockets = userConnections.get(userId);
  if (!sockets) return false;
  for (const sock of sockets) {
    if (sock.readyState === WebSocket.OPEN) return true;
  }
  return false;
}

// Get online status for multiple users
export function getOnlineStatuses(userIds: number[]): Record<number, boolean> {
  const result: Record<number, boolean> = {};
  for (const uid of userIds) {
    result[uid] = isUserOnline(uid);
  }
  return result;
}
