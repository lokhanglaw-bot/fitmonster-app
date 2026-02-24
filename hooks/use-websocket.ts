import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, AppState } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

type WSMessage = {
  type: string;
  [key: string]: any;
};

type WSStatus = "connecting" | "connected" | "disconnected";

/**
 * WebSocket hook with:
 * - Fallback auth (userId + openId)
 * - Auto-reconnect on disconnect (3s backoff)
 * - Ping/pong keepalive (25s)
 * - Blob/ArrayBuffer data handling for React Native
 * - Stable refs to prevent circular useCallback dependencies
 */
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

  // Store userId and openId in refs so connect() doesn't need them as deps
  const userIdRef = useRef(userId);
  const openIdRef = useRef(openId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { openIdRef.current = openId; }, [openId]);

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
    console.log("[WS] Status changed to:", status);
  }, [status]);

  const getWsUrl = useCallback(() => {
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      console.log("[WS] No API base URL available");
      return null;
    }
    const wsBase = apiBase.replace(/^http/, "ws");
    return `${wsBase}/ws`;
  }, []);

  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Dispatch message to registered listeners
  const dispatchMessage = useCallback((msg: WSMessage) => {
    setLastMessage(msg);

    const typeListeners = listenersRef.current.get(msg.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => {
        try { listener(msg); } catch (e) {
          console.error("[WS] Listener error for type", msg.type, ":", e);
        }
      });
    }
    const wildcardListeners = listenersRef.current.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try { listener(msg); } catch (e) {
          console.error("[WS] Wildcard listener error:", e);
        }
      });
    }
  }, []);

  // Schedule auto-reconnect
  const scheduleReconnect = useCallback(() => {
    if (authFailCountRef.current >= maxAuthRetries) {
      console.log("[WS] Not reconnecting due to repeated auth failures");
      return;
    }
    const delay = Math.min(3000 * Math.pow(1.5, Math.min(reconnectAttemptsRef.current, 5)), 15000);
    reconnectAttemptsRef.current++;
    console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current})`);
    clearReconnectTimeout();
    reconnectTimeoutRef.current = setTimeout(() => {
      if (userIdRef.current) connectRef.current();
    }, delay);
  }, [clearReconnectTimeout]);

  // Use a ref for connect so it can be called without circular deps
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    const currentUserId = userIdRef.current;
    const currentOpenId = openIdRef.current;

    if (!currentUserId) {
      console.log("[WS] No userId, skipping connect");
      return;
    }
    if (isConnectingRef.current) {
      console.log("[WS] Already connecting, skipping");
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN && statusRef.current === "connected") {
      console.log("[WS] Already connected, skipping reconnect");
      return;
    }
    if (authFailCountRef.current >= maxAuthRetries) {
      console.log("[WS] Auth failed too many times, resetting counter for retry");
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
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    clearPingInterval();
    clearReconnectTimeout();

    isConnectingRef.current = true;
    setStatus("connecting");

    try {
      console.log("[WS] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Connection timeout
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log("[WS] Connection timeout (10s), closing...");
          isConnectingRef.current = false;
          try {
            ws.onopen = null;
            ws.onmessage = null;
            ws.onclose = null;
            ws.onerror = null;
            ws.close();
          } catch {}
          scheduleReconnect();
        }
      }, 10000);

      ws.onopen = async () => {
        clearTimeout(connectTimeout);
        console.log("[WS] 🟢 TCP CONNECTED! readyState:", ws.readyState, "Sending auth...");
        isConnectingRef.current = false;

        let token: string | null = null;
        try {
          token = await Auth.getSessionToken();
        } catch (e) {
          console.log("[WS] Failed to get session token:", e);
        }

        console.log("[WS] Sending auth - token:", !!token, "userId:", currentUserId, "platform:", Platform.OS);

        try {
          ws.send(JSON.stringify({
            type: "auth",
            token: token || undefined,
            userId: currentUserId,
            openId: currentOpenId || undefined,
          }));
          console.log("[WS] Auth message sent");
        } catch (e) {
          console.error("[WS] Failed to send auth message:", e);
        }
      };

      ws.onmessage = async (event: MessageEvent) => {
        try {
          // Parse the incoming data - handle string, Blob, ArrayBuffer
          let text: string;
          const rawData = event.data;
          console.log("[WS] 📩 onmessage fired! data type:", typeof rawData, "constructor:", rawData?.constructor?.name, "length:", typeof rawData === 'string' ? rawData.length : 'N/A');

          if (typeof rawData === "string") {
            text = rawData;
          } else if (rawData instanceof ArrayBuffer) {
            text = new TextDecoder().decode(rawData);
            console.log("[WS] Decoded ArrayBuffer:", text.substring(0, 80));
          } else if (typeof Blob !== "undefined" && rawData instanceof Blob) {
            text = await rawData.text();
            console.log("[WS] Decoded Blob:", text.substring(0, 80));
          } else {
            // Fallback: try toString (works for Buffer in some environments)
            text = String(rawData);
            console.log("[WS] Fallback toString, type:", typeof rawData, "constructor:", rawData?.constructor?.name);
          }

          const msg = JSON.parse(text) as WSMessage;

          // Handle auth_success — FORCE status to connected
          if (msg.type === "auth_success") {
            console.log("[WS] ✅✅✅ AUTH SUCCESS RECEIVED! userId:", msg.userId, "— FORCING status to connected");
            console.log("[WS] Current statusRef before update:", statusRef.current);
            setStatus("connected");
            // Double-ensure: schedule another setStatus in case React batches it away
            setTimeout(() => {
              if (statusRef.current !== "connected") {
                console.log("[WS] ⚠️ Status still not connected after 100ms, forcing again");
                setStatus("connected");
              } else {
                console.log("[WS] ✅ Status confirmed as connected after 100ms");
              }
            }, 100);
            reconnectAttemptsRef.current = 0;
            authFailCountRef.current = 0;

            // Start ping keepalive
            clearPingInterval();
            pingIntervalRef.current = setInterval(() => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(JSON.stringify({ type: "ping" }));
                } catch {
                  console.log("[WS] Ping send failed");
                }
              }
            }, 25000);

            // Dispatch to listeners too (so chat.tsx can react)
            dispatchMessage(msg);
            return;
          }

          // Handle auth_error
          if (msg.type === "auth_error") {
            console.error("[WS] ❌ Auth error:", msg.message);
            authFailCountRef.current++;
            setStatus("disconnected");
            if (authFailCountRef.current < maxAuthRetries) {
              const delay = Math.min(2000 * Math.pow(2, authFailCountRef.current), 30000);
              console.log(`[WS] Will retry auth in ${delay}ms (attempt ${authFailCountRef.current}/${maxAuthRetries})`);
              clearReconnectTimeout();
              reconnectTimeoutRef.current = setTimeout(() => {
                if (userIdRef.current) connectRef.current();
              }, delay);
            }
            return;
          }

          // Handle pong (keepalive response)
          if (msg.type === "pong") {
            return;
          }

          if (msg.type === "unread_count") {
            console.log("[WS] Unread count:", msg.count);
          }

          // Dispatch all other messages to listeners
          dispatchMessage(msg);
        } catch (err) {
          console.error("[WS] onmessage parse error:", err, "raw type:", typeof event.data);
        }
      };

      ws.onclose = (event: CloseEvent) => {
        clearTimeout(connectTimeout);
        console.log("[WS] 🔴 DISCONNECTED! code:", event?.code, "reason:", event?.reason, "wasClean:", event?.wasClean);
        setStatus("disconnected");
        wsRef.current = null;
        isConnectingRef.current = false;
        clearPingInterval();
        scheduleReconnect();
      };

      ws.onerror = (error: Event) => {
        console.error("[WS] Error event:", (error as any)?.message || "unknown");
        isConnectingRef.current = false;
      };
    } catch (err) {
      console.error("[WS] Connection creation failed:", err);
      setStatus("disconnected");
      isConnectingRef.current = false;
      scheduleReconnect();
    }
  }, [getWsUrl, clearPingInterval, clearReconnectTimeout, scheduleReconnect, dispatchMessage]);

  // Keep connectRef in sync
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    clearPingInterval();
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    isConnectingRef.current = false;
    setStatus("disconnected");
  }, [clearPingInterval, clearReconnectTimeout]);

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
    console.log("[WS] Cannot send — readyState:", wsRef.current?.readyState, "status:", statusRef.current);
    return false;
  }, []);

  const on = useCallback((type: string, listener: (msg: WSMessage) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(listener);
    return () => {
      listenersRef.current.get(type)?.delete(listener);
    };
  }, []);

  // Connect when userId is available
  useEffect(() => {
    if (userId) {
      console.log("[WS] userId available:", userId, "— initiating connection");
      authFailCountRef.current = 0;
      reconnectAttemptsRef.current = 0;
      connect();
    }
    return () => {
      disconnect();
    };
    // Only re-run when userId changes, NOT when connect/disconnect change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reconnect on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && userIdRef.current) {
        if (statusRef.current !== "connected") {
          console.log("[WS] App foregrounded, reconnecting...");
          authFailCountRef.current = 0;
          reconnectAttemptsRef.current = 0;
          connectRef.current();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  return {
    status,
    lastMessage,
    send,
    on,
    connect,
    disconnect,
  };
}
