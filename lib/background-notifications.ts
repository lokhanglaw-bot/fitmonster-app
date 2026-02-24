import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION";

/**
 * Define the background notification task at module level (global scope).
 * This task runs when a push notification is received while the app is in the
 * background or terminated. It updates the app badge count.
 */
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[BackgroundNotification] Task error:", error);
    return;
  }

  if (data) {
    console.log("[BackgroundNotification] Received background notification:", JSON.stringify(data));

    // Update badge count by fetching from server
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "";
      if (apiUrl) {
        const response = await fetch(`${apiUrl}/api/trpc/chat.unreadCount?batch=1&input=%7B%220%22%3A%7B%7D%7D`, {
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const result = await response.json();
          const count = result?.[0]?.result?.data?.count || 0;
          await Notifications.setBadgeCountAsync(count);
          console.log("[BackgroundNotification] Updated badge to:", count);
        }
      }
    } catch (err) {
      console.warn("[BackgroundNotification] Failed to update badge:", err);
    }
  }
});

/**
 * Register the background notification task.
 * Should be called once when the app starts.
 */
export async function registerBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (!isRegistered) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log("[BackgroundNotification] Task registered successfully");
    } else {
      console.log("[BackgroundNotification] Task already registered");
    }
  } catch (err) {
    console.warn("[BackgroundNotification] Failed to register task:", err);
  }
}

/**
 * Unregister the background notification task.
 */
export async function unregisterBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) {
      await Notifications.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log("[BackgroundNotification] Task unregistered");
    }
  } catch (err) {
    console.warn("[BackgroundNotification] Failed to unregister task:", err);
  }
}
