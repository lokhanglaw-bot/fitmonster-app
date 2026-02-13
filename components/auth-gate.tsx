import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * AuthGate monitors authentication state and redirects:
 * - Unauthenticated users → /auth (login page)
 * - Authenticated users on /auth → /(tabs) (home)
 *
 * Place this component inside the root layout, after providers.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (loading) return; // Wait for auth state to resolve

    const inAuthGroup = segments[0] === "auth";
    const inOAuthCallback = segments[0] === "oauth";

    // Don't redirect during OAuth callback
    if (inOAuthCallback) return;

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated and not on auth page → redirect to login
      router.replace("/auth");
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated but still on auth page → redirect to home
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, segments, router]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
