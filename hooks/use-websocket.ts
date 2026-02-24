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
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<WSStatus>("disconnected");

  // Keep statusRef in sync so callbacks always see latest value
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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

  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
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
    // If already connected, skip
    if (wsRef.current?.readyState === WebSocket.OPEN && statusRef.current === "connected") {
      console.log("[WS] Already connected, skipping reconnect");
      return;
    }
    // Don't reconnect if auth has permanently failed too many times
    if (authFailCountRef.current >= maxAuthRetries) {
      console.log("[WS] Auth failed too many times, resetting counter for retry");
      // Reset so manual reconnect can work
      authFailCountRef.current = 0;
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
    clearPingInterval();

    isConnectingRef.current = true;
    setStatus("connecting");

    try {
      console.log("[WS] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Connection timeout: if not open within 10 seconds, close and retry
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log("[WS] Connection timeout, closing...");
          isConnectingRef.current = false;
          try { ws.close(); } catch {}
        }
      }, 10000);

      ws.onopen = async () => {
        clearTimeout(connectTimeout);
        console.log("[WS] TCP connected, sending auth...");
        isConnectingRef.current = false;

        // Authenticate - always send both token and userId
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
            authFailCountRef.current = 0;

            // Start ping/keepalive every 25 seconds
            clearPingInterval();
            pingIntervalRef.current = setInterval(() => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(JSON.stringify({ type: "ping" }));
                } catch {
                  console.log("[WS] Ping failed, connection may be dead");
                }
              }
            }, 25000);
          } else if (msg.type === "auth_error") {
            console.error("[WS] Auth error:", msg.message);
            authFailCountRef.current++;
            setStatus("disconnected");
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
          } else if (msg.type === "pong") {
            // Keepalive response, ignore
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
        clearTimeout(connectTimeout);
        console.log("[WS] Disconnected, code:", event?.code, "reason:", event?.reason);
        setStatus("disconnected");
        wsRef.current = null;
        isConnectingRef.current = false;
        clearPingInterval();

        // Don't auto-reconnect if auth failed too many times
        if (authFailCountRef.current >= maxAuthRetries) {
          console.log("[WS] Not reconnecting due to repeated auth failures");
          return;
        }

        // Auto-reconnect with fixed 3 second delay (capped backoff)
        const delay = Math.min(3000 * Math.pow(1.5, Math.min(reconnectAttemptsRef.current, 5)), 15000);
        reconnectAttemptsRef.current++;
        console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current})`);
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
      const delay = Math.min(3000 * Math.pow(1.5, Math.min(reconnectAttemptsRef.current, 5)), 15000);
      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (userId) connect();
      }, delay);
    }
  }, [userId, openId, getWsUrl, clearPingInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    clearPingInterval();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    isConnectingRef.current = false;
    setStatus("disconnected");
  }, [clearPingInterval]);

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
    console.log("[WS] Cannot send, WebSocket not open. readyState:", wsRef.current?.readyState, "status:", statusRef.current);
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
      if (state === "active" && userId) {
        // Always try to reconnect when app comes to foreground
        if (statusRef.current !== "connected") {
          console.log("[WS] App foregrounded, reconnecting...");
          authFailCountRef.current = 0;
          reconnectAttemptsRef.current = 0;
          connect();
        }
      }
    });
    return () => subscription.remove();
  }, [userId, connect]);

  return {
    status,
    lastMessage,
    send,
    on,
    connect,
    disconnect,
  };
}
