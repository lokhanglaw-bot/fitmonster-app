import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCAL_AUTH_KEY = "@fitmonster_local_auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          if (token) {
            return { Authorization: `Bearer ${token}` };
          }
          // For local login users: send X-User-Id and X-Open-Id headers
          // so the server can identify them without JWT token
          try {
            const localAuthRaw = await AsyncStorage.getItem(LOCAL_AUTH_KEY);
            if (localAuthRaw) {
              const localUser = JSON.parse(localAuthRaw);
              const headers: Record<string, string> = {};
              if (localUser.id) headers["X-User-Id"] = String(localUser.id);
              if (localUser.openId) headers["X-Open-Id"] = localUser.openId;
              return headers;
            }
          } catch (e) {
            // ignore
          }
          return {};
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
