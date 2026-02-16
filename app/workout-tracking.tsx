import { useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useActivity } from "@/lib/activity-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useI18n } from "@/lib/i18n-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkoutTimer } from "@/lib/workout-timer-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function WorkoutTrackingScreen() {
  useKeepAwake();

  const router = useRouter();
  const colors = useColors();
  const { logWorkout } = useActivity();
  const { t, tr } = useI18n();
  const insets = useSafeAreaInsets();
  const {
    activeWorkout,
    elapsedSeconds,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    finishWorkout,
    cancelWorkout,
  } = useWorkoutTimer();

  const params = useLocalSearchParams<{
    exerciseName?: string;
    exerciseIcon?: string;
    exerciseMet?: string;
    bonus?: string;
  }>();

  const exerciseName = activeWorkout?.exerciseName || params.exerciseName || "Workout";
  const exerciseIcon = activeWorkout?.exerciseIcon || params.exerciseIcon || "🏃";
  const exerciseMet = activeWorkout?.exerciseMet ?? parseFloat(params.exerciseMet || "5");
  const bonusType = activeWorkout?.bonus || (params.bonus as "none" | "outdoor" | "gym") || "none";
  const bodyWeight = 70;

  const bonusMultiplier = bonusType === "outdoor" ? 1.5 : bonusType === "gym" ? 2.0 : 1.0;
  const bonusLabel = bonusType === "outdoor" ? `🌳 ${t.outdoor}` : bonusType === "gym" ? `🏋️ ${t.gym}` : null;
  const isRunning = activeWorkout?.isRunning ?? false;

  // Start the workout timer when screen mounts (if no active workout)
  useEffect(() => {
    if (!activeWorkout && params.exerciseName) {
      startWorkout({
        exerciseName: params.exerciseName,
        exerciseIcon: params.exerciseIcon || "🏃",
        exerciseMet: parseFloat(params.exerciseMet || "5"),
        bonus: (params.bonus as "none" | "outdoor" | "gym") || "none",
      });
    }
  }, []); // Only on mount

  // Animation values
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRunning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRunning]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Real-time calorie and EXP calculation
  const elapsedMinutes = elapsedSeconds / 60;
  const currentCalories = useMemo(
    () => Math.round(exerciseMet * 3.5 * bodyWeight * elapsedMinutes / 200),
    [exerciseMet, elapsedMinutes]
  );
  const currentExp = useMemo(
    () => Math.round(exerciseMet * 3.5 * bodyWeight * elapsedMinutes / 200 * bonusMultiplier),
    [exerciseMet, elapsedMinutes, bonusMultiplier]
  );

  const formatTime = useCallback((totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handlePauseResume = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isRunning) {
      pauseWorkout();
    } else {
      resumeWorkout();
    }
  }, [isRunning, pauseWorkout, resumeWorkout]);

  const handleFinish = useCallback(() => {
    if (elapsedSeconds < 60) {
      Alert.alert(
        t.tooShort || "Too Short",
        t.tooShortMessage || "You need to exercise for at least 1 minute to log this workout.",
        [{ text: t.ok }]
      );
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const finalMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
    const finalWorkout = finishWorkout();

    if (finalWorkout) {
      const fMet = finalWorkout.exerciseMet;
      const fBonus = finalWorkout.bonus === "gym" ? 2.0 : finalWorkout.bonus === "outdoor" ? 1.5 : 1.0;
      const finalExp = Math.round(fMet * 3.5 * bodyWeight * finalMinutes / 200 * fBonus);

      logWorkout({
        exercise: finalWorkout.exerciseName,
        duration: finalMinutes,
        expEarned: finalExp,
      });

      const finalCalories = Math.round(fMet * 3.5 * bodyWeight * finalMinutes / 200);

      Alert.alert(
        t.workoutComplete || "Workout Complete!",
        `${finalWorkout.exerciseName}\n${t.duration}: ${finalMinutes} ${t.minutes}\n${t.calories}: ${finalCalories} kcal\nEXP: +${finalExp}`,
        [{ text: t.ok, onPress: () => {
          if (router.canDismiss()) router.dismiss();
          else router.back();
        }}]
      );
    } else {
      if (router.canDismiss()) router.dismiss();
      else router.back();
    }
  }, [elapsedSeconds, finishWorkout, logWorkout, router, t, bodyWeight]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t.cancel,
      t.cancelWorkoutConfirm || "Are you sure you want to cancel this workout?",
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.confirm,
          style: "destructive",
          onPress: () => {
            cancelWorkout();
            if (router.canDismiss()) router.dismiss();
            else router.back();
          },
        },
      ]
    );
  }, [cancelWorkout, router, t]);

  return (
    <ScreenContainer edges={["bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 44) + 8 }]}>
          <TouchableOpacity
            onPress={handleCancel}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>
            {t.workoutInProgress || "Workout in Progress"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Active workout screen */}
        <View style={styles.activeContainer}>
          {/* Exercise info */}
          <View style={styles.exerciseInfo}>
            <Text style={{ fontSize: 48 }}>{exerciseIcon}</Text>
            <Text style={[styles.exerciseName, { color: colors.foreground }]}>{exerciseName}</Text>
            {bonusLabel && (
              <View style={[styles.bonusBadge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={{ fontSize: 13, color: "#92400E", fontWeight: "600" }}>{bonusLabel} x{bonusMultiplier}</Text>
              </View>
            )}
          </View>

          {/* Timer circle — open-ended, no target */}
          <Animated.View style={[styles.timerCircleOuter, pulseStyle]}>
            <View style={[styles.timerCircle, { borderColor: isRunning ? colors.primary : colors.muted }]}>
              <Text style={[styles.timerText, { color: colors.foreground }]}>
                {formatTime(elapsedSeconds)}
              </Text>
              {!isRunning && activeWorkout && (
                <Text style={[styles.pausedLabel, { color: colors.warning }]}>
                  {t.paused || "PAUSED"}
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Live stats */}
          <View style={styles.liveStats}>
            <View style={[styles.liveStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <Text style={[styles.liveStatValue, { color: "#EF4444" }]}>{currentCalories}</Text>
              <Text style={[styles.liveStatLabel, { color: colors.muted }]}>{t.calories}</Text>
            </View>
            <View style={[styles.liveStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>⭐</Text>
              <Text style={[styles.liveStatValue, { color: "#F59E0B" }]}>{currentExp}</Text>
              <Text style={[styles.liveStatLabel, { color: colors.muted }]}>EXP</Text>
            </View>
            <View style={[styles.liveStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>⏱️</Text>
              <Text style={[styles.liveStatValue, { color: colors.primary }]}>{Math.floor(elapsedMinutes)}</Text>
              <Text style={[styles.liveStatLabel, { color: colors.muted }]}>{t.minutes}</Text>
            </View>
          </View>

          {/* Control buttons */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handlePauseResume}
              style={[styles.controlBtn, { backgroundColor: isRunning ? "#FEF3C7" : "#DCFCE7" }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24 }}>{isRunning ? "⏸️" : "▶️"}</Text>
              <Text style={[styles.controlBtnText, { color: isRunning ? "#92400E" : "#166534" }]}>
                {isRunning ? (t.pause || "Pause") : (t.resume || "Resume")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFinish}
              style={styles.finishBtn}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#F97316", "#EF4444"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.finishBtnGradient}
              >
                <Text style={{ fontSize: 20 }}>🏁</Text>
                <Text style={styles.finishBtnText}>{t.finishWorkout}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  activeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24,
  },
  exerciseInfo: {
    alignItems: "center",
    gap: 4,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "700",
  },
  bonusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  timerCircleOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerCircle: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: SCREEN_WIDTH * 0.25,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 42,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  pausedLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  liveStats: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  liveStatCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  liveStatValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  liveStatLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  controls: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  controlBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  finishBtn: {
    flex: 1.5,
    borderRadius: 16,
    overflow: "hidden",
  },
  finishBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  finishBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
