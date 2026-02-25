import * as chatDb from "./chat-db";

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// ========== DEDUPLICATION CACHE ==========
// Prevents the same message from triggering multiple push notifications.
// Key: messageId, Value: timestamp when it was sent.
// Entries expire after 60 seconds to avoid unbounded memory growth.
const recentPushes = new Map<number, number>();
const DEDUP_TTL_MS = 60_000; // 60 seconds

function cleanupDedup() {
  const now = Date.now();
  for (const [id, ts] of recentPushes) {
    if (now - ts > DEDUP_TTL_MS) {
      recentPushes.delete(id);
    }
  }
}

// Run cleanup every 30 seconds
setInterval(cleanupDedup, 30_000);

/**
 * Check if a push for this messageId was already sent recently.
 * Returns true if it's a duplicate (should skip).
 */
function isDuplicate(messageId: number): boolean {
  if (recentPushes.has(messageId)) {
    console.log(`[Push] Skipping duplicate push for messageId ${messageId}`);
    return true;
  }
  recentPushes.set(messageId, Date.now());
  return false;
}

/**
 * Send push notification to a user via Expo Push Notification Service.
 * This uses the Expo Push API which works with Expo Go and standalone builds.
 */
export async function sendPushNotification(
  userId: number,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const tokens = await chatDb.getUserPushTokens(userId);
    if (tokens.length === 0) {
      console.log(`[Push] No push tokens for user ${userId}, skipping`);
      return false;
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default" as const,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

    // Use Expo Push API
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log(`[Push] Sent ${messages.length} notifications to user ${userId}:`, result);

    // Handle ticket errors (invalid tokens)
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.status === "error") {
          console.warn(`[Push] Error for token ${tokens[i]}:`, ticket.message);
          // Remove invalid tokens
          if (ticket.details?.error === "DeviceNotRegistered") {
            await chatDb.removePushToken(tokens[i]);
            console.log(`[Push] Removed invalid token: ${tokens[i]}`);
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`[Push] Failed to send notification to user ${userId}:`, error);
    return false;
  }
}

/**
 * Send push notification for a new chat message.
 * Includes deduplication: the same messageId will only trigger one push.
 */
export async function sendChatPushNotification(
  senderId: number,
  receiverId: number,
  senderName: string,
  messagePreview: string,
  messageId?: number
): Promise<boolean> {
  // Fetch tokens early for debug logging
  const expoPushTokens = await chatDb.getUserPushTokens(receiverId);
  console.log(`[PUSH DEBUG] ${new Date().toISOString()} | messageId=${messageId || 'no-id'} | recipientUserId=${receiverId} | senderId=${senderId} | senderName=${senderName} | tokensCount=${expoPushTokens?.length || 0} | tokens=${expoPushTokens?.join(',') || 'none'} | dedupCacheSize=${recentPushes.size} | alreadyInCache=${messageId ? recentPushes.has(messageId) : 'no-id'}`);

  // Dedup check: skip if this messageId was already pushed
  if (messageId && isDuplicate(messageId)) {
    console.log(`[PUSH DEBUG] SKIPPED (duplicate) messageId=${messageId}`);
    return false;
  }

  console.log(`[PUSH DEBUG] SENDING push for messageId=${messageId || 'no-id'} to ${expoPushTokens?.length || 0} tokens`);

  return sendPushNotification(receiverId, {
    title: `💬 ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.substring(0, 100) + "..." : messagePreview,
    data: {
      type: "chat_message",
      senderId,
      senderName,
      messageId: messageId || 0,
    },
  });
}
