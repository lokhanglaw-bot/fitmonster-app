import { useState, useCallback, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useActivity } from "@/lib/activity-context";
import { useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n-context";
import { useWorkoutTimer } from "@/lib/workout-timer-context";
import * as Haptics from "expo-haptics";
import { Pedometer } from "expo-sensors";

type WorkoutLog = {
  exercise: string;
  duration: number;
  exp: number;
  timestamp: Date;
};

type BonusType = "none" | "outdoor" | "gym";

export default function WorkoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, tr } = useI18n();
  const { activeWorkout } = useWorkoutTimer();

  const WORKOUT_TYPES = [
    { key: "All", label: t.allExercises },
    { key: "Running", label: t.running },
    { key: "Weight Training", label: t.weightTraining },
    { key: "Yoga", label: t.yoga },
    { key: "Basketball", label: t.basketball },
  ];

  const EXERCISES = [
    { id: 1, name: t.running, icon: "🏃", met: 8, category: "Running" },
    { id: 2, name: t.cycling, icon: "🚴", met: 7.5, category: "Running" },
    { id: 3, name: t.swimming, icon: "🏊", met: 7, category: "Running" },
    { id: 4, name: t.walkingExercise, icon: "🚶", met: 3.5, category: "Running" },
    { id: 5, name: t.hiking, icon: "🥾", met: 6, category: "Running" },
    { id: 6, name: t.jumpRope, icon: "🤸", met: 10, category: "Running" },
    { id: 7, name: t.benchPress, icon: "🏋️", met: 6, category: "Weight Training" },
    { id: 8, name: t.squats, icon: "🦵", met: 5.5, category: "Weight Training" },
    { id: 9, name: t.deadlift, icon: "💪", met: 6, category: "Weight Training" },
    { id: 10, name: t.yogaFlow, icon: "🧘", met: 3, category: "Yoga" },
    { id: 11, name: t.basketball, icon: "🏀", met: 6.5, category: "Basketball" },
  ];

  const [selectedType, setSelectedType] = useState("All");
  const { state: activityState, logWorkout: logWorkoutToContext, syncSteps: syncStepsToContext } = useActivity();

  const totalExp = activityState.todayTotalExp;
  const completedCount = activityState.todayWorkoutLogs.length;
  const steps = activityState.todaySteps;

  const workoutLogs: WorkoutLog[] = useMemo(() => {
    return activityState.allWorkoutLogs.slice(-10).reverse().map(log => ({
      exercise: log.exercise,
      duration: log.duration,
      exp: log.expEarned,
      timestamp: new Date(log.timestamp),
    }));
  }, [activityState.allWorkoutLogs]);

  const [selectedExercise, setSelectedExercise] = useState<typeof EXERCISES[0] | null>(null);
  const [bonus, setBonus] = useState<BonusType>("none");

  // Manual Log Modal
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualExercise, setManualExercise] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [manualWeight, setManualWeight] = useState("70");

  const filteredExercises = selectedType === "All" ? EXERCISES : EXERCISES.filter((e) => e.category === selectedType);

  const handleExercisePress = useCallback((exercise: typeof EXERCISES[0]) => {
    setSelectedExercise(exercise);
    setBonus("none");
  }, []);

  const handleStartTraining = useCallback(() => {
    if (!selectedExercise) return;
    if (activeWorkout) {
      Alert.alert(
        t.workoutInProgress,
        t.finishCurrentWorkout || "Please finish or cancel your current workout first.",
        [{ text: t.ok }]
      );
      return;
    }
    // Navigate to the workout tracking page — timer starts there via context
    router.push({
      pathname: "/workout-tracking" as any,
      params: {
        exerciseName: selectedExercise.name,
        exerciseIcon: selectedExercise.icon,
        exerciseMet: String(selectedExercise.met),
        bonus: bonus,
      },
    });
    setSelectedExercise(null);
  }, [selectedExercise, bonus, router, activeWorkout, t]);

  const handleManualLog = useCallback(() => {
    setManualExercise("");
    setManualDuration("");
    setShowManualLog(true);
  }, []);

  const handleManualLogSubmit = useCallback(() => {
    if (!manualExercise.trim()) {
      Alert.alert(t.required, t.pleaseEnterExercise);
      return;
    }
    const dur = parseInt(manualDuration, 10);
    if (isNaN(dur) || dur <= 0) {
      Alert.alert(t.required, t.pleaseEnterValidDuration);
      return;
    }
    const weight = parseInt(manualWeight, 10) || 70;
    const estimatedMet = 5;
    const exp = Math.round(estimatedMet * 3.5 * weight * dur / 200);
    logWorkoutToContext({
      exercise: manualExercise.trim(),
      duration: dur,
      expEarned: exp,
    });
    setShowManualLog(false);
    Alert.alert(t.workoutLoggedTitle, tr("workoutLoggedMessage", { exercise: manualExercise.trim(), duration: String(dur), exp: String(exp) }));
  }, [manualExercise, manualDuration, manualWeight, logWorkoutToContext, t, tr]);

  const handleSyncSteps = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      // Check if pedometer is available on this device
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          t.stepsSyncUnavailableTitle || "Pedometer Unavailable",
          t.stepsSyncUnavailableMessage || "Step counting is not available on this device. Please ensure you have granted motion permissions in Settings."
        );
        return;
      }
      // Request permissions if needed
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          t.stepsSyncPermissionTitle || "Permission Required",
          t.stepsSyncPermissionMessage || "Please grant motion & fitness permission in Settings to sync steps."
        );
        return;
      }
      // Get today's steps from midnight to now
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, end);
      const realSteps = result?.steps || 0;
      // Calculate delta: real steps minus what we already have
      const delta = Math.max(0, realSteps - steps);
      if (delta > 0) {
        syncStepsToContext(delta);
      }
      Alert.alert(
        t.stepsSyncedTitle,
        tr("stepsSyncedRealMessage", { steps: realSteps.toLocaleString(), synced: delta.toLocaleString() })
      );
    } catch (error: any) {
      // Pedometer not available (e.g. web or Expo Go without native module)
      Alert.alert(
        t.stepsSyncUnavailableTitle || "Pedometer Unavailable",
        t.stepsSyncUnavailableMessage || "Step counting is not available in this environment. It requires a native iOS/Android build."
      );
    }
  }, [syncStepsToContext, steps, t, tr]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>{t.tabWorkout}</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>{t.startTraining} 💪</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleManualLog}
                activeOpacity={0.8}
              >
                <Text style={styles.headerBtnIcon}>📝</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleSyncSteps}
                activeOpacity={0.8}
              >
                <Text style={styles.headerBtnIcon}>👣</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Workout Type Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterScroll}
          >
            {WORKOUT_TYPES.map((wt) => (
              <TouchableOpacity
                key={wt.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selectedType === wt.key ? colors.primary : colors.surface,
                    borderColor: selectedType === wt.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedType(wt.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: selectedType === wt.key ? "#fff" : colors.muted }]}>
                  {wt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercise Grid */}
          <View style={styles.exerciseGrid}>
            {filteredExercises.map((exercise) => {
              const isSelected = selectedExercise?.id === exercise.id;
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleExercisePress(exercise)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
                  <Text style={[styles.exerciseName, { color: colors.foreground }]}>{exercise.name}</Text>
                  <Text style={[styles.exerciseCategory, { color: colors.muted }]}>
                    {exercise.category === "Running" ? t.running : exercise.category === "Weight Training" ? t.weightTraining : exercise.category === "Yoga" ? t.yoga : t.basketball}
                  </Text>
                  <Text style={[styles.exerciseMet, { color: colors.primary }]}>⚡ MET {exercise.met}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Exercise Detail Panel — no duration slider, just bonus + start */}
          {selectedExercise && (
            <View style={[styles.detailPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Exercise Header */}
              <View style={styles.detailHeader}>
                <Text style={styles.detailIcon}>{selectedExercise.icon}</Text>
                <Text style={[styles.detailName, { color: colors.foreground }]}>{selectedExercise.name}</Text>
              </View>

              {/* Info text — no preset duration */}
              <Text style={[styles.infoText, { color: colors.muted }]}>
                {t.openTimerHint || "Timer starts when you begin. Finish when you're done!"}
              </Text>

              {/* Bonus Section */}
              <Text style={[styles.bonusTitle, { color: colors.foreground }]}>{t.bonus}</Text>
              <View style={styles.bonusRow}>
                <TouchableOpacity
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: bonus === "outdoor" ? "#DCFCE7" : colors.background,
                      borderColor: bonus === "outdoor" ? colors.primary : colors.border,
                      borderWidth: bonus === "outdoor" ? 2 : 1,
                    },
                  ]}
                  onPress={() => setBonus(bonus === "outdoor" ? "none" : "outdoor")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bonusIconText}>📍</Text>
                  <View>
                    <Text style={[styles.bonusName, { color: colors.foreground }]}>{t.outdoor}</Text>
                    <Text style={[styles.bonusMultiplier, { color: colors.primary }]}>x1.5</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: bonus === "gym" ? "#DCFCE7" : colors.background,
                      borderColor: bonus === "gym" ? colors.primary : colors.border,
                      borderWidth: bonus === "gym" ? 2 : 1,
                    },
                  ]}
                  onPress={() => setBonus(bonus === "gym" ? "none" : "gym")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bonusIconText}>🏋️</Text>
                  <View>
                    <Text style={[styles.bonusName, { color: colors.foreground }]}>{t.gym}</Text>
                    <Text style={[styles.bonusMultiplier, { color: colors.primary }]}>x2.0</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Start Training Button */}
              <TouchableOpacity onPress={handleStartTraining} activeOpacity={0.8}>
                <LinearGradient
                  colors={["#F97316", "#EF4444"] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startBtn}
                >
                  <Text style={styles.startBtnIcon}>▶</Text>
                  <Text style={styles.startBtnText}>{t.startTraining}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Recent Workouts */}
          {workoutLogs.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.recentWorkouts}</Text>
              {workoutLogs.slice(0, 5).map((log, index) => (
                <View key={index} style={[styles.logItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.logInfo}>
                    <Text style={[styles.logName, { color: colors.foreground }]}>{log.exercise}</Text>
                    <Text style={[styles.logDuration, { color: colors.muted }]}>{log.duration} {t.minutes}</Text>
                  </View>
                  <Text style={[styles.logExp, { color: colors.primary }]}>+{log.exp} EXP</Text>
                </View>
              ))}
            </>
          )}

          {/* Bottom Stats */}
          <View style={[styles.bottomStats, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.bottomStatItem}>
              <Text style={styles.bottomStatIcon}>📈</Text>
              <Text style={[styles.bottomStatLabel, { color: colors.muted }]}>{t.tabWorkout}</Text>
            </View>
          </View>
          <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{completedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>{t.completed}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalExp}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>EXP</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{steps.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>{t.steps}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Manual Log Modal */}
      <Modal visible={showManualLog} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.manualWorkoutLog}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{t.logWorkoutManually}</Text>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>{t.exerciseName}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder={t.exercisePlaceholder}
              placeholderTextColor={colors.muted}
              value={manualExercise}
              onChangeText={setManualExercise}
            />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>{t.durationMinutes}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder={t.durationPlaceholderShort}
              placeholderTextColor={colors.muted}
              value={manualDuration}
              onChangeText={setManualDuration}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>{t.bodyWeight}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder={t.weightPlaceholder}
              placeholderTextColor={colors.muted}
              value={manualWeight}
              onChangeText={setManualWeight}
              keyboardType="numeric"
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleManualLogSubmit}>
              <Text style={styles.submitText}>{t.logWorkout}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowManualLog(false)}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 2 },
  headerBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerBtnIcon: { fontSize: 20 },

  filterScroll: { maxHeight: 44 },
  filterRow: { gap: 8, paddingVertical: 2, alignItems: "center" },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, height: 36, justifyContent: "center" },
  filterText: { fontSize: 13, fontWeight: "600" },

  exerciseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  exerciseCard: { width: "47%", padding: 16, borderRadius: 16, gap: 4 },
  exerciseIcon: { fontSize: 32 },
  exerciseName: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  exerciseCategory: { fontSize: 12 },
  exerciseMet: { fontSize: 12, fontWeight: "700", marginTop: 2 },

  detailPanel: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 16 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIcon: { fontSize: 28 },
  detailName: { fontSize: 22, fontWeight: "800" },
  infoText: { fontSize: 14, lineHeight: 20 },

  bonusTitle: { fontSize: 16, fontWeight: "700" },
  bonusRow: { flexDirection: "row", gap: 12 },
  bonusCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14 },
  bonusIconText: { fontSize: 22 },
  bonusName: { fontSize: 14, fontWeight: "600" },
  bonusMultiplier: { fontSize: 13, fontWeight: "700" },

  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16 },
  startBtnIcon: { color: "#fff", fontSize: 18 },
  startBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  logItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  logInfo: { gap: 2 },
  logName: { fontSize: 15, fontWeight: "600" },
  logDuration: { fontSize: 12 },
  logExp: { fontSize: 14, fontWeight: "700" },

  bottomStats: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderBottomWidth: 0 },
  bottomStatIcon: { fontSize: 18 },
  bottomStatLabel: { fontSize: 14, fontWeight: "600" },
  bottomStatItem: { flexDirection: "row", alignItems: "center", gap: 6 },

  statsRow: { flexDirection: "row", borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 16, borderWidth: 1, borderTopWidth: 0 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 36, alignSelf: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 4 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  submitBtn: { padding: 16, borderRadius: 16, alignItems: "center", marginTop: 4 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600" },
});
