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

export function usePushNotifications(userId: number | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
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

  useEffect(() => {
    if (!userId) return;

    // Register for push notifications
    registerForPushNotifications();

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      console.log("[Push] Notification received in foreground:", notification.request.content.title);
    });

    // Listen for notification taps — navigate to the correct screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log("[Push] Notification tapped, data:", JSON.stringify(data));

      if (data?.type === "chat_message" && data?.senderId) {
        // Navigate to chat screen with the sender
        const senderId = String(data.senderId);
        const senderName = String(data.senderName || "Friend");
        console.log("[Push] Navigating to chat with senderId:", senderId, "name:", senderName);
        
        // Use setTimeout to ensure navigation happens after app is fully loaded
        setTimeout(() => {
          try {
            router.push({
              pathname: "/chat" as any,
              params: { friendId: senderId, friendName: senderName },
            });
          } catch (err) {
            console.error("[Push] Navigation failed:", err);
          }
        }, 500);
      }
    });

    // Check if app was opened from a notification (cold start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        console.log("[Push] App opened from notification (cold start), data:", JSON.stringify(data));
        
        if (data?.type === "chat_message" && data?.senderId) {
          const senderId = String(data.senderId);
          const senderName = String(data.senderName || "Friend");
          // Delay navigation for cold start to ensure app is fully loaded
          setTimeout(() => {
            try {
              router.push({
                pathname: "/chat" as any,
                params: { friendId: senderId, friendName: senderName },
              });
            } catch (err) {
              console.error("[Push] Cold start navigation failed:", err);
            }
          }, 1500);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId, registerForPushNotifications, router]);

  return {
    expoPushToken,
    notification,
  };
}
