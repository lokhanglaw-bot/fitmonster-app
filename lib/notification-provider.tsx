import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuthContext } from "@/lib/auth-context";
import { useWebSocket } from "@/hooks/use-websocket";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useQueryClient } from "@tanstack/react-query";

type NotificationContextType = {
  wsStatus: "connecting" | "connected" | "disconnected";
  wsSend: (msg: any) => boolean;
  wsOn: (type: string, listener: (msg: any) => void) => () => void;
  expoPushToken: string | null;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const userId = user?.id || null;
  const openId = user?.openId || null;
  const queryClient = useQueryClient();

  const { status: wsStatus, send: wsSend, on: wsOn } = useWebSocket(userId, openId);
  const { expoPushToken } = usePushNotifications(userId);

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

    // When a new chat message arrives, refresh unread count
    unsubs.push(wsOn("new_message", () => {
      queryClient.invalidateQueries({ queryKey: [["chat", "unreadCount"]] });
      queryClient.invalidateQueries({ queryKey: [["chat", "conversations"]] });
    }));

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [userId, wsOn, queryClient]);

  const value = useMemo(
    () => ({ wsStatus, wsSend, wsOn, expoPushToken }),
    [wsStatus, wsSend, wsOn, expoPushToken]
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
