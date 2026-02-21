import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSegments } from "expo-router";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_COMPLETED_KEY = "@fitmonster_profile_completed";

type ProfileGateContextValue = {
  profileCompleted: boolean | null;
  /** Call after profile-setup saves successfully to let AuthGate know immediately */
  setProfileDone: () => void;
};

const ProfileGateContext = createContext<ProfileGateContextValue>({
  profileCompleted: null,
  setProfileDone: () => {},
});

/** Hook for profile-setup screen to signal completion */
export function useProfileGate() {
  return useContext(ProfileGateContext);
}

/**
 * AuthGate monitors authentication state and redirects:
 * - Unauthenticated users → /auth (login page)
 * - Authenticated users without profile → /profile-setup
 * - Authenticated users on /auth → /(tabs) (home)
 *
 * Place this component inside the root layout, after providers.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colors = useColors();
  const [profileChecked, setProfileChecked] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);

  // Check if profile is completed (from local storage cache)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfileChecked(false);
      setProfileCompleted(null);
      return;
    }

    const checkProfile = async () => {
      try {
        const key = `${PROFILE_COMPLETED_KEY}_${user.openId || user.id}`;
        const cached = await AsyncStorage.getItem(key);
        if (cached === "true") {
          setProfileCompleted(true);
          setProfileChecked(true);
          return;
        }
        // Default to not completed for new users
        setProfileCompleted(false);
        setProfileChecked(true);
      } catch {
        setProfileCompleted(false);
        setProfileChecked(true);
      }
    };

    checkProfile();
  }, [isAuthenticated, user]);

  // Callback that profile-setup calls after successful save
  const setProfileDone = useCallback(() => {
    setProfileCompleted(true);
  }, []);

  useEffect(() => {
    if (loading) return; // Wait for auth state to resolve

    const inAuthGroup = segments[0] === "auth";
    const inOAuthCallback = segments[0] === "oauth";
    const inProfileSetup = segments[0] === "profile-setup";

    // Don't redirect during OAuth callback
    if (inOAuthCallback) return;

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated and not on auth page → redirect to login
      router.replace("/auth");
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated but still on auth page
      if (profileChecked && !profileCompleted) {
        // Profile not completed → redirect to profile setup
        router.replace("/profile-setup");
      } else {
        // Profile completed or not yet checked → redirect to home
        router.replace("/(tabs)");
      }
    } else if (isAuthenticated && profileChecked && !profileCompleted && !inProfileSetup && !inAuthGroup) {
      // Authenticated, profile not completed, not on profile-setup → redirect to profile setup
      router.replace("/profile-setup");
    } else if (isAuthenticated && profileChecked && profileCompleted && inProfileSetup) {
      // Profile just completed while on profile-setup → redirect to home
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, segments, router, profileChecked, profileCompleted]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ProfileGateContext.Provider value={{ profileCompleted, setProfileDone }}>
      {children}
    </ProfileGateContext.Provider>
  );
}

/**
 * Call this after profile setup is completed to cache the result
 */
export async function markProfileCompleted(userIdentifier: string) {
  const key = `${PROFILE_COMPLETED_KEY}_${userIdentifier}`;
  await AsyncStorage.setItem(key, "true");
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
