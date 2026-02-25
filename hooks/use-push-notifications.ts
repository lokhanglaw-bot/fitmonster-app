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

// ========== MODULE-LEVEL SINGLETON NAVIGATION GUARD ==========
// These are module-level (outside the hook) so they survive re-renders and
// even multiple hook instances. Only ONE navigation can happen at a time.
let _isNavigating = false;
let _lastNavigatedChatId: string | null = null;
let _lastNavigatedTime = 0;

// Minimum 5 seconds between navigations to the same chat
const SAME_CHAT_COOLDOWN_MS = 5000;
// Minimum 3 seconds between any navigation
const GLOBAL_COOLDOWN_MS = 3000;

// Track which notification identifiers have been handled (by request.identifier)
const _handledIdentifiers = new Set<string>();

function canNavigate(chatId: string): boolean {
  const now = Date.now();

  // Global cooldown
  if (_isNavigating) {
    console.log("[Push] Global navigation lock active, skipping");
    return false;
  }

  // Same chat cooldown
  if (_lastNavigatedChatId === chatId && now - _lastNavigatedTime < SAME_CHAT_COOLDOWN_MS) {
    console.log(`[Push] Same chat cooldown active for ${chatId}, skipping`);
    return false;
  }

  // Global time cooldown
  if (now - _lastNavigatedTime < GLOBAL_COOLDOWN_MS) {
    console.log("[Push] Global time cooldown active, skipping");
    return false;
  }

  return true;
}

function markNavigated(chatId: string) {
  _isNavigating = true;
  _lastNavigatedChatId = chatId;
  _lastNavigatedTime = Date.now();
  // Release the lock after cooldown
  setTimeout(() => { _isNavigating = false; }, GLOBAL_COOLDOWN_MS);
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

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined,
      });

      const token = tokenData.data;
      console.log("[Push] Got token:", token);
      setExpoPushToken(token);

      if (userId) {
        const platform = Platform.OS as "ios" | "android" | "web";
        registerMutation.mutate({ token, platform });
        console.log("[Push] Registered token with server for userId:", userId);
      }

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
   * Uses multiple layers of protection against duplicate navigation:
   * 1. Notification identifier dedup (same notification can't trigger twice)
   * 2. Global navigation lock (only one navigation at a time)
   * 3. Same-chat cooldown (5s between navigations to same chat)
   * 4. Global time cooldown (3s between any navigations)
   */
  const handleNotificationTap = useCallback((response: Notifications.NotificationResponse, isColdStart: boolean) => {
    // Layer 1: Notification identifier dedup
    const identifier = response.notification.request.identifier;
    if (_handledIdentifiers.has(identifier)) {
      console.log(`[Push] Notification ${identifier} already handled, skipping`);
      return;
    }
    _handledIdentifiers.add(identifier);
    // Clean up old identifiers (keep set small)
    if (_handledIdentifiers.size > 100) {
      _handledIdentifiers.clear();
      _handledIdentifiers.add(identifier);
    }

    const data = response.notification.request.content.data;
    console.log("[Push] Notification tapped, data:", JSON.stringify(data), "coldStart:", isColdStart);

    if (data?.type !== "chat_message" || !data?.senderId) {
      console.log("[Push] Not a chat notification, ignoring");
      return;
    }

    const senderId = String(data.senderId);
    const senderName = String(data.senderName || "Friend");
    const chatId = `chat-${senderId}`;

    // Layer 2-4: Navigation guards
    if (!canNavigate(chatId)) {
      return;
    }

    markNavigated(chatId);

    // Dismiss all notifications to prevent re-tapping
    Notifications.dismissAllNotificationsAsync().catch(() => {});

    const delay = isColdStart ? 1500 : 300;
    setTimeout(() => {
      try {
        console.log(`[Push] Executing navigation to chat - senderId: ${senderId}, name: ${senderName}, coldStart: ${isColdStart}`);
        if (isColdStart) {
          router.replace({
            pathname: "/chat" as any,
            params: { friendId: senderId, friendName: senderName },
          });
        } else {
          router.push({
            pathname: "/chat" as any,
            params: { friendId: senderId, friendName: senderName },
          });
        }
      } catch (err) {
        console.error("[Push] Navigation failed:", err);
      }
    }, delay);
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    registerForPushNotifications();

    // Clean up existing listeners before adding new ones
    if (notificationListener.current) {
      notificationListener.current.remove();
      notificationListener.current = null;
    }
    if (responseListener.current) {
      responseListener.current.remove();
      responseListener.current = null;
    }

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
      setNotification(notif);
      console.log("[Push] Notification received in foreground:", notif.request.content.title);
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response, false);
    });

    // Cold start: check if app was opened from a notification — only once ever
    if (!coldStartHandled.current) {
      coldStartHandled.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          console.log("[Push] App opened from notification (cold start)");
          handleNotificationTap(response, true);
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
  }, [userId, registerForPushNotifications, handleNotificationTap]);

  return {
    expoPushToken,
    notification,
  };
}
