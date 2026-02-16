import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Modal,
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
  withDelay,
  withSpring,
  Easing,
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useI18n } from "@/lib/i18n-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkoutTimer } from "@/lib/workout-timer-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Confetti particle component
function ConfettiParticle({ delay, color, startX }: { delay: number; color: string; startX: number }) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1500, withTiming(0, { duration: 500 }))
    ));
    translateY.value = withDelay(delay, withTiming(
      SCREEN_WIDTH * 0.8 + Math.random() * 200,
      { duration: 2200, easing: Easing.out(Easing.quad) }
    ));
    translateX.value = withDelay(delay, withTiming(
      startX + (Math.random() - 0.5) * 120,
      { duration: 2200, easing: Easing.inOut(Easing.ease) }
    ));
    rotate.value = withDelay(delay, withTiming(
      (Math.random() - 0.5) * 720,
      { duration: 2200 }
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0,
    left: SCREEN_WIDTH / 2,
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: color,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return <Animated.View style={style} />;
}

// Celebration Modal
function CelebrationModal({
  visible,
  exerciseName,
  exerciseIcon,
  durationMinutes,
  calories,
  exp,
  bonusLabel,
  onDismiss,
}: {
  visible: boolean;
  exerciseName: string;
  exerciseIcon: string;
  durationMinutes: number;
  calories: number;
  exp: number;
  bonusLabel: string | null;
  onDismiss: () => void;
}) {
  const colors = useColors();
  const { t } = useI18n();

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.3);
  const cardOpacity = useSharedValue(0);
  const trophyScale = useSharedValue(0);
  const trophyRotate = useSharedValue(-30);
  const statsOpacity = useSharedValue(0);
  const statsTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const calCounterValue = useSharedValue(0);
  const expCounterValue = useSharedValue(0);

  // Counter display states
  const [displayCal, setDisplayCal] = useState(0);
  const [displayExp, setDisplayExp] = useState(0);

  const updateCalDisplay = useCallback((val: number) => {
    setDisplayCal(Math.round(val));
  }, []);
  const updateExpDisplay = useCallback((val: number) => {
    setDisplayExp(Math.round(val));
  }, []);

  useEffect(() => {
    if (visible) {
      setDisplayCal(0);
      setDisplayExp(0);

      // Backdrop
      backdropOpacity.value = withTiming(1, { duration: 300 });

      // Card entrance
      cardScale.value = withSpring(1, { damping: 12, stiffness: 120 });
      cardOpacity.value = withTiming(1, { duration: 300 });

      // Trophy bounce in
      trophyScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 150 }));
      trophyRotate.value = withDelay(200, withSpring(0, { damping: 8, stiffness: 100 }));

      // Glow pulse
      glowScale.value = withDelay(300, withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      ));

      // Stats slide in
      statsOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
      statsTranslateY.value = withDelay(500, withSpring(0, { damping: 15 }));

      // Counter animations
      calCounterValue.value = 0;
      expCounterValue.value = 0;
      calCounterValue.value = withDelay(600, withTiming(calories, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      }));
      expCounterValue.value = withDelay(800, withTiming(exp, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      }));

      // Button
      buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 300 }));

      // Haptic
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 300);
      }
    } else {
      backdropOpacity.value = 0;
      cardScale.value = 0.3;
      cardOpacity.value = 0;
      trophyScale.value = 0;
      trophyRotate.value = -30;
      statsOpacity.value = 0;
      statsTranslateY.value = 30;
      buttonOpacity.value = 0;
      glowScale.value = 0.8;
    }
  }, [visible, calories, exp]);

  // Update counter displays using polling
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setDisplayCal(Math.round(calCounterValue.value));
      setDisplayExp(Math.round(expCounterValue.value));
    }, 50);
    return () => clearInterval(interval);
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.3,
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: statsTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const confettiColors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FF9F43", "#EE5A24", "#A29BFE"];
  const confettiParticles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: Math.random() * 600,
      color: confettiColors[i % confettiColors.length],
      startX: (Math.random() - 0.5) * SCREEN_WIDTH * 0.8,
    }));
  }, []);

  const formatDuration = useCallback((mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }
    return `${mins}m`;
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={celebStyles.overlay}>
        <Animated.View style={[celebStyles.backdrop, backdropStyle]} />

        {/* Confetti */}
        {confettiParticles.map((p) => (
          <ConfettiParticle key={p.id} delay={p.delay} color={p.color} startX={p.startX} />
        ))}

        <Animated.View style={[celebStyles.card, { backgroundColor: colors.background }, cardStyle]}>
          {/* Glow ring */}
          <Animated.View style={[celebStyles.glowRing, glowStyle]} />

          {/* Trophy */}
          <Animated.View style={[celebStyles.trophyContainer, trophyStyle]}>
            <Text style={celebStyles.trophyEmoji}>🏆</Text>
          </Animated.View>

          {/* Title */}
          <Text style={[celebStyles.title, { color: colors.foreground }]}>
            {t.workoutComplete}
          </Text>
          <Text style={[celebStyles.subtitle, { color: colors.muted }]}>
            {t.greatJob}
          </Text>

          {/* Exercise info */}
          <View style={[celebStyles.exerciseRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 28 }}>{exerciseIcon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[celebStyles.exerciseLabel, { color: colors.foreground }]}>{exerciseName}</Text>
              <Text style={[celebStyles.exerciseDuration, { color: colors.muted }]}>
                {t.totalTime}: {formatDuration(durationMinutes)}
              </Text>
            </View>
            {bonusLabel && (
              <View style={celebStyles.bonusPill}>
                <Text style={celebStyles.bonusPillText}>{bonusLabel}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <Animated.View style={[celebStyles.statsRow, statsStyle]}>
            <View style={[celebStyles.statBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Text style={{ fontSize: 28 }}>🔥</Text>
              <Text style={[celebStyles.statValue, { color: "#EF4444" }]}>{displayCal}</Text>
              <Text style={[celebStyles.statLabel, { color: "#B91C1C" }]}>kcal</Text>
              <Text style={[celebStyles.statTitle, { color: "#991B1B" }]}>{t.caloriesBurned}</Text>
            </View>
            <View style={[celebStyles.statBox, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
              <Text style={{ fontSize: 28 }}>⭐</Text>
              <Text style={[celebStyles.statValue, { color: "#F59E0B" }]}>+{displayExp}</Text>
              <Text style={[celebStyles.statLabel, { color: "#B45309" }]}>EXP</Text>
              <Text style={[celebStyles.statTitle, { color: "#92400E" }]}>{t.expEarned}</Text>
            </View>
          </Animated.View>

          {/* Button */}
          <Animated.View style={[{ width: "100%" }, buttonStyle]}>
            <TouchableOpacity
              onPress={onDismiss}
              style={celebStyles.doneButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#22C55E", "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={celebStyles.doneButtonGradient}
              >
                <Text style={celebStyles.doneButtonText}>✅ {t.backToWorkouts}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

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
  const bonusLabel = bonusType === "outdoor" ? `🌳 ${t.outdoor} x1.5` : bonusType === "gym" ? `🏋️ ${t.gym} x2.0` : null;
  const isRunning = activeWorkout?.isRunning ?? false;

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState({
    calories: 0,
    exp: 0,
    durationMinutes: 0,
  });

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
      const finalCalories = Math.round(fMet * 3.5 * bodyWeight * finalMinutes / 200);
      const finalExp = Math.round(finalCalories * fBonus);

      logWorkout({
        exercise: finalWorkout.exerciseName,
        duration: finalMinutes,
        expEarned: finalExp,
      });

      // Show celebration instead of Alert
      setCelebrationData({
        calories: finalCalories,
        exp: finalExp,
        durationMinutes: finalMinutes,
      });
      setShowCelebration(true);
    } else {
      if (router.canDismiss()) router.dismiss();
      else router.back();
    }
  }, [elapsedSeconds, finishWorkout, logWorkout, router, t, bodyWeight]);

  const handleCelebrationDismiss = useCallback(() => {
    setShowCelebration(false);
    setTimeout(() => {
      if (router.canDismiss()) router.dismiss();
      else router.back();
    }, 100);
  }, [router]);

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
                <Text style={{ fontSize: 13, color: "#92400E", fontWeight: "600" }}>{bonusLabel}</Text>
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

      {/* Celebration Modal */}
      <CelebrationModal
        visible={showCelebration}
        exerciseName={exerciseName}
        exerciseIcon={exerciseIcon}
        durationMinutes={celebrationData.durationMinutes}
        calories={celebrationData.calories}
        exp={celebrationData.exp}
        bonusLabel={bonusLabel}
        onDismiss={handleCelebrationDismiss}
      />
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

const celebStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  glowRing: {
    position: "absolute",
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FFD700",
  },
  trophyContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  trophyEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: -4,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  exerciseLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseDuration: {
    fontSize: 13,
    marginTop: 2,
  },
  bonusPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bonusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  statTitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  doneButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  doneButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
