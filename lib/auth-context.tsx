import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCAL_AUTH_KEY = "@fitmonster_local_auth";

type AuthContextType = {
  user: Auth.User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  localLogin: (name: string, email: string) => Promise<void>;
  localSignup: (name: string, email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    console.log("[AuthProvider] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // First check for local auth (email/password login)
      const localAuthRaw = await AsyncStorage.getItem(LOCAL_AUTH_KEY);
      if (localAuthRaw) {
        try {
          const localUser = JSON.parse(localAuthRaw);
          console.log("[AuthProvider] Local auth user found:", localUser.name);
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
          console.error("[AuthProvider] Failed to parse local auth:", e);
          await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
        }
      }

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        console.log("[AuthProvider] Web platform: fetching user from API...");
        const apiUser = await Api.getMe();

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
          console.log("[AuthProvider] Web user set from API");
        } else {
          console.log("[AuthProvider] Web: No authenticated user from API");
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }

      // Native platform: use token-based auth
      console.log("[AuthProvider] Native platform: checking for session token...");
      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        console.log("[AuthProvider] No session token, setting user to null");
        setUser(null);
        return;
      }

      const cachedUser = await Auth.getUserInfo();
      if (cachedUser) {
        console.log("[AuthProvider] Using cached user info");
        setUser(cachedUser);
      } else {
        console.log("[AuthProvider] No cached user, setting user to null");
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[AuthProvider] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
    console.log("[AuthProvider] Local login successful:", name);
  }, []);

  const localSignup = useCallback(async (name: string, email: string) => {
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
    console.log("[AuthProvider] Local signup successful:", name);
  }, []);

  const logout = useCallback(async () => {
    console.log("[AuthProvider] Logout called");
    try {
      await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
      await Api.logout().catch(() => {});
    } catch (err) {
      console.error("[AuthProvider] Logout error:", err);
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
      console.log("[AuthProvider] User set to null, logout complete");
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  // Initial auth check
  useEffect(() => {
    console.log("[AuthProvider] Initial auth check, platform:", Platform.OS);
    if (Platform.OS === "web") {
      fetchUser();
    } else {
      // Native: check local auth first for fast startup
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
            // Fall through
          }
        }
        Auth.getUserInfo().then((cachedUser) => {
          if (cachedUser) {
            setUser(cachedUser);
            setLoading(false);
          } else {
            fetchUser();
          }
        });
      });
    }
  }, [fetchUser]);

  const value = useMemo(
    () => ({ user, loading, error, isAuthenticated, refresh: fetchUser, logout, localLogin, localSignup }),
    [user, loading, error, isAuthenticated, fetchUser, logout, localLogin, localSignup],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}
