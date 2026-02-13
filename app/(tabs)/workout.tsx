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
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useActivity } from "@/lib/activity-context";
import { useRouter } from "expo-router";

const WORKOUT_TYPES = ["All", "Running", "Weight Training", "Yoga", "Basketball"];

const EXERCISES = [
  { id: 1, name: "Running", icon: "🏃", met: 8, category: "Running" },
  { id: 2, name: "Cycling", icon: "🚴", met: 7.5, category: "Running" },
  { id: 3, name: "Swimming", icon: "🏊", met: 7, category: "Running" },
  { id: 4, name: "Walking", icon: "🚶", met: 3.5, category: "Running" },
  { id: 5, name: "Hiking", icon: "🥾", met: 6, category: "Running" },
  { id: 6, name: "Jump Rope", icon: "🤸", met: 10, category: "Running" },
  { id: 7, name: "Bench Press", icon: "🏋️", met: 6, category: "Weight Training" },
  { id: 8, name: "Squats", icon: "🦵", met: 5.5, category: "Weight Training" },
  { id: 9, name: "Deadlift", icon: "💪", met: 6, category: "Weight Training" },
  { id: 10, name: "Yoga Flow", icon: "🧘", met: 3, category: "Yoga" },
  { id: 11, name: "Basketball", icon: "🏀", met: 6.5, category: "Basketball" },
];

type WorkoutLog = {
  exercise: string;
  duration: number;
  exp: number;
  timestamp: Date;
};

type BonusType = "none" | "outdoor" | "gym";

// Sample data for demo
const SAMPLE_LOGS: WorkoutLog[] = [
  { exercise: "Running", duration: 30, exp: 294, timestamp: new Date(Date.now() - 3600000) },
  { exercise: "Bench Press", duration: 45, exp: 331, timestamp: new Date(Date.now() - 86400000) },
  { exercise: "Swimming", duration: 25, exp: 214, timestamp: new Date(Date.now() - 172800000) },
];

