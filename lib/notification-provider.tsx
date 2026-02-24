import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { Platform, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuthContext } from "@/lib/auth-context";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

type NotificationContextType = {
  expoPushToken: string | null;
  updateBadgeCount: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const userId = user?.id || null;
  const queryClient = useQueryClient();

  const { expoPushToken } = usePushNotifications(userId);

  // Fetch unread count for badge updates (poll every 15 seconds)
  const unreadQuery = trpc.chat.unreadCount.useQuery(undefined, {
    enabled: !!userId,
    refetchInterval: 15000,
    retry: 1,
  });

  // Update app badge count based on unread messages
  const updateBadgeCount = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const count = unreadQuery.data?.count || 0;
      await Notifications.setBadgeCountAsync(count);
    } catch (_err) {
      // Silently ignore badge errors
    }
  }, [unreadQuery.data?.count]);

  // Update badge whenever unread count changes
  useEffect(() => {
    if (unreadQuery.data !== undefined) {
      updateBadgeCount();
    }
  }, [unreadQuery.data, updateBadgeCount]);

  // Update badge and refresh queries when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && userId) {
        unreadQuery.refetch();
        // Also refresh conversations and friend lists
        queryClient.invalidateQueries({ queryKey: [["chat", "conversations"]] });
        queryClient.invalidateQueries({ queryKey: [["friends", "pendingRequests"]] });
        queryClient.invalidateQueries({ queryKey: [["friends", "list"]] });
      }
    });
    return () => subscription.remove();
  }, [unreadQuery, userId, queryClient]);

  const value = useMemo(
    () => ({ expoPushToken, updateBadgeCount }),
    [expoPushToken, updateBadgeCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
