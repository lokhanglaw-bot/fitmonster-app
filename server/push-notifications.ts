import * as chatDb from "./chat-db";

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
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
 */
export async function sendChatPushNotification(
  senderId: number,
  receiverId: number,
  senderName: string,
  messagePreview: string
): Promise<boolean> {
  return sendPushNotification(receiverId, {
    title: `💬 ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.substring(0, 100) + "..." : messagePreview,
    data: {
      type: "chat_message",
      senderId,
      senderName,
    },
  });
}