export default function WorkoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("All");
  const [totalExp, setTotalExp] = useState(839);
  const [completedCount, setCompletedCount] = useState(3);
  const [steps, setSteps] = useState(4280);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(SAMPLE_LOGS);

  // Selected exercise detail
  const [selectedExercise, setSelectedExercise] = useState<typeof EXERCISES[0] | null>(null);
  const [duration, setDuration] = useState(30);
  const [bonus, setBonus] = useState<BonusType>("none");

  // Manual Log Modal
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualExercise, setManualExercise] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [manualWeight, setManualWeight] = useState("70");

  const bodyWeight = 70; // kg default

  const filteredExercises = selectedType === "All" ? EXERCISES : EXERCISES.filter((e) => e.category === selectedType);

  const bonusMultiplier = bonus === "outdoor" ? 1.5 : bonus === "gym" ? 2.0 : 1.0;

  const expGained = useMemo(() => {
    if (!selectedExercise) return 0;
    return Math.round(selectedExercise.met * 3.5 * bodyWeight * duration / 200 * bonusMultiplier);
  }, [selectedExercise, duration, bonusMultiplier]);

  const caloriesBurned = useMemo(() => {
    if (!selectedExercise) return 0;
    return Math.round(selectedExercise.met * 3.5 * bodyWeight * duration / 200);
  }, [selectedExercise, duration]);

  const handleExercisePress = useCallback((exercise: typeof EXERCISES[0]) => {
    setSelectedExercise(exercise);
    setDuration(30);
    setBonus("none");
  }, []);

  const { logWorkout: logWorkoutToContext, syncSteps: syncStepsToContext } = useActivity();

  const handleStartTraining = useCallback(() => {
    if (!selectedExercise) return;
    // Navigate to the workout tracking page with live timer
    router.push({
      pathname: "/workout-tracking" as any,
      params: {
        exerciseName: selectedExercise.name,
        exerciseIcon: selectedExercise.icon,
        exerciseMet: String(selectedExercise.met),
        bonus: bonus,
        targetDuration: String(duration),
      },
    });
    setSelectedExercise(null);
  }, [selectedExercise, duration, bonus, router]);

  const handleManualLog = useCallback(() => {
    setManualExercise("");
    setManualDuration("");
    setShowManualLog(true);
  }, []);

  const handleManualLogSubmit = useCallback(() => {
    if (!manualExercise.trim()) {
      Alert.alert("Required", "Please enter the exercise name.");
      return;
    }
    const dur = parseInt(manualDuration, 10);
    if (isNaN(dur) || dur <= 0) {
      Alert.alert("Required", "Please enter a valid duration in minutes.");
      return;
    }
    const weight = parseInt(manualWeight, 10) || 70;
    const estimatedMet = 5;
    const exp = Math.round(estimatedMet * 3.5 * weight * dur / 200);
    setTotalExp((prev) => prev + exp);
    setCompletedCount((prev) => prev + 1);
    setWorkoutLogs((prev) => [{ exercise: manualExercise.trim(), duration: dur, exp, timestamp: new Date() }, ...prev]);
    // Update shared activity state
    logWorkoutToContext({
      exercise: manualExercise.trim(),
      duration: dur,
      expEarned: exp,
    });
    setShowManualLog(false);
    Alert.alert("Workout Logged! 💪", `${manualExercise.trim()} - ${dur} min\n+${exp} EXP earned!`);
  }, [manualExercise, manualDuration, manualWeight, logWorkoutToContext]);

  const handleSyncSteps = useCallback(() => {
    const simulatedSteps = Math.floor(Math.random() * 3000) + 1000;
    // Update shared activity state for step quests
    syncStepsToContext(simulatedSteps);
    setSteps((prev) => {
      const newSteps = prev + simulatedSteps;
      Alert.alert(
        "Steps Synced! 👣",
        `+${simulatedSteps.toLocaleString()} steps synced\nTotal: ${newSteps.toLocaleString()} steps\n\nOn a real device, this will sync from Apple Health / Google Fit.`
      );
      return newSteps;
    });
  }, [syncStepsToContext]);

  // Slider helpers
  const sliderMin = 5;
  const sliderMax = 120;
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const sliderPosition = sliderWidth > 0 ? ((duration - sliderMin) / (sliderMax - sliderMin)) * sliderWidth : 0;

  const handleSliderTouch = useCallback((pageX: number, layoutX: number) => {
    if (sliderWidth <= 0) return;
    const x = pageX - layoutX;
    const ratio = Math.max(0, Math.min(1, x / sliderWidth));
    const newDuration = Math.round(sliderMin + ratio * (sliderMax - sliderMin));
    setDuration(newDuration);
  }, [sliderWidth]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Workout</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Start Training 💪</Text>
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
            {WORKOUT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selectedType === type ? colors.primary : colors.surface,
                    borderColor: selectedType === type ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedType(type)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: selectedType === type ? "#fff" : colors.muted }]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercise Grid - 2 columns matching screenshot */}
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
                  <Text style={[styles.exerciseCategory, { color: colors.muted }]}>{exercise.category}</Text>
                  <Text style={[styles.exerciseMet, { color: colors.primary }]}>⚡ MET {exercise.met}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Exercise Detail Panel - shown when exercise is selected */}
          {selectedExercise && (
            <View style={[styles.detailPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Exercise Header */}
              <View style={styles.detailHeader}>
                <Text style={styles.detailIcon}>{selectedExercise.icon}</Text>
                <Text style={[styles.detailName, { color: colors.foreground }]}>{selectedExercise.name}</Text>
              </View>

              {/* Duration */}
              <View style={styles.durationRow}>
                <Text style={[styles.durationLabel, { color: colors.muted }]}>⏱ Duration: {duration} min</Text>
              </View>

              {/* Custom Slider */}
              <View style={styles.sliderContainer}>
                <View
                  style={styles.sliderTrackWrapper}
                  onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    setIsDragging(true);
                    const layoutX = e.nativeEvent.locationX;
                    const ratio = Math.max(0, Math.min(1, layoutX / (sliderWidth || 1)));
                    setDuration(Math.round(sliderMin + ratio * (sliderMax - sliderMin)));
                  }}
                  onResponderMove={(e) => {
                    if (!isDragging) return;
                    const touch = e.nativeEvent;
                    // Use locationX relative to the track
                    const ratio = Math.max(0, Math.min(1, touch.locationX / (sliderWidth || 1)));
                    setDuration(Math.round(sliderMin + ratio * (sliderMax - sliderMin)));
                  }}
                  onResponderRelease={() => setIsDragging(false)}
                >
                  {/* Track background */}
                  <View style={[styles.sliderTrack, { backgroundColor: "#D1D5DB" }]} />
                  {/* Track fill */}
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        backgroundColor: colors.primary,
                        width: sliderPosition,
                      },
                    ]}
                  />
                  {/* Thumb */}
                  <View
                    style={[
                      styles.sliderThumb,
                      {
                        backgroundColor: colors.primary,
                        left: sliderPosition - 12,
                      },
                    ]}
                  />
                </View>
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabelText, { color: colors.muted }]}>5 min</Text>
                  <Text style={[styles.sliderLabelText, { color: colors.muted }]}>120 min</Text>
                </View>
              </View>

              {/* Bonus Section */}
              <Text style={[styles.bonusTitle, { color: colors.foreground }]}>Bonus</Text>
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
                  <Text style={styles.bonusIcon}>📍</Text>
                  <View>
                    <Text style={[styles.bonusName, { color: colors.foreground }]}>Outdoor</Text>
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
                  <Text style={styles.bonusIcon}>🏋️</Text>
                  <View>
                    <Text style={[styles.bonusName, { color: colors.foreground }]}>Gym</Text>
                    <Text style={[styles.bonusMultiplier, { color: colors.primary }]}>x2.0</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* EXP & Calories Preview */}
              <View style={[styles.previewCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.foreground }]}>EXP Gained</Text>
                  <Text style={[styles.previewValue, { color: colors.primary }]}>+{expGained}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.foreground }]}>Calories Burned</Text>
                  <Text style={[styles.previewCalories, { color: "#F59E0B" }]}>~{caloriesBurned} kcal</Text>
                </View>
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
                  <Text style={styles.startBtnText}>Start Training</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Recent Workouts */}
          {workoutLogs.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Workouts</Text>
              {workoutLogs.slice(0, 5).map((log, index) => (
                <View key={index} style={[styles.logItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.logInfo}>
                    <Text style={[styles.logName, { color: colors.foreground }]}>{log.exercise}</Text>
                    <Text style={[styles.logDuration, { color: colors.muted }]}>{log.duration} min</Text>
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
              <Text style={[styles.bottomStatLabel, { color: colors.muted }]}>Workout</Text>
            </View>
          </View>
          <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{completedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Completed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalExp}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>EXP</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{steps.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Steps</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Manual Log Modal */}
      <Modal visible={showManualLog} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Manual Workout Log</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Log a workout manually</Text>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Exercise Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. Push-ups, Jogging..."
              placeholderTextColor={colors.muted}
              value={manualExercise}
              onChangeText={setManualExercise}
            />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Duration (minutes)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. 30"
              placeholderTextColor={colors.muted}
              value={manualDuration}
              onChangeText={setManualDuration}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Body Weight (kg)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. 70"
              placeholderTextColor={colors.muted}
              value={manualWeight}
              onChangeText={setManualWeight}
              keyboardType="numeric"
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleManualLogSubmit}>
              <Text style={styles.submitText}>Log Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowManualLog(false)}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
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
  headerBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerBtnIcon: { fontSize: 20 },

  // Filter pills
  filterScroll: { maxHeight: 44 },
  filterRow: { gap: 8, paddingVertical: 2, alignItems: "center" },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, height: 36, justifyContent: "center" },
  filterText: { fontSize: 13, fontWeight: "600" },

  // Exercise grid - 2 columns matching screenshot
  exerciseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  exerciseCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  exerciseIcon: { fontSize: 32 },
  exerciseName: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  exerciseCategory: { fontSize: 12 },
  exerciseMet: { fontSize: 12, fontWeight: "700", marginTop: 2 },

  // Detail panel
  detailPanel: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 16 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIcon: { fontSize: 28 },
  detailName: { fontSize: 22, fontWeight: "800" },

  // Duration
  durationRow: { flexDirection: "row", alignItems: "center" },
  durationLabel: { fontSize: 15, fontWeight: "600" },

  // Custom slider
  sliderContainer: { gap: 6 },
  sliderTrackWrapper: { height: 40, justifyContent: "center", position: "relative" },
  sliderTrack: { height: 6, borderRadius: 3, width: "100%" },
  sliderFill: { height: 6, borderRadius: 3, position: "absolute", top: 17, left: 0 },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: "absolute",
    top: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between" },
  sliderLabelText: { fontSize: 12 },

  // Bonus
  bonusTitle: { fontSize: 16, fontWeight: "700" },
  bonusRow: { flexDirection: "row", gap: 12 },
  bonusCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  bonusIcon: { fontSize: 22 },
  bonusName: { fontSize: 14, fontWeight: "600" },
  bonusMultiplier: { fontSize: 13, fontWeight: "700" },

  // Preview card
  previewCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewLabel: { fontSize: 15, fontWeight: "600" },
  previewValue: { fontSize: 20, fontWeight: "800" },
  previewCalories: { fontSize: 16, fontWeight: "700" },

  // Start Training button
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16 },
  startBtnIcon: { color: "#fff", fontSize: 18 },
  startBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },

  // Section title
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 4 },

  // Log items
  logItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  logInfo: { gap: 2 },
  logName: { fontSize: 15, fontWeight: "600" },
  logDuration: { fontSize: 12 },
  logExp: { fontSize: 14, fontWeight: "700" },

  // Bottom stats
  bottomStats: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderBottomWidth: 0 },
  bottomStatIcon: { fontSize: 18 },
  bottomStatLabel: { fontSize: 14, fontWeight: "600" },
  bottomStatItem: { flexDirection: "row", alignItems: "center", gap: 6 },

  statsRow: { flexDirection: "row", borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 16, borderWidth: 1, borderTopWidth: 0 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 36, alignSelf: "center" },

  // Modal styles
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
