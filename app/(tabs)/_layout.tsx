import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { useWorkoutTimer } from "@/lib/workout-timer-context";
import { useCallback, useMemo } from "react";

function ActiveWorkoutBanner() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { activeWorkout, elapsedSeconds } = useWorkoutTimer();

  const formatTime = useCallback((totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const handlePress = useCallback(() => {
    router.push("/workout-tracking");
  }, [router]);

  if (!activeWorkout) return null;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.banner, { backgroundColor: activeWorkout.isRunning ? "#22C55E" : "#F59E0B" }]}
      activeOpacity={0.8}
    >
      <Text style={styles.bannerIcon}>{activeWorkout.isRunning ? "🏃" : "⏸️"}</Text>
      <Text style={styles.bannerText}>
        {activeWorkout.exerciseName} — {formatTime(elapsedSeconds)}
      </Text>
      <Text style={styles.bannerArrow}>→</Text>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <View style={{ flex: 1 }}>
      <ActiveWorkoutBanner />
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
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  bannerIcon: {
    fontSize: 16,
  },
  bannerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  bannerArrow: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
