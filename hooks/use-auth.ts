import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCAL_AUTH_KEY = "@fitmonster_local_auth";

export type LocalUser = {
  id: number;
  name: string;
  email: string;
  loginMethod: "local";
  lastSignedIn: Date;
};

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // First check for local auth (email/password login)
      const localAuthRaw = await AsyncStorage.getItem(LOCAL_AUTH_KEY);
      if (localAuthRaw) {
        try {
          const localUser = JSON.parse(localAuthRaw);
          console.log("[useAuth] Local auth user found:", localUser.name);
          const userInfo: Auth.User = {
            id: localUser.id || 0,
            openId: localUser.openId || `local-${localUser.email}`,
            name: localUser.name,
            email: localUser.email,
            loginMethod: "local",
            lastSignedIn: new Date(localUser.lastSignedIn || Date.now()),
          };
          setUser(userInfo);
          return;
        } catch (e) {
          console.error("[useAuth] Failed to parse local auth:", e);
          await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
        }
      }

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        console.log("[useAuth] Web platform: fetching user from API...");
        const apiUser = await Api.getMe();
        console.log("[useAuth] API user response:", apiUser);

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          await Auth.setUserInfo(userInfo);
          console.log("[useAuth] Web user set from API:", userInfo);
        } else {
          console.log("[useAuth] Web: No authenticated user from API");
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }

      // Native platform: use token-based auth
      console.log("[useAuth] Native platform: checking for session token...");
      const sessionToken = await Auth.getSessionToken();
      console.log(
        "[useAuth] Session token:",
        sessionToken ? `present (${sessionToken.substring(0, 20)}...)` : "missing",
      );
      if (!sessionToken) {
        console.log("[useAuth] No session token, setting user to null");
        setUser(null);
        return;
      }

      // Use cached user info for native (token validates the session)
      const cachedUser = await Auth.getUserInfo();
      console.log("[useAuth] Cached user:", cachedUser);
      if (cachedUser) {
        console.log("[useAuth] Using cached user info");
        setUser(cachedUser);
      } else {
        console.log("[useAuth] No cached user, setting user to null");
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[useAuth] fetchUser completed, loading:", false);
    }
  }, []);

  // Local email/password login — stores user locally and sets authenticated state
  const localLogin = useCallback(async (name: string, email: string) => {
    const localUser = {
      id: Date.now(),
      openId: `local-${email}`,
      name,
      email,
      loginMethod: "local" as const,
      lastSignedIn: new Date().toISOString(),
    };
    await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
    const userInfo: Auth.User = {
      id: localUser.id,
      openId: localUser.openId,
      name: localUser.name,
      email: localUser.email,
      loginMethod: "local",
      lastSignedIn: new Date(localUser.lastSignedIn),
    };
    setUser(userInfo);
    setLoading(false);
    console.log("[useAuth] Local login successful:", name);
  }, []);

  // Local email/password signup — same as login but creates new user
  const localSignup = useCallback(async (name: string, email: string) => {
    // For local auth, signup and login are the same — just store user info
    const localUser = {
      id: Date.now(),
      openId: `local-${email}`,
      name,
      email,
      loginMethod: "local" as const,
      lastSignedIn: new Date().toISOString(),
    };
    await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
    const userInfo: Auth.User = {
      id: localUser.id,
      openId: localUser.openId,
      name: localUser.name,
      email: localUser.email,
      loginMethod: "local",
      lastSignedIn: new Date(localUser.lastSignedIn),
    };
    setUser(userInfo);
    setLoading(false);
    console.log("[useAuth] Local signup successful:", name);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Clear local auth first
      await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
      // Try server logout (may fail for local users, that's fine)
      await Api.logout().catch(() => {});
    } catch (err) {
      console.error("[Auth] Logout error:", err);
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    console.log("[useAuth] useEffect triggered, autoFetch:", autoFetch, "platform:", Platform.OS);
    if (autoFetch) {
      if (Platform.OS === "web") {
        // Web: check local auth first, then API
        console.log("[useAuth] Web: fetching user...");
        fetchUser();
      } else {
        // Native: check local auth first, then cached user info
        AsyncStorage.getItem(LOCAL_AUTH_KEY).then((localRaw) => {
          if (localRaw) {
            try {
              const localUser = JSON.parse(localRaw);
              const userInfo: Auth.User = {
                id: localUser.id || 0,
                openId: localUser.openId || `local-${localUser.email}`,
                name: localUser.name,
                email: localUser.email,
                loginMethod: "local",
                lastSignedIn: new Date(localUser.lastSignedIn || Date.now()),
              };
              setUser(userInfo);
              setLoading(false);
              return;
            } catch (e) {
              // Fall through to OAuth check
            }
          }
          // No local auth, check OAuth
          Auth.getUserInfo().then((cachedUser) => {
            console.log("[useAuth] Native cached user check:", cachedUser);
            if (cachedUser) {
              console.log("[useAuth] Native: setting cached user immediately");
              setUser(cachedUser);
              setLoading(false);
            } else {
              fetchUser();
            }
          });
        });
      }
    } else {
      console.log("[useAuth] autoFetch disabled, setting loading to false");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[useAuth] State updated:", {
      hasUser: !!user,
      loading,
      isAuthenticated,
      error: error?.message,
    });
  }, [user, loading, isAuthenticated, error]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
    localLogin,
    localSignup,
  };
}
