import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { Platform, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuthContext } from "@/lib/auth-context";
import { useWebSocket } from "@/hooks/use-websocket";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

type NotificationContextType = {
  wsStatus: "connecting" | "connected" | "disconnected";
  wsSend: (msg: any) => boolean;
  wsOn: (type: string, listener: (msg: any) => void) => () => void;
  wsReconnect: () => void;
  expoPushToken: string | null;
  updateBadgeCount: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const userId = user?.id || null;
  const openId = user?.openId || null;
  const queryClient = useQueryClient();

  const { status: wsStatus, send: wsSend, on: wsOn, connect: wsReconnect } = useWebSocket(userId, openId);
  const { expoPushToken } = usePushNotifications(userId);

  // Fetch unread count for badge updates
  const unreadQuery = trpc.chat.unreadCount.useQuery(undefined, {
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });

  // Update app badge count based on unread messages
  const updateBadgeCount = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const count = unreadQuery.data?.count || 0;
      await Notifications.setBadgeCountAsync(count);
      console.log("[Badge] Updated badge count to:", count);
    } catch (err) {
      console.error("[Badge] Failed to update badge:", err);
    }
  }, [unreadQuery.data?.count]);

  // Update badge whenever unread count changes
  useEffect(() => {
    if (unreadQuery.data !== undefined) {
      updateBadgeCount();
    }
  }, [unreadQuery.data, updateBadgeCount]);

  // Update badge when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        unreadQuery.refetch();
      }
    });
    return () => subscription.remove();
  }, [unreadQuery]);

  // Listen for real-time events and invalidate relevant queries
  useEffect(() => {
    if (!userId) return;

    const unsubs: Array<() => void> = [];

    // When a friend request is received, refresh pending requests
    unsubs.push(wsOn("friend_request", () => {
      queryClient.invalidateQueries({ queryKey: [["friends", "pendingRequests"]] });
    }));

    // When a friend request is accepted, refresh friends list
    unsubs.push(wsOn("friend_accepted", () => {
      queryClient.invalidateQueries({ queryKey: [["friends", "list"]] });
      queryClient.invalidateQueries({ queryKey: [["friends", "sentRequests"]] });
    }));

    // When a new chat message arrives, refresh unread count and badge
    unsubs.push(wsOn("new_message", () => {
      queryClient.invalidateQueries({ queryKey: [["chat", "unreadCount"]] });
      queryClient.invalidateQueries({ queryKey: [["chat", "conversations"]] });
      // Immediately refetch to update badge
      unreadQuery.refetch();
    }));

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [userId, wsOn, queryClient, unreadQuery]);

  const value = useMemo(
    () => ({ wsStatus, wsSend, wsOn, wsReconnect, expoPushToken, updateBadgeCount }),
    [wsStatus, wsSend, wsOn, wsReconnect, expoPushToken, updateBadgeCount]
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
