import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, AppState } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

type WSMessage = {
  type: string;
  [key: string]: any;
};

type WSStatus = "connecting" | "connected" | "disconnected";

export function useWebSocket(userId: number | null, openId?: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const authFailCountRef = useRef(0);
  const maxAuthRetries = 5;
  const listenersRef = useRef<Map<string, Set<(msg: WSMessage) => void>>>(new Map());
  const isConnectingRef = useRef(false);

  const getWsUrl = useCallback(() => {
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      console.log("[WS] No API base URL available");
      return null;
    }
    // Convert http(s) to ws(s)
    const wsBase = apiBase.replace(/^http/, "ws");
    return `${wsBase}/ws`;
  }, []);

  const connect = useCallback(async () => {
    if (!userId) {
      console.log("[WS] No userId, skipping connect");
      return;
    }
    // Prevent concurrent connection attempts
    if (isConnectingRef.current) {
      console.log("[WS] Already connecting, skipping");
      return;
    }
    // Don't reconnect if auth has permanently failed too many times
    if (authFailCountRef.current >= maxAuthRetries) {
      console.log("[WS] Auth failed too many times, not reconnecting");
      return;
    }

    const wsUrl = getWsUrl();
    if (!wsUrl) {
      console.log("[WS] No WS URL, cannot connect");
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    isConnectingRef.current = true;
    setStatus("connecting");

    try {
      console.log("[WS] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("[WS] TCP connected, sending auth...");
        isConnectingRef.current = false;

        // Authenticate - always send both token and userId
        // Server will try token first, then fallback to userId
        let token: string | null = null;
        try {
          token = await Auth.getSessionToken();
        } catch (e) {
          console.log("[WS] Failed to get session token:", e);
        }
        
        console.log("[WS] Sending auth - token present:", !!token, "userId:", userId, "platform:", Platform.OS);
        
        try {
          ws.send(JSON.stringify({
            type: "auth",
            token: token || undefined,
            userId: userId,
            openId: openId || undefined,
          }));
        } catch (e) {
          console.error("[WS] Failed to send auth message:", e);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;

          // Handle auth responses
          if (msg.type === "auth_success") {
            console.log("[WS] Auth success, userId:", msg.userId);
            setStatus("connected");
            reconnectAttemptsRef.current = 0;
            authFailCountRef.current = 0; // Reset auth fail count on success
          } else if (msg.type === "auth_error") {
            console.error("[WS] Auth error:", msg.message);
            authFailCountRef.current++;
            setStatus("disconnected");
            // Allow reconnect with backoff (don't permanently give up)
            if (authFailCountRef.current < maxAuthRetries) {
              const delay = Math.min(2000 * Math.pow(2, authFailCountRef.current), 30000);
              console.log(`[WS] Will retry auth in ${delay}ms (attempt ${authFailCountRef.current}/${maxAuthRetries})`);
              reconnectTimeoutRef.current = setTimeout(() => {
                if (userId) connect();
              }, delay);
            } else {
              console.log("[WS] Max auth retries reached, giving up");
            }
            return;
          }

          setLastMessage(msg);

          // Dispatch to listeners
          const typeListeners = listenersRef.current.get(msg.type);
          if (typeListeners) {
            typeListeners.forEach((listener) => listener(msg));
          }
          // Also dispatch to wildcard listeners
          const wildcardListeners = listenersRef.current.get("*");
          if (wildcardListeners) {
            wildcardListeners.forEach((listener) => listener(msg));
          }
        } catch (err) {
          console.error("[WS] Failed to parse message:", err);
        }
      };

      ws.onclose = (event) => {
        console.log("[WS] Disconnected, code:", event?.code, "reason:", event?.reason);
        setStatus("disconnected");
        wsRef.current = null;
        isConnectingRef.current = false;

        // Don't auto-reconnect if auth failed too many times
        if (authFailCountRef.current >= maxAuthRetries) {
          console.log("[WS] Not reconnecting due to repeated auth failures");
          return;
        }

        // Auto-reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (userId) connect();
        }, delay);
      };

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        isConnectingRef.current = false;
      };
    } catch (err) {
      console.error("[WS] Connection failed:", err);
      setStatus("disconnected");
      isConnectingRef.current = false;
      
      // Retry on connection failure
      const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (userId) connect();
      }, delay);
    }
  }, [userId, openId, getWsUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    isConnectingRef.current = false;
    setStatus("disconnected");
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
        return true;
      } catch (e) {
        console.error("[WS] Send failed:", e);
        return false;
      }
    }
    console.log("[WS] Cannot send, WebSocket not open. Status:", wsRef.current?.readyState);
    return false;
  }, []);

  const on = useCallback((type: string, listener: (msg: WSMessage) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      listenersRef.current.get(type)?.delete(listener);
    };
  }, []);

  // Connect when userId is available
  useEffect(() => {
    if (userId) {
      // Reset auth failure count when userId changes (e.g., re-login)
      authFailCountRef.current = 0;
      reconnectAttemptsRef.current = 0;
      connect();
    }
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // Reconnect on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && userId && status === "disconnected") {
        // Reset counters on app foreground (user may have re-logged in)
        authFailCountRef.current = 0;
        reconnectAttemptsRef.current = 0;
        connect();
      }
    });
    return () => subscription.remove();
  }, [userId, status, connect]);

  return {
    status,
    lastMessage,
    send,
    on,
    connect,
    disconnect,
  };
}
