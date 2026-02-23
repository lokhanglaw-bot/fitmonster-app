import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, AppState } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

type WSMessage = {
  type: string;
  [key: string]: any;
};

type WSStatus = "connecting" | "connected" | "disconnected";

export function useWebSocket(userId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const listenersRef = useRef<Map<string, Set<(msg: WSMessage) => void>>>(new Map());

  const getWsUrl = useCallback(() => {
    const apiBase = getApiBaseUrl();
    if (!apiBase) return null;
    // Convert http(s) to ws(s)
    const wsBase = apiBase.replace(/^http/, "ws");
    return `${wsBase}/ws`;
  }, []);

  const connect = useCallback(async () => {
    if (!userId) return;
    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("[WS] Connected");
        setStatus("connected");
        reconnectAttemptsRef.current = 0;

        // Authenticate
        const token = await Auth.getSessionToken();
        ws.send(JSON.stringify({
          type: "auth",
          token: token || undefined,
          // On web, cookies are sent automatically
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
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

      ws.onclose = () => {
        console.log("[WS] Disconnected");
        setStatus("disconnected");
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (userId) connect();
        }, delay);
      };

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
      };
    } catch (err) {
      console.error("[WS] Connection failed:", err);
      setStatus("disconnected");
    }
  }, [userId, getWsUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return true;
    }
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
