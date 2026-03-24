import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

// Configure notification handler - show notifications even when app is in foreground
// Only set on native platforms; expo-notifications APIs may throw on web
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ========== MODULE-LEVEL SINGLETON NAVIGATION GUARD ==========
let _isNavigating = false;
let _lastNavigatedChatId: string | null = null;
let _lastNavigatedTime = 0;

const SAME_CHAT_COOLDOWN_MS = 5000;
const GLOBAL_COOLDOWN_MS = 3000;

const _handledIdentifiers = new Set<string>();

function canNavigate(chatId: string): boolean {
  const now = Date.now();

  if (_isNavigating) {
    console.log("[Push] Navigation lock active, skipping");
    return false;
  }

  if (_lastNavigatedChatId === chatId && now - _lastNavigatedTime < SAME_CHAT_COOLDOWN_MS) {
    console.log(`[Push] Same chat cooldown for ${chatId}, skipping`);
    return false;
  }

  if (now - _lastNavigatedTime < GLOBAL_COOLDOWN_MS) {
    console.log("[Push] Global cooldown active, skipping");
    return false;
  }

  return true;
}

function markNavigated(chatId: string) {
  _isNavigating = true;
  _lastNavigatedChatId = chatId;
  _lastNavigatedTime = Date.now();
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

      // FIX 9: Read projectId from Constants.expoConfig instead of hardcoding
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.expoConfig?.slug;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId as string,
      });

      const token = tokenData.data;
      console.log("[Push] Got token:", token);
      setExpoPushToken(token);

      if (userId) {
        const platform = Platform.OS as "ios" | "android" | "web";
        registerMutation.mutate({ token, platform });
        console.log("[Push] Registered token for userId:", userId);
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
   * ALWAYS uses router.navigate to the tabs first, then replace to chat.
   * This ensures Back button returns to app home, not to a previous chat.
   */
  const handleNotificationTap = useCallback((response: Notifications.NotificationResponse, isColdStart: boolean) => {
    const identifier = response.notification.request.identifier;
    if (_handledIdentifiers.has(identifier)) {
      return;
    }
    _handledIdentifiers.add(identifier);
    if (_handledIdentifiers.size > 100) {
      _handledIdentifiers.clear();
      _handledIdentifiers.add(identifier);
    }

    const data = response.notification.request.content.data;
    if (data?.type !== "chat_message" || !data?.senderId) {
      return;
    }

    const senderId = String(data.senderId);
    const senderName = String(data.senderName || "Friend");
    const chatId = `chat-${senderId}`;

    if (!canNavigate(chatId)) {
      return;
    }

    markNavigated(chatId);

    // Dismiss all notifications to prevent re-tapping
    Notifications.dismissAllNotificationsAsync().catch(() => {});

    const delay = isColdStart ? 1500 : 300;
    setTimeout(() => {
      try {
        // Strategy: First navigate to tabs home to reset the stack,
        // then push the chat screen on top. This way Back goes to home.
        if (isColdStart) {
          // Cold start: app just opened, stack is empty. Replace to chat directly.
          router.replace({
            pathname: "/chat" as any,
            params: { friendId: senderId, friendName: senderName },
          });
        } else {
          // Warm start: app is already open, might have other screens stacked.
          // First dismiss any existing chat screens by going to tabs home,
          // then navigate to the new chat.
          router.dismissAll();
          // Small delay to let dismissAll complete before pushing new screen
          setTimeout(() => {
            router.push({
              pathname: "/chat" as any,
              params: { friendId: senderId, friendName: senderName },
            });
          }, 100);
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
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response, false);
    });

    // Cold start: check if app was opened from a notification — only once ever
    // Note: getLastNotificationResponseAsync is not available on web
    if (!coldStartHandled.current && Platform.OS !== "web") {
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
