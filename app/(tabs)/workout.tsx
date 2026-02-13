import { useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

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

// Sample data for demo
const SAMPLE_LOGS: WorkoutLog[] = [
  { exercise: "Running", duration: 30, exp: 294, timestamp: new Date(Date.now() - 3600000) },
  { exercise: "Bench Press", duration: 45, exp: 331, timestamp: new Date(Date.now() - 86400000) },
  { exercise: "Swimming", duration: 25, exp: 214, timestamp: new Date(Date.now() - 172800000) },
];

const MONSTER_IMAGES: Record<string, any> = {
  "Bodybuilder-1": require("@/assets/monsters/bodybuilder-stage1.png"),
};

const MONSTER_GRADIENTS: Record<string, readonly [string, string]> = {
  Bodybuilder: ["#DCFCE7", "#BBF7D0"],
};

export default function WorkoutScreen() {
  const colors = useColors();
  const [selectedType, setSelectedType] = useState("All");
  const [totalExp, setTotalExp] = useState(839);
  const [completedCount, setCompletedCount] = useState(3);
  const [steps, setSteps] = useState(4280);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(SAMPLE_LOGS);

  // Manual Log Modal
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualExercise, setManualExercise] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [manualWeight, setManualWeight] = useState("70");

  // Active Workout Timer
  const [activeWorkout, setActiveWorkout] = useState<{ exercise: typeof EXERCISES[0]; startTime: Date } | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerDuration, setTimerDuration] = useState("");

  const filteredExercises = selectedType === "All" ? EXERCISES : EXERCISES.filter((e) => e.category === selectedType);

  const handleExercisePress = useCallback((exercise: typeof EXERCISES[0]) => {
    Alert.alert(
      exercise.name,
      `MET Value: ${exercise.met}\n\nHow would you like to log this workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Quick Log (30 min)",
          onPress: () => {
            const exp = Math.round(exercise.met * 3.5 * 70 * 30 / 200);
            setTotalExp((prev) => prev + exp);
            setCompletedCount((prev) => prev + 1);
            setWorkoutLogs((prev) => [{ exercise: exercise.name, duration: 30, exp, timestamp: new Date() }, ...prev]);
            Alert.alert("Workout Logged! 💪", `${exercise.name} - 30 min\n+${exp} EXP earned!`);
          },
        },
        {
          text: "Custom Duration",
          onPress: () => {
            setActiveWorkout({ exercise, startTime: new Date() });
            setTimerDuration("");
            setShowTimerModal(true);
          },
        },
      ]
    );
  }, []);

  const handleTimerConfirm = useCallback(() => {
    if (!activeWorkout || !timerDuration) return;
    const duration = parseInt(timerDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert("Invalid Duration", "Please enter a valid number of minutes.");
      return;
    }
    const weight = parseInt(manualWeight, 10) || 70;
    const exp = Math.round(activeWorkout.exercise.met * 3.5 * weight * duration / 200);
    setTotalExp((prev) => prev + exp);
    setCompletedCount((prev) => prev + 1);
    setWorkoutLogs((prev) => [{ exercise: activeWorkout.exercise.name, duration, exp, timestamp: new Date() }, ...prev]);
    setShowTimerModal(false);
    setActiveWorkout(null);
    Alert.alert("Workout Logged! 💪", `${activeWorkout.exercise.name} - ${duration} min\n+${exp} EXP earned!`);
  }, [activeWorkout, timerDuration, manualWeight]);

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
    const duration = parseInt(manualDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert("Required", "Please enter a valid duration in minutes.");
      return;
    }
    const weight = parseInt(manualWeight, 10) || 70;
    const estimatedMet = 5;
    const exp = Math.round(estimatedMet * 3.5 * weight * duration / 200);
    setTotalExp((prev) => prev + exp);
    setCompletedCount((prev) => prev + 1);
    setWorkoutLogs((prev) => [{ exercise: manualExercise.trim(), duration, exp, timestamp: new Date() }, ...prev]);
    setShowManualLog(false);
    Alert.alert("Workout Logged! 💪", `${manualExercise.trim()} - ${duration} min\n+${exp} EXP earned!`);
  }, [manualExercise, manualDuration, manualWeight]);

  const handleSyncSteps = useCallback(() => {
    const simulatedSteps = Math.floor(Math.random() * 3000) + 1000;
    setSteps((prev) => {
      const newSteps = prev + simulatedSteps;
      Alert.alert(
        "Steps Synced! 👣",
        `+${simulatedSteps.toLocaleString()} steps synced\nTotal: ${newSteps.toLocaleString()} steps\n\nOn a real device, this will sync from Apple Health / Google Fit.`
      );
      return newSteps;
    });
  }, []);

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
            <View style={[styles.expBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.expText}>{totalExp} EXP</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleManualLog}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={[styles.actionText, { color: colors.foreground }]}>Manual Log</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleSyncSteps}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>👣</Text>
              <Text style={[styles.actionText, { color: colors.foreground }]}>Sync Steps</Text>
            </TouchableOpacity>
          </View>

          {/* Monster Card - compact */}
          <View style={[styles.monsterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient colors={["#DCFCE7", "#BBF7D0"]} style={styles.monsterThumb}>
              <Image source={MONSTER_IMAGES["Bodybuilder-1"]} style={styles.monsterImg} contentFit="contain" />
            </LinearGradient>
            <View style={styles.monsterInfo}>
              <Text style={[styles.monsterName, { color: colors.foreground }]}>Flexo</Text>
              <Text style={[styles.monsterLevel, { color: colors.muted }]}>Level 1</Text>
              <Text style={[styles.monsterBest, { color: colors.muted }]}>Best: Weight Training</Text>
            </View>
          </View>

          {/* Workout Type Filters - FIXED: horizontal scroll with fixed height pills */}
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

          {/* Exercise Grid - FIXED: 3 columns with fixed width, no flexGrow */}
          <View style={styles.exerciseGrid}>
            {filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleExercisePress(exercise)}
                activeOpacity={0.7}
              >
                <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
                <Text style={[styles.exerciseName, { color: colors.foreground }]}>{exercise.name}</Text>
                <Text style={[styles.exerciseMet, { color: colors.primary }]}>MET {exercise.met}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
              <Text style={[styles.bottomStatValue, { color: colors.foreground }]}>{completedCount}</Text>
              <Text style={[styles.bottomStatLabel, { color: colors.muted }]}>Completed</Text>
            </View>
            <View style={[styles.bottomStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bottomStatItem}>
              <Text style={[styles.bottomStatValue, { color: colors.primary }]}>{totalExp}</Text>
              <Text style={[styles.bottomStatLabel, { color: colors.muted }]}>EXP Earned</Text>
            </View>
            <View style={[styles.bottomStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bottomStatItem}>
              <Text style={[styles.bottomStatValue, { color: colors.foreground }]}>{steps.toLocaleString()}</Text>
              <Text style={[styles.bottomStatLabel, { color: colors.muted }]}>Steps</Text>
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

      {/* Timer Duration Modal */}
      <Modal visible={showTimerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {activeWorkout?.exercise.name}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              MET: {activeWorkout?.exercise.met} — Enter workout duration
            </Text>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Duration (minutes)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. 45"
              placeholderTextColor={colors.muted}
              value={timerDuration}
              onChangeText={setTimerDuration}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleTimerConfirm}
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleTimerConfirm}>
              <Text style={styles.submitText}>Log Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setShowTimerModal(false); setActiveWorkout(null); }}>
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
  expBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  expText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  actionIcon: { fontSize: 20 },
  actionText: { fontSize: 14, fontWeight: "600" },

  // Monster compact row
  monsterRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, borderWidth: 1, gap: 12 },
  monsterThumb: { width: 60, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  monsterImg: { width: 48, height: 48 },
  monsterInfo: { flex: 1 },
  monsterName: { fontSize: 16, fontWeight: "700" },
  monsterLevel: { fontSize: 13 },
  monsterBest: { fontSize: 12, marginTop: 2 },

  // Filter pills - FIXED: explicit height, no flex stretching
  filterScroll: { maxHeight: 44 },
  filterRow: { gap: 8, paddingVertical: 2, alignItems: "center" },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, height: 36, justifyContent: "center" },
  filterText: { fontSize: 13, fontWeight: "600" },

  // Exercise grid - FIXED: percentage-based width, no flexGrow
  exerciseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  exerciseCard: {
    width: "30.5%",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  exerciseIcon: { fontSize: 32 },
  exerciseName: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  exerciseMet: { fontSize: 12, fontWeight: "700" },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  logItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  logInfo: { gap: 2 },
  logName: { fontSize: 15, fontWeight: "600" },
  logDuration: { fontSize: 12 },
  logExp: { fontSize: 14, fontWeight: "700" },
  bottomStats: { flexDirection: "row", borderRadius: 16, padding: 16, borderWidth: 1 },
  bottomStatItem: { flex: 1, alignItems: "center" },
  bottomStatValue: { fontSize: 22, fontWeight: "800" },
  bottomStatLabel: { fontSize: 12, marginTop: 2 },
  bottomStatDivider: { width: 1, height: 36, alignSelf: "center" },

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
