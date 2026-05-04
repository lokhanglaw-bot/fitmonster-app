import { useState, useMemo, useCallback, useRef } from "react";
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
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useActivity, type WorkoutLogEntry, type WorkoutExerciseDetail } from "@/lib/activity-context";
import { useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n-context";
import { useWorkoutTimer } from "@/lib/workout-timer-context";
import * as Haptics from "expo-haptics";
import { Pedometer } from "expo-sensors";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateKey(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Personal Records ─────────────────────────────────────────────────────────

interface PersonalRecord {
  exerciseName: string;
  exerciseNameZh?: string;
  maxWeight: number;
  maxReps: number;
  maxVolume: number; // single set volume (weight * reps)
  lastDate: string;
}

function computePersonalRecords(logs: WorkoutLogEntry[]): PersonalRecord[] {
  const prMap: Record<string, PersonalRecord> = {};

  for (const log of logs) {
    // Handle logs with detailed exercises array
    if (log.exercises && log.exercises.length > 0) {
      for (const ex of log.exercises) {
        const key = ex.exerciseName;
        if (!prMap[key]) {
          prMap[key] = {
            exerciseName: ex.exerciseName,
            exerciseNameZh: ex.exerciseNameZh,
            maxWeight: 0,
            maxReps: 0,
            maxVolume: 0,
            lastDate: log.timestamp,
          };
        }
        for (const set of ex.sets) {
          const w = set.weight || 0;
          const r = set.reps || 0;
          if (w > prMap[key].maxWeight) prMap[key].maxWeight = w;
          if (r > prMap[key].maxReps) prMap[key].maxReps = r;
          const vol = w * r;
          if (vol > prMap[key].maxVolume) prMap[key].maxVolume = vol;
        }
        prMap[key].lastDate = log.timestamp;
      }
    } else if (log.exercise && log.totalVolume) {
      // Handle legacy logs without exercises array but with volume data
      // Parse exercise names from comma-separated string
      const names = log.exercise.split(", ").filter(Boolean);
      for (const name of names) {
        const key = name;
        if (!prMap[key]) {
          prMap[key] = {
            exerciseName: name,
            maxWeight: 0,
            maxReps: 0,
            maxVolume: 0,
            lastDate: log.timestamp,
          };
        }
        prMap[key].lastDate = log.timestamp;
      }
    }
  }

  // Filter out records with no actual weight/reps data
  return Object.values(prMap)
    .filter(pr => pr.maxWeight > 0 || pr.maxReps > 0 || pr.maxVolume > 0)
    .sort((a, b) => b.maxWeight - a.maxWeight);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, tr, language } = useI18n();
  const { activeWorkout } = useWorkoutTimer();
  const { state: activityState, logWorkout: logWorkoutToContext, setSteps: setStepsToContext } = useActivity();

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Manual log modal
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualExercise, setManualExercise] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [manualWeight, setManualWeight] = useState("70");

  // Compute workout dates map
  const workoutDatesMap = useMemo(() => {
    const map: Record<string, WorkoutLogEntry[]> = {};
    for (const log of activityState.allWorkoutLogs) {
      const key = getDateKey(log.timestamp);
      if (!map[key]) map[key] = [];
      map[key].push(log);
    }
    return map;
  }, [activityState.allWorkoutLogs]);

  // Personal records
  const personalRecords = useMemo(
    () => computePersonalRecords(activityState.allWorkoutLogs),
    [activityState.allWorkoutLogs]
  );

  // Selected date logs
  const selectedDateLogs = useMemo(() => {
    if (!selectedDate) return [];
    return workoutDatesMap[selectedDate] || [];
  }, [selectedDate, workoutDatesMap]);

  // Calendar data
  const { firstDay, daysInMonth } = useMemo(
    () => getMonthDays(calYear, calMonth),
    [calYear, calMonth]
  );

  const monthLabel = useMemo(() => {
    const months_en = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const months_zh = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    const m = language === "zh" ? months_zh : months_en;
    return `${m[calMonth]} ${calYear}`;
  }, [calYear, calMonth, language]);

  const weekHeaders = useMemo(() => {
    return language === "zh"
      ? ["日", "一", "二", "三", "四", "五", "六"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }, [language]);

  const todayKey = formatDate(today);

  // Navigation
  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  // Manual log
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
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          t.stepsSyncUnavailableTitle || "Pedometer Unavailable",
          t.stepsSyncUnavailableMessage || "Step counting is not available on this device."
        );
        return;
      }
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          t.stepsSyncPermissionTitle || "Permission Required",
          t.stepsSyncPermissionMessage || "Please grant motion & fitness permission."
        );
        return;
      }
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, end);
      const realSteps = result?.steps || 0;
      setStepsToContext(realSteps);
      Alert.alert(
        t.stepsSyncedTitle,
        tr("stepsSyncedRealMessage", { steps: realSteps.toLocaleString(), synced: realSteps.toLocaleString() })
      );
    } catch {
      Alert.alert(
        t.stepsSyncUnavailableTitle || "Pedometer Unavailable",
        t.stepsSyncUnavailableMessage || "Step counting is not available in this environment."
      );
    }
  }, [setStepsToContext, t, tr]);

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

          {/* Set Tracking Mode Entry */}
          <TouchableOpacity
            onPress={() => {
              if (activeWorkout) {
                Alert.alert(
                  t.workoutInProgress,
                  t.finishCurrentWorkout || "Please finish or cancel your current workout first.",
                  [{ text: t.ok }]
                );
                return;
              }
              router.push("/workout-sets" as any);
            }}
            style={[styles.setTrackingEntry, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 24 }}>🏋️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                  {language === "zh" ? "組數追蹤模式" : "Set Tracking Mode"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {language === "zh" ? "逐組記錄重量 × 次數，自動休息計時" : "Log weight × reps per set, auto rest timer"}
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: colors.primary }}>▶</Text>
            </View>
          </TouchableOpacity>

          {/* ── Calendar ────────────────────────────────────────────────── */}
          <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Month navigation */}
            <View style={styles.calNavRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                <Text style={{ fontSize: 18, color: colors.primary }}>◀</Text>
              </TouchableOpacity>
              <Text style={[styles.calMonthLabel, { color: colors.foreground }]}>{monthLabel}</Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                <Text style={{ fontSize: 18, color: colors.primary }}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Week headers */}
            <View style={styles.calWeekRow}>
              {weekHeaders.map((d) => (
                <Text key={d} style={[styles.calWeekDay, { color: colors.muted }]}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.calGrid}>
              {/* Empty cells for first day offset */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calDayCell} />
              ))}
              {/* Actual days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasWorkout = !!workoutDatesMap[dateKey];
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={[
                      styles.calDayCell,
                      isToday && { borderWidth: 2, borderColor: colors.primary, borderRadius: 8 },
                      isSelected && { backgroundColor: colors.primary + "20", borderRadius: 8 },
                    ]}
                    onPress={() => setSelectedDate(dateKey === selectedDate ? null : dateKey)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.calDayText,
                      { color: isToday ? colors.primary : colors.foreground },
                      isSelected && { fontWeight: "800" },
                    ]}>
                      {day}
                    </Text>
                    {hasWorkout && (
                      <View style={[styles.calDot, { backgroundColor: colors.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selected date workout details */}
          {selectedDate && selectedDateLogs.length > 0 && (
            <View style={[styles.dayDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.dayDetailTitle, { color: colors.foreground }]}>
                {selectedDate} — {selectedDateLogs.length} {language === "zh" ? "次訓練" : "workout(s)"}
              </Text>
              {selectedDateLogs.map((log, idx) => (
                <View key={log.id || idx} style={[styles.dayLogItem, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dayLogName, { color: colors.foreground }]}>
                      {log.exercises && log.exercises.length > 0
                        ? log.exercises.map(ex => language === "zh" ? (ex.exerciseNameZh || ex.exerciseName) : ex.exerciseName).join(", ")
                        : log.exercise}
                    </Text>
                    <Text style={[styles.dayLogMeta, { color: colors.muted }]}>
                      {log.duration} {language === "zh" ? "分鐘" : "min"}
                      {log.totalVolume ? ` · ${log.totalVolume.toLocaleString()} kg` : ""}
                      {log.totalSets ? ` · ${log.totalSets} ${language === "zh" ? "組" : "sets"}` : ""}
                    </Text>
                    {/* Show exercise details if available */}
                    {log.exercises && log.exercises.map((ex, exIdx) => (
                      <View key={exIdx} style={styles.dayExDetail}>
                        <Text style={[styles.dayExName, { color: colors.foreground }]}>
                          {language === "zh" ? (ex.exerciseNameZh || ex.exerciseName) : ex.exerciseName}
                        </Text>
                        {ex.sets.map((set, sIdx) => (
                          <Text key={sIdx} style={[styles.daySetText, { color: colors.muted }]}>
                            {language === "zh" ? "第" : "Set "}{set.setNumber}{language === "zh" ? "組: " : ": "}
                            {set.weight ? `${set.weight}kg` : "—"} × {set.reps || "—"}
                            {set.rpe ? ` @RPE${set.rpe}` : ""}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.dayLogExp, { color: colors.primary }]}>+{log.expEarned} EXP</Text>
                </View>
              ))}
            </View>
          )}

          {selectedDate && selectedDateLogs.length === 0 && (
            <View style={[styles.dayDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.dayDetailEmpty, { color: colors.muted }]}>
                {language === "zh" ? "這天沒有訓練記錄" : "No workout on this day"}
              </Text>
            </View>
          )}

          {/* ── Personal Records ──────────────────────────────────────── */}
          <View style={styles.prSection}>
            <Text style={[styles.prTitle, { color: colors.foreground }]}>
              🏆 {language === "zh" ? "個人紀錄" : "Personal Records"}
            </Text>

            {personalRecords.length === 0 ? (
              <View style={[styles.prEmptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 36 }}>🎯</Text>
                <Text style={[styles.prEmptyText, { color: colors.muted }]}>
                  {language === "zh"
                    ? "完成組數追蹤訓練後，你的個人紀錄會顯示在這裡"
                    : "Complete a set tracking workout to see your PRs here"}
                </Text>
              </View>
            ) : (
              personalRecords.slice(0, 10).map((pr, idx) => (
                <View key={pr.exerciseName} style={[styles.prCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.prCardHeader}>
                    <View style={[styles.prRank, { backgroundColor: idx < 3 ? "#FEF3C7" : colors.background }]}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: idx < 3 ? "#92400E" : colors.muted }}>
                        #{idx + 1}
                      </Text>
                    </View>
                    <Text style={[styles.prExName, { color: colors.foreground }]}>
                      {language === "zh" ? (pr.exerciseNameZh || pr.exerciseName) : pr.exerciseName}
                    </Text>
                  </View>
                  <View style={styles.prStatsRow}>
                    <View style={styles.prStatBox}>
                      <Text style={[styles.prStatValue, { color: colors.primary }]}>{pr.maxWeight}</Text>
                      <Text style={[styles.prStatLabel, { color: colors.muted }]}>
                        {language === "zh" ? "最大重量" : "Max Weight"}
                      </Text>
                    </View>
                    <View style={styles.prStatBox}>
                      <Text style={[styles.prStatValue, { color: colors.primary }]}>{pr.maxReps}</Text>
                      <Text style={[styles.prStatLabel, { color: colors.muted }]}>
                        {language === "zh" ? "最多次數" : "Max Reps"}
                      </Text>
                    </View>
                    <View style={styles.prStatBox}>
                      <Text style={[styles.prStatValue, { color: colors.primary }]}>{pr.maxVolume}</Text>
                      <Text style={[styles.prStatLabel, { color: colors.muted }]}>
                        {language === "zh" ? "最大單組量" : "Best Set Vol"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
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

  setTrackingEntry: { padding: 14, borderRadius: 14, borderWidth: 1.5 },

  // Calendar
  calendarCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  calNavRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  calNavBtn: { padding: 8 },
  calMonthLabel: { fontSize: 17, fontWeight: "700" },
  calWeekRow: { flexDirection: "row", marginTop: 8 },
  calWeekDay: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDayCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  calDayText: { fontSize: 14, fontWeight: "500" },
  calDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  // Day detail
  dayDetailCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  dayDetailTitle: { fontSize: 15, fontWeight: "700" },
  dayDetailEmpty: { fontSize: 14, textAlign: "center", paddingVertical: 16 },
  dayLogItem: { borderTopWidth: 0.5, paddingTop: 10, flexDirection: "row", alignItems: "flex-start" },
  dayLogName: { fontSize: 14, fontWeight: "700" },
  dayLogMeta: { fontSize: 12, marginTop: 2 },
  dayLogExp: { fontSize: 13, fontWeight: "700" },
  dayExDetail: { marginTop: 6, marginLeft: 8 },
  dayExName: { fontSize: 13, fontWeight: "600" },
  daySetText: { fontSize: 11, marginTop: 1 },

  // Personal Records
  prSection: { gap: 12 },
  prTitle: { fontSize: 18, fontWeight: "800" },
  prEmptyCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  prEmptyText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  prCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  prCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  prRank: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  prExName: { fontSize: 15, fontWeight: "700" },
  prStatsRow: { flexDirection: "row", justifyContent: "space-around" },
  prStatBox: { alignItems: "center", gap: 2 },
  prStatValue: { fontSize: 18, fontWeight: "800" },
  prStatLabel: { fontSize: 10 },

  // Modal
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
