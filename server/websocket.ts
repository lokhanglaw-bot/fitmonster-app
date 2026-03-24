import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { sdk } from "./_core/sdk";
import * as chatDb from "./chat-db";
import { sendChatPushNotification } from "./push-notifications";
import * as db from "./db";

// Map of userId -> Set of WebSocket connections (user can have multiple devices)
const userConnections = new Map<number, Set<WebSocket>>();

// Helper: safely send a message to a WebSocket
function safeSend(ws: WebSocket, data: string): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
      return true;
    }
    console.log("[WS] safeSend skipped — readyState:", ws.readyState);
    return false;
  } catch (e) {
    console.error("[WS] safeSend error:", e);
    return false;
  }
}

// Helper: register a connection for a user
function registerConnection(uid: number, ws: WebSocket) {
  if (!userConnections.has(uid)) {
    userConnections.set(uid, new Set());
  }
  userConnections.get(uid)!.add(ws);
  return userConnections.get(uid)!.size;
}

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  // Periodic cleanup of dead connections (every 30 seconds)
  const cleanupInterval = setInterval(() => {
    let cleaned = 0;
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        ws.terminate();
        cleaned++;
      }
    });
    if (cleaned > 0) {
      console.log(`[WS] Cleaned up ${cleaned} dead connections`);
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(cleanupInterval);
  });

  wss.on("connection", async (ws, req) => {
    let userId: number | null = null;
    console.log("[WS] New TCP connection from:", req.socket.remoteAddress);

    // Authenticate on first message
    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Handle ping/pong keepalive from client
        if (msg.type === "ping") {
          safeSend(ws, JSON.stringify({ type: "pong" }));
          return;
        }

        // Authentication message
        if (msg.type === "auth") {
          console.log(`[WS] Auth attempt - token: ${!!msg.token}, cookie: ${!!msg.cookie}, userId: ${msg.userId}, openId: ${msg.openId}`);
          
          // Try primary auth (token/cookie)
          let authSuccess = false;
          try {
            const fakeReq = {
              headers: {
                authorization: msg.token ? `Bearer ${msg.token}` : undefined,
                cookie: msg.cookie || undefined,
              },
            } as any;
            const user = await sdk.authenticateRequest(fakeReq);
            userId = user.id;
            const count = registerConnection(userId, ws);
            safeSend(ws, JSON.stringify({ type: "auth_success", userId }));
            console.log(`[WS] User ${userId} connected via token auth. Total: ${count}`);
            authSuccess = true;
          } catch (err: any) {
            console.log(`[WS] Primary auth failed:`, err?.message || err);
          }

          // If primary auth failed, reject connection
          if (!authSuccess) {
            console.log(`[WS] Auth failed — rejecting connection`);
            safeSend(ws, JSON.stringify({ type: "auth_failed", reason: "invalid_token" }));
            ws.close();
            return;
          }

          // Send unread count after successful auth
          if (authSuccess && userId) {
            try {
              const unreadCount = await chatDb.getUnreadCount(userId);
              safeSend(ws, JSON.stringify({ type: "unread_count", count: unreadCount }));
              console.log(`[WS] Sent unread count: ${unreadCount} to user ${userId}`);
            } catch (e) {
              console.error("[WS] Failed to get unread count:", e);
            }
          }
          return;
        }

        // All other messages require authentication
        if (!userId) {
          safeSend(ws, JSON.stringify({ type: "error", message: "Not authenticated" }));
          return;
        }

        // Send message
        if (msg.type === "send_message") {
          const { receiverId, message, messageType } = msg;
          if (!receiverId || !message) {
            safeSend(ws, JSON.stringify({ type: "error", message: "Missing receiverId or message" }));
            return;
          }

          console.log(`[WS] send_message from ${userId} to ${receiverId}, type: ${messageType || "text"}`);

          // Save to database
          const savedMsg = await chatDb.saveMessage({
            senderId: userId,
            receiverId: Number(receiverId),
            message: message.trim(),
            messageType: messageType || "text",
          });

          if (!savedMsg) {
            safeSend(ws, JSON.stringify({ type: "error", message: "Failed to save message" }));
            return;
          }

          console.log(`[WS] Message saved with id: ${savedMsg.id}`);

          // Broadcast to sender (all devices) and receiver
          const outgoing = JSON.stringify({
            type: "new_message",
            message: savedMsg,
          });

          // Send to sender's devices
          const senderSockets = userConnections.get(userId);
          if (senderSockets) {
            senderSockets.forEach((sock) => safeSend(sock, outgoing));
          }

          // Send to receiver if online
          const receiverSockets = userConnections.get(Number(receiverId));
          let receiverOnline = false;
          if (receiverSockets) {
            receiverSockets.forEach((sock) => {
              if (safeSend(sock, outgoing)) {
                receiverOnline = true;
              }
            });
          }

          console.log(`[WS] Message delivered - receiver ${receiverId} online: ${receiverOnline}`);

          // Send push notification if receiver is offline
          if (!receiverOnline) {
            console.log(`[WS] Sending push notification to offline user ${receiverId}`);
            try {
              const senderMonster = await db.getActiveMonster(userId);
              const senderName = senderMonster?.name || "Someone";
              const preview = (messageType === "image") ? "📷 Photo"
                : (messageType === "audio") ? "🎤 Voice message"
                : message.trim().substring(0, 100);
              await sendChatPushNotification(userId, Number(receiverId), senderName, preview, savedMsg.id);
              console.log(`[WS] Push notification sent to user ${receiverId}`);
            } catch (err) {
              console.error("[WS] Push notification failed:", err);
            }
          }
          return;
        }

        // Mark messages as read
        if (msg.type === "mark_read") {
          const { senderId } = msg;
          if (senderId) {
            console.log(`[WS] mark_read: user ${userId} read messages from ${senderId}`);
            await chatDb.markMessagesAsRead(Number(senderId), userId);
            // Notify the sender that their messages were read
            const senderSockets = userConnections.get(Number(senderId));
            if (senderSockets) {
              const payload = JSON.stringify({
                type: "messages_read",
                readerId: userId,
              });
              senderSockets.forEach((sock) => safeSend(sock, payload));
              console.log(`[WS] Notified sender ${senderId} about read receipt`);
            }
          }
          return;
        }

        // Request chat history
        if (msg.type === "get_history") {
          const { friendId, before, limit } = msg;
          if (!friendId) return;
          console.log(`[WS] get_history: user ${userId} requesting history with ${friendId}`);
          const messages = await chatDb.getChatHistory(
            userId,
            Number(friendId),
            limit || 50,
            before ? new Date(before) : undefined
          );
          safeSend(ws, JSON.stringify({
            type: "chat_history",
            friendId: Number(friendId),
            messages,
          }));
          console.log(`[WS] Sent ${messages.length} history messages to user ${userId}`);
          return;
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
            receiverSockets.forEach((sock) => safeSend(sock, payload));
          }
          return;
        }

        console.log(`[WS] Unknown message type: ${msg.type}`);

      } catch (err) {
        console.error("[WS] Error processing message:", err);
        try {
          safeSend(ws, JSON.stringify({ type: "error", message: "Invalid message format" }));
        } catch {}
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
        console.log(`[WS] User ${userId} disconnected. Remaining: ${userConnections.get(userId)?.size || 0}`);
      } else {
        console.log("[WS] Unauthenticated connection closed");
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] WebSocket error:", err?.message || err);
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
    if (safeSend(sock, data)) {
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
