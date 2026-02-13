import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function WorkoutTrackingScreen() {
  useKeepAwake(); // Keep screen on during workout

  const router = useRouter();
  const colors = useColors();
  const { logWorkout } = useActivity();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    exerciseName?: string;
    exerciseIcon?: string;
    exerciseMet?: string;
    bonus?: string;
    targetDuration?: string;
  }>();

  const exerciseName = params.exerciseName || "Workout";
  const exerciseIcon = params.exerciseIcon || "🏃";
  const exerciseMet = parseFloat(params.exerciseMet || "5");
  const bonusType = (params.bonus || "none") as "none" | "outdoor" | "gym";
  const targetDuration = parseInt(params.targetDuration || "30", 10);
  const bodyWeight = 70; // kg default

  const bonusMultiplier = bonusType === "outdoor" ? 1.5 : bonusType === "gym" ? 2.0 : 1.0;
  const bonusLabel = bonusType === "outdoor" ? `🌳 ${t.outdoorBonus}` : bonusType === "gym" ? `🏋️ ${t.gymBonus}` : null;

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation values
  const pulseScale = useSharedValue(1);
  const progressRotation = useSharedValue(0);

  // Start pulse animation when running
  useEffect(() => {
    if (isRunning && !isCompleted) {
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
  }, [isRunning, isCompleted]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Timer logic
  useEffect(() => {
    if (isRunning && !isCompleted) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isCompleted]);

  // Auto-complete when target duration reached
  useEffect(() => {
    const targetSeconds = targetDuration * 60;
    if (elapsedSeconds >= targetSeconds && !isCompleted) {
      handleComplete();
    }
  }, [elapsedSeconds, targetDuration, isCompleted]);

  const elapsedMinutes = elapsedSeconds / 60;
  const currentCalories = useMemo(
    () => Math.round(exerciseMet * 3.5 * bodyWeight * elapsedMinutes / 200),
    [exerciseMet, elapsedMinutes]
  );
  const currentExp = useMemo(
    () => Math.round(exerciseMet * 3.5 * bodyWeight * elapsedMinutes / 200 * bonusMultiplier),
    [exerciseMet, elapsedMinutes, bonusMultiplier]
  );

  const progressPercent = Math.min(100, (elapsedSeconds / (targetDuration * 60)) * 100);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePauseResume = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsRunning((prev) => !prev);
  }, []);

  const handleComplete = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsCompleted(true);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const finalMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
    const finalExp = Math.round(exerciseMet * 3.5 * bodyWeight * finalMinutes / 200 * bonusMultiplier);

    logWorkout({
      exercise: exerciseName,
      duration: finalMinutes,
      expEarned: finalExp,
    });
  }, [elapsedSeconds, exerciseMet, bonusMultiplier, exerciseName, logWorkout]);

  const handleFinishEarly = useCallback(() => {
    if (elapsedSeconds < 60) {
      Alert.alert(
        t.tooShort || "Too Short",
        t.tooShortMessage || "You need to exercise for at least 1 minute to log this workout.",
        [{ text: t.ok }]
      );
      return;
    }
    handleComplete();
  }, [elapsedSeconds, handleComplete]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const finalMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
  const finalExp = Math.round(exerciseMet * 3.5 * bodyWeight * finalMinutes / 200 * bonusMultiplier);
  const finalCalories = Math.round(exerciseMet * 3.5 * bodyWeight * finalMinutes / 200);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>
            {isCompleted ? t.workoutComplete : (t.workoutInProgress || "Workout in Progress")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {isCompleted ? (
          /* Completion screen */
          <View style={styles.completionContainer}>
            <View style={[styles.completionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 64 }}>🎉</Text>
              <Text style={[styles.completionTitle, { color: colors.foreground }]}>
                {t.greatJob || "Great Job!"}
              </Text>
              <Text style={[styles.completionExercise, { color: colors.primary }]}>
                {exerciseIcon} {exerciseName}
              </Text>

              <View style={styles.completionStats}>
                <View style={styles.completionStatItem}>
                  <Text style={[styles.completionStatValue, { color: colors.foreground }]}>
                    {formatTime(elapsedSeconds)}
                  </Text>
                  <Text style={[styles.completionStatLabel, { color: colors.muted }]}>{t.duration}</Text>
                </View>
                <View style={[styles.completionDivider, { backgroundColor: colors.border }]} />
                <View style={styles.completionStatItem}>
                  <Text style={[styles.completionStatValue, { color: "#F59E0B" }]}>
                    +{finalExp}
                  </Text>
                  <Text style={[styles.completionStatLabel, { color: colors.muted }]}>{t.expReward}</Text>
                </View>
                <View style={[styles.completionDivider, { backgroundColor: colors.border }]} />
                <View style={styles.completionStatItem}>
                  <Text style={[styles.completionStatValue, { color: "#EF4444" }]}>
                    {finalCalories}
                  </Text>
                  <Text style={[styles.completionStatLabel, { color: colors.muted }]}>{t.calories}</Text>
                </View>
              </View>

              {bonusLabel && (
                <View style={[styles.bonusBadge, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={{ fontSize: 14, color: "#92400E" }}>{bonusLabel} {t.bonusApplied || "bonus applied!"}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleGoBack}
              style={styles.doneBtn}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#22C55E", "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneBtnGradient}
              >
                <Text style={styles.doneBtnText}>{t.done}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          /* Active workout screen */
          <View style={styles.activeContainer}>
            {/* Exercise info */}
            <View style={styles.exerciseInfo}>
              <Text style={{ fontSize: 48 }}>{exerciseIcon}</Text>
              <Text style={[styles.exerciseName, { color: colors.foreground }]}>{exerciseName}</Text>
              {bonusLabel && (
                <View style={[styles.bonusBadge, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={{ fontSize: 12, color: "#92400E" }}>{bonusLabel}</Text>
                </View>
              )}
            </View>

            {/* Timer circle */}
            <Animated.View style={[styles.timerCircleOuter, pulseStyle]}>
              <View style={[styles.timerCircle, { borderColor: isRunning ? colors.primary : colors.muted }]}>
                <Text style={[styles.timerText, { color: colors.foreground }]}>
                  {formatTime(elapsedSeconds)}
                </Text>
                <Text style={[styles.targetText, { color: colors.muted }]}>
                  / {targetDuration} min
                </Text>
              </View>
            </Animated.View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent >= 100 ? "#22C55E" : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.muted }]}>
                {Math.round(progressPercent)}% {t.completed || "complete"}
              </Text>
            </View>

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
                <Text style={[styles.liveStatLabel, { color: colors.muted }]}>{t.expReward}</Text>
              </View>
              <View style={[styles.liveStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 20 }}>⏱️</Text>
                <Text style={[styles.liveStatValue, { color: colors.primary }]}>{Math.ceil(elapsedMinutes)}</Text>
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
                  {isRunning ? t.pause : t.resume}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFinishEarly}
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
                  <Text style={styles.finishBtnText}>{t.finish}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingVertical: 12,
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
    paddingHorizontal: 24,
    gap: 24,
  },
  exerciseInfo: {
    alignItems: "center",
    gap: 4,
  },
  exerciseName: {
    fontSize: 24,
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
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55,
    borderRadius: SCREEN_WIDTH * 0.275,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  targetText: {
    fontSize: 14,
    marginTop: 4,
  },
  progressContainer: {
    width: "100%",
    gap: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: "center",
  },
  liveStats: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  liveStatCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
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
    paddingVertical: 16,
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
    paddingVertical: 16,
    borderRadius: 16,
  },
  finishBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  completionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  completionCard: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  completionExercise: {
    fontSize: 18,
    fontWeight: "600",
  },
  completionStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 16,
  },
  completionStatItem: {
    alignItems: "center",
    gap: 4,
  },
  completionStatValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  completionStatLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  completionDivider: {
    width: 1,
    height: 40,
  },
  doneBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  doneBtnGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
