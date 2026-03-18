import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";

const LOCAL_AUTH_KEY = "@fitmonster_local_auth";

// Sync local user to backend DB and get real DB ID
// Return value: positive number = DB ID, null = server unavailable (keep local), "ACCOUNT_NOT_FOUND" = deleted
async function syncLocalUserToDb(openId: string, name: string, email: string): Promise<number | null | "ACCOUNT_NOT_FOUND"> {
  try {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return null;
    const res = await fetch(`${baseUrl}/api/trpc/auth.syncLocalUser?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { openId, name, email } } }),
    });
    if (!res.ok) {
      // Check if the error is ACCOUNT_NOT_FOUND
      try {
        const errData = await res.json();
        const errMsg = errData?.[0]?.error?.json?.message || errData?.[0]?.error?.message || "";
        if (errMsg.includes("ACCOUNT_NOT_FOUND")) {
          console.warn("[AuthProvider] syncLocalUser: account not found (deleted)");
          return "ACCOUNT_NOT_FOUND";
        }
      } catch (_) { /* ignore parse error */ }
      console.warn("[AuthProvider] syncLocalUser failed:", res.status);
      return null;
    }
    const data = await res.json();
    const result = data?.[0]?.result?.data?.json;
    if (result?.id) {
      console.log("[AuthProvider] Local user synced to DB, real ID:", result.id);
      return result.id;
    }
    return null;
  } catch (err) {
    console.warn("[AuthProvider] syncLocalUser error:", err);
    return null;
  }
}

type AuthContextType = {
  user: Auth.User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  localLogin: (email: string, password: string) => Promise<void>;
  localSignup: (name: string, email: string, password: string) => Promise<void>;
  appleLogin: (identityToken: string, email: string | null, name: string | null, appleUserId: string) => Promise<void>;
  googleLogin: (idToken: string, email: string, name: string | null, googleUserId: string) => Promise<void>;
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
          const openId = localUser.openId || `local-${localUser.email}`;
          // Sync to DB to get real DB ID (fixes Date.now() IDs that don't exist in DB)
          const dbId = await syncLocalUserToDb(openId, localUser.name, localUser.email);

          // If account was deleted on server, clear local auth and treat as logged out
          if (dbId === "ACCOUNT_NOT_FOUND") {
            console.log("[AuthProvider] Account was deleted on server, clearing local auth");
            await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
            await Auth.removeSessionToken();
            await Auth.clearUserInfo();
            setUser(null);
            return;
          }

          const finalId = dbId || localUser.id || 0;
          // Update stored ID if we got a real DB ID
          if (dbId && typeof dbId === "number" && dbId !== localUser.id) {
            console.log(`[AuthProvider] Updating local user ID from ${localUser.id} to DB ID ${dbId}`);
            localUser.id = dbId;
            localUser.openId = openId;
            await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
          }
          const userInfo: Auth.User = {
            id: typeof finalId === "number" ? finalId : localUser.id || 0,
            openId,
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

  const localLogin = useCallback(async (email: string, password: string) => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) throw new Error("Server not available");
    const res = await fetch(`${baseUrl}/api/trpc/auth.localLogin?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { email: email.trim().toLowerCase(), password } } }),
    });
    const data = await res.json();
    const result = data?.[0]?.result?.data?.json;
    if (!result?.success) {
      // Check for specific error messages
      const errMsg = data?.[0]?.error?.json?.message || data?.[0]?.error?.message || "";
      if (errMsg.includes("NEEDS_PASSWORD")) {
        throw new Error("NEEDS_PASSWORD");
      }
      if (errMsg.includes("INVALID_CREDENTIALS")) {
        throw new Error("INVALID_CREDENTIALS");
      }
      throw new Error("INVALID_CREDENTIALS");
    }
    const localUser = {
      id: result.id,
      openId: result.openId,
      name: result.name || email.split("@")[0],
      email: email.trim().toLowerCase(),
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
    console.log("[AuthProvider] Local login successful, DB ID:", result.id);
  }, []);

  const googleLogin = useCallback(async (idToken: string, email: string, name: string | null, googleUserId: string) => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) throw new Error("Server not available");
    const res = await fetch(`${baseUrl}/api/trpc/auth.googleLogin?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { idToken, email, name, googleUserId } } }),
    });
    // Bug 3 fix: check res.ok before parsing JSON to avoid SyntaxError on HTML error pages
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Server error ${res.status}: ${text.slice(0, 100)}`);
    }
    const data = await res.json();
    const result = data?.[0]?.result?.data?.json;
    if (!result?.success) {
      const errMsg = data?.[0]?.error?.json?.message || data?.[0]?.error?.message || "Google login failed";
      throw new Error(errMsg);
    }
    const localUser = {
      id: result.id,
      openId: result.openId,
      name: result.name || name || "Google User",
      email: result.email || email || "",
      loginMethod: "google" as const,
      lastSignedIn: new Date().toISOString(),
    };
    await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
    const userInfo: Auth.User = {
      id: localUser.id,
      openId: localUser.openId,
      name: localUser.name,
      email: localUser.email,
      loginMethod: "google",
      lastSignedIn: new Date(localUser.lastSignedIn),
    };
    setUser(userInfo);
    setLoading(false);
    console.log("[AuthProvider] Google login successful, DB ID:", result.id);
    // Bug 8 fix: notify user when account was linked
    if (result.accountLinked) {
      setTimeout(() => {
        Alert.alert(
          "Account Linked",
          "Your Google account has been linked to your existing account."
        );
      }, 500);
    }
  }, []);

  const appleLogin = useCallback(async (identityToken: string, email: string | null, name: string | null, appleUserId: string) => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) throw new Error("Server not available");
    const res = await fetch(`${baseUrl}/api/trpc/auth.appleLogin?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { identityToken, email, name, appleUserId } } }),
    });
    // Bug 3 fix: check res.ok before parsing JSON to avoid SyntaxError on HTML error pages
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Server error ${res.status}: ${text.slice(0, 100)}`);
    }
    const data = await res.json();
    const result = data?.[0]?.result?.data?.json;
    if (!result?.success) {
      const errMsg = data?.[0]?.error?.json?.message || data?.[0]?.error?.message || "Apple login failed";
      throw new Error(errMsg);
    }
    const localUser = {
      id: result.id,
      openId: result.openId,
      name: result.name || name || "Apple User",
      email: result.email || email || "",
      loginMethod: "apple" as const,
      lastSignedIn: new Date().toISOString(),
    };
    await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
    const userInfo: Auth.User = {
      id: localUser.id,
      openId: localUser.openId,
      name: localUser.name,
      email: localUser.email,
      loginMethod: "apple",
      lastSignedIn: new Date(localUser.lastSignedIn),
    };
    setUser(userInfo);
    setLoading(false);
    console.log("[AuthProvider] Apple login successful, DB ID:", result.id);
    // Bug 8 fix: notify user when account was linked
    if (result.accountLinked) {
      setTimeout(() => {
        Alert.alert(
          "Account Linked",
          "Your Apple ID has been linked to your existing account."
        );
      }, 500);
    }
  }, []);

  const localSignup = useCallback(async (name: string, email: string, password: string) => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) throw new Error("Server not available");
    const res = await fetch(`${baseUrl}/api/trpc/auth.localSignup?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { name, email: email.trim().toLowerCase(), password } } }),
    });
    const data = await res.json();
    const result = data?.[0]?.result?.data?.json;
    if (!result?.success) {
      const errMsg = data?.[0]?.error?.json?.message || data?.[0]?.error?.message || "";
      if (errMsg.includes("EMAIL_EXISTS")) {
        throw new Error("EMAIL_EXISTS");
      }
      throw new Error("SIGNUP_FAILED");
    }
    const localUser = {
      id: result.id,
      openId: result.openId,
      name,
      email: email.trim().toLowerCase(),
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
    console.log("[AuthProvider] Local signup successful:", name, "DB ID:", result.id);
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
      // Native: check local auth first for fast startup, then verify with server
      AsyncStorage.getItem(LOCAL_AUTH_KEY).then(async (localRaw) => {
        if (localRaw) {
          try {
            const localUser = JSON.parse(localRaw);
            const openId = localUser.openId || `local-${localUser.email}`;
            const userInfo: Auth.User = {
              id: localUser.id || 0,
              openId,
              name: localUser.name,
              email: localUser.email,
              loginMethod: "local",
              lastSignedIn: new Date(localUser.lastSignedIn || Date.now()),
            };
            setUser(userInfo);
            setLoading(false);

            // Background verify: check if account still exists on server
            // If deleted, clear local auth and log out
            const dbResult = await syncLocalUserToDb(openId, localUser.name, localUser.email);
            if (dbResult === "ACCOUNT_NOT_FOUND") {
              console.log("[AuthProvider] Background check: account deleted on server, logging out");
              await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
              await Auth.removeSessionToken();
              await Auth.clearUserInfo();
              setUser(null);
            } else if (dbResult && typeof dbResult === "number" && dbResult !== localUser.id) {
              // Update local ID if server returned a different one
              localUser.id = dbResult;
              localUser.openId = openId;
              await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
              setUser({
                ...userInfo,
                id: dbResult,
              });
            }
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
    () => ({ user, loading, error, isAuthenticated, refresh: fetchUser, logout, localLogin, localSignup, appleLogin, googleLogin }),
    [user, loading, error, isAuthenticated, fetchUser, logout, localLogin, localSignup, appleLogin, googleLogin],
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
