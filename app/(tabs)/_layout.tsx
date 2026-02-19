import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { useWorkoutTimer } from "@/lib/workout-timer-context";
import { useCallback } from "react";

function ActiveWorkoutBanner() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { activeWorkout, elapsedSeconds, isRestored } = useWorkoutTimer();

  const formatTime = useCallback((totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const handlePress = useCallback(() => {
    router.push("/workout-tracking");
  }, [router]);

  if (!activeWorkout) return null;

  const isRunning = activeWorkout.isRunning;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.floatingBanner,
        { backgroundColor: isRestored ? "#3B82F6" : isRunning ? "#22C55E" : "#F59E0B" },
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.bannerLeft}>
        <Text style={styles.bannerDot}>{isRestored ? "🔄" : isRunning ? "●" : "❚❚"}</Text>
        <Text style={styles.bannerExercise} numberOfLines={1}>
          {isRestored ? `${t.workoutRecovered || "Workout recovered"} - ` : ""}{activeWorkout.exerciseName}
        </Text>
      </View>
      <View style={styles.bannerRight}>
        <Text style={styles.bannerTime}>{formatTime(elapsedSeconds)}</Text>
        <Text style={styles.bannerArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { activeWorkout } = useWorkoutTimer();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            paddingTop: 8,
            paddingBottom: bottomPadding,
            height: tabBarHeight,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.tabHome,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="camera"
          options={{
            title: t.tabFood,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: t.tabWorkout,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="dumbbell.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="battle"
          options={{
            title: t.tabBattle,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="bolt.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t.tabDashboard,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
          }}
        />
      </Tabs>
      {/* Floating banner positioned just above the tab bar */}
      {activeWorkout && (
        <View
          style={[
            styles.floatingBannerContainer,
            { bottom: tabBarHeight },
          ]}
        >
          <ActiveWorkoutBanner />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBannerContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 100,
  },
  floatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 6,
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  bannerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerDot: {
    color: "#fff",
    fontSize: 10,
  },
  bannerExercise: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  bannerTime: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  bannerArrow: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 20,
    fontWeight: "700",
  },
});
