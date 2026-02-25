import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

// Configure notification handler - show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ========== MODULE-LEVEL DEDUP + DEBOUNCE ==========
// Prevents duplicate navigation from multiple notification taps.
// These are module-level so they persist across hook re-renders.
let isNavigating = false;
const handledNotificationIds = new Set<string>();
const NAVIGATION_COOLDOWN_MS = 2000;
const HANDLED_ID_TTL_MS = 10_000;

function getNotificationId(response: Notifications.NotificationResponse): string {
  const data = response.notification.request.content.data;
  // Use messageId if available, otherwise fall back to notification identifier
  if (data?.messageId) return `msg-${data.messageId}`;
  return response.notification.request.identifier;
}

function cleanupHandledIds() {
  // Simple cleanup: if set gets too large, clear it
  if (handledNotificationIds.size > 50) {
    handledNotificationIds.clear();
  }
}

export function usePushNotifications(userId: number | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const coldStartHandled = useRef(false);
  const router = useRouter();

  const registerMutation = trpc.pushToken.register.useMutation();

  const registerForPushNotifications = useCallback(async () => {
    if (Platform.OS === "web") return null;

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[Push] Permission not granted");
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined, // Uses default from app.config
      });

      const token = tokenData.data;
      console.log("[Push] Got token:", token);
      setExpoPushToken(token);

      // Register token with server
      if (userId) {
        const platform = Platform.OS as "ios" | "android" | "web";
        registerMutation.mutate({ token, platform });
        console.log("[Push] Registered token with server for userId:", userId);
      }

      // Android: set notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      return token;
    } catch (error) {
      console.error("[Push] Registration failed:", error);
      return null;
    }
  }, [userId, registerMutation]);

  /**
   * Navigate to chat screen from a notification tap.
   * Uses debounce + dedup to prevent multiple navigations.
   * Uses replace for cold start to ensure proper navigation stack.
   */
  const navigateToChat = useCallback((senderId: string, senderName: string, isColdStart: boolean) => {
    // Debounce: prevent rapid-fire navigation
    if (isNavigating) {
      console.log("[Push] Navigation already in progress, skipping");
      return;
    }

    isNavigating = true;
    setTimeout(() => { isNavigating = false; }, NAVIGATION_COOLDOWN_MS);

    console.log(`[Push] Navigating to chat - senderId: ${senderId}, name: ${senderName}, coldStart: ${isColdStart}`);

    try {
      if (isColdStart) {
        // Cold start: use replace to build proper stack
        // First ensure we're on the main tab, then push chat
        router.replace({
          pathname: "/chat" as any,
          params: { friendId: senderId, friendName: senderName },
        });
      } else {
        // Warm start: push on top of existing stack
        router.push({
          pathname: "/chat" as any,
          params: { friendId: senderId, friendName: senderName },
        });
      }
    } catch (err) {
      console.error("[Push] Navigation failed:", err);
      isNavigating = false;
    }
  }, [router]);

  /**
   * Handle a notification response (tap).
   * Includes dedup by notification/message ID.
   */
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse, isColdStart: boolean) => {
    const notifId = getNotificationId(response);

    // Dedup: skip if already handled
    if (handledNotificationIds.has(notifId)) {
      console.log(`[Push] Already handled notification ${notifId}, skipping`);
      return;
    }
    handledNotificationIds.add(notifId);
    cleanupHandledIds();

    // Auto-expire the handled ID after TTL
    setTimeout(() => { handledNotificationIds.delete(notifId); }, HANDLED_ID_TTL_MS);

    const data = response.notification.request.content.data;
    console.log("[Push] Notification tapped, data:", JSON.stringify(data));

    if (data?.type === "chat_message" && data?.senderId) {
      const senderId = String(data.senderId);
      const senderName = String(data.senderName || "Friend");

      // Delay to ensure app is ready
      const delay = isColdStart ? 1500 : 500;
      setTimeout(() => {
        navigateToChat(senderId, senderName, isColdStart);
      }, delay);
    }
  }, [navigateToChat]);

  useEffect(() => {
    if (!userId) return;

    // Register for push notifications
    registerForPushNotifications();

    // Clean up existing listeners before adding new ones (prevent duplicate registration)
    if (notificationListener.current) {
      notificationListener.current.remove();
      notificationListener.current = null;
    }
    if (responseListener.current) {
      responseListener.current.remove();
      responseListener.current = null;
    }

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      console.log("[Push] Notification received in foreground:", notification.request.content.title);
    });

    // Listen for notification taps — navigate to the correct screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, false);
    });

    // Check if app was opened from a notification (cold start) — only once
    if (!coldStartHandled.current) {
      coldStartHandled.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          console.log("[Push] App opened from notification (cold start)");
          handleNotificationResponse(response, true);
        }
      });
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
    };
  }, [userId, registerForPushNotifications, handleNotificationResponse]);

  return {
    expoPushToken,
    notification,
  };
}
