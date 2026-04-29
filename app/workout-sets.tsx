import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  FlatList,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useActivity } from "@/lib/activity-context";
import { useCaring } from "@/lib/caring-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useI18n } from "@/lib/i18n-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SetTrackerCard } from "@/components/set-tracker-card";
import { RestTimerSheet } from "@/components/rest-timer-sheet";
import type { WorkoutSetData, SetType, ExerciseBlock, ExerciseCategory } from "@/types/workout";

// Exercise library for quick search
const EXERCISE_LIBRARY: Array<{
  name: string;
  nameZh: string;
  category: ExerciseCategory;
  muscleGroup: string;
  equipment: string;
}> = [
  // Chest
  { name: "Bench Press", nameZh: "臥推", category: "chest", muscleGroup: "chest", equipment: "barbell" },
  { name: "Incline Bench Press", nameZh: "上斜臥推", category: "chest", muscleGroup: "chest", equipment: "barbell" },
  { name: "Dumbbell Fly", nameZh: "啞鈴飛鳥", category: "chest", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Cable Crossover", nameZh: "纜繩夾胸", category: "chest", muscleGroup: "chest", equipment: "cable" },
  { name: "Push-up", nameZh: "伏地挺身", category: "chest", muscleGroup: "chest", equipment: "bodyweight" },
  { name: "Dips", nameZh: "雙槓撐體", category: "chest", muscleGroup: "chest", equipment: "bodyweight" },
  // Back
  { name: "Deadlift", nameZh: "硬舉", category: "back", muscleGroup: "back", equipment: "barbell" },
  { name: "Barbell Row", nameZh: "槓鈴划船", category: "back", muscleGroup: "back", equipment: "barbell" },
  { name: "Pull-up", nameZh: "引體向上", category: "back", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Lat Pulldown", nameZh: "滑輪下拉", category: "back", muscleGroup: "back", equipment: "cable" },
  { name: "Seated Row", nameZh: "坐姿划船", category: "back", muscleGroup: "back", equipment: "cable" },
  { name: "T-Bar Row", nameZh: "T槓划船", category: "back", muscleGroup: "back", equipment: "barbell" },
  // Legs
  { name: "Squat", nameZh: "深蹲", category: "legs", muscleGroup: "legs", equipment: "barbell" },
  { name: "Leg Press", nameZh: "腿推", category: "legs", muscleGroup: "legs", equipment: "machine" },
  { name: "Romanian Deadlift", nameZh: "羅馬尼亞硬舉", category: "legs", muscleGroup: "legs", equipment: "barbell" },
  { name: "Leg Extension", nameZh: "腿伸展", category: "legs", muscleGroup: "legs", equipment: "machine" },
  { name: "Leg Curl", nameZh: "腿彎舉", category: "legs", muscleGroup: "legs", equipment: "machine" },
  { name: "Calf Raise", nameZh: "提踵", category: "legs", muscleGroup: "legs", equipment: "machine" },
  { name: "Bulgarian Split Squat", nameZh: "保加利亞分腿蹲", category: "legs", muscleGroup: "legs", equipment: "dumbbell" },
  { name: "Hip Thrust", nameZh: "臀推", category: "legs", muscleGroup: "legs", equipment: "barbell" },
  // Shoulders
  { name: "Overhead Press", nameZh: "肩推", category: "shoulders", muscleGroup: "shoulders", equipment: "barbell" },
  { name: "Lateral Raise", nameZh: "側平舉", category: "shoulders", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Front Raise", nameZh: "前平舉", category: "shoulders", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Face Pull", nameZh: "面拉", category: "shoulders", muscleGroup: "shoulders", equipment: "cable" },
  { name: "Arnold Press", nameZh: "阿諾德推舉", category: "shoulders", muscleGroup: "shoulders", equipment: "dumbbell" },
  // Arms
  { name: "Barbell Curl", nameZh: "槓鈴彎舉", category: "arms", muscleGroup: "arms", equipment: "barbell" },
  { name: "Hammer Curl", nameZh: "錘式彎舉", category: "arms", muscleGroup: "arms", equipment: "dumbbell" },
  { name: "Tricep Pushdown", nameZh: "三頭下壓", category: "arms", muscleGroup: "arms", equipment: "cable" },
  { name: "Skull Crusher", nameZh: "仰臥臂屈伸", category: "arms", muscleGroup: "arms", equipment: "barbell" },
  { name: "Preacher Curl", nameZh: "牧師椅彎舉", category: "arms", muscleGroup: "arms", equipment: "barbell" },
  // Core
  { name: "Plank", nameZh: "棒式", category: "core", muscleGroup: "core", equipment: "bodyweight" },
  { name: "Crunch", nameZh: "捲腹", category: "core", muscleGroup: "core", equipment: "bodyweight" },
  { name: "Hanging Leg Raise", nameZh: "懸吊舉腿", category: "core", muscleGroup: "core", equipment: "bodyweight" },
  { name: "Cable Woodchop", nameZh: "纜繩砍劈", category: "core", muscleGroup: "core", equipment: "cable" },
  { name: "Ab Wheel Rollout", nameZh: "健腹輪", category: "core", muscleGroup: "core", equipment: "bodyweight" },
];

const CATEGORY_LABELS: Record<string, string> = {
  chest: "胸", back: "背", legs: "腿", shoulders: "肩", arms: "手臂", core: "核心",
};

export default function WorkoutSetsScreen() {
  useKeepAwake();
  const router = useRouter();
  const colors = useColors();
  const { t, tr } = useI18n();
  const insets = useSafeAreaInsets();
  const { logWorkout } = useActivity();
  const { exerciseMonster } = useCaring();

  // Exercise blocks (each block = one exercise with multiple sets)
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDefault, setRestTimerDefault] = useState(90);

  // Workout timer
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  const formatTime = useCallback((totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Filter exercises for picker
  const filteredExercises = useMemo(() => {
    let list = EXERCISE_LIBRARY;
    if (selectedCategory !== "all") {
      list = list.filter((e) => e.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || e.nameZh.includes(q)
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  // Add exercise block
  const handleAddExercise = useCallback(
    (exercise: (typeof EXERCISE_LIBRARY)[0]) => {
      const newBlock: ExerciseBlock = {
        exerciseName: exercise.name,
        exerciseNameZh: exercise.nameZh,
        category: exercise.category,
        muscleGroup: exercise.muscleGroup,
        sets: [],
      };
      setBlocks((prev) => [...prev, newBlock]);
      setShowExercisePicker(false);
      setSearchQuery("");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    []
  );

  // Add set to a block
  const handleAddSet = useCallback((blockIndex: number) => {
    setBlocks((prev) => {
      const updated = [...prev];
      const block = { ...updated[blockIndex] };
      const nextSetNum = block.sets.length + 1;
      block.sets = [
        ...block.sets,
        {
          setNumber: nextSetNum,
          setType: "working" as SetType,
          isPR: false,
        },
      ];
      updated[blockIndex] = block;
      return updated;
    });
  }, []);

  // Complete a set
  const handleSetComplete = useCallback(
    (blockIndex: number, setIndex: number, data: WorkoutSetData) => {
      setBlocks((prev) => {
        const updated = [...prev];
        const block = { ...updated[blockIndex] };
        const sets = [...block.sets];
        sets[setIndex] = data;
        block.sets = sets;
        updated[blockIndex] = block;
        return updated;
      });
      // Auto-show rest timer after completing a set
      setRestTimerDefault(90);
      setShowRestTimer(true);
    },
    []
  );

  // Remove a set
  const handleRemoveSet = useCallback(
    (blockIndex: number, setIndex: number) => {
      setBlocks((prev) => {
        const updated = [...prev];
        const block = { ...updated[blockIndex] };
        block.sets = block.sets.filter((_, i) => i !== setIndex);
        // Renumber
        block.sets = block.sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
        updated[blockIndex] = block;
        return updated;
      });
    },
    []
  );

  // Remove exercise block
  const handleRemoveBlock = useCallback((blockIndex: number) => {
    Alert.alert("移除動作", "確定要移除這個動作和所有組數嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "移除",
        style: "destructive",
        onPress: () => {
          setBlocks((prev) => prev.filter((_, i) => i !== blockIndex));
        },
      },
    ]);
  }, []);

  // Calculate totals
  const totalSets = useMemo(
    () => blocks.reduce((sum, b) => sum + b.sets.filter((s) => s.weight || s.reps).length, 0),
    [blocks]
  );
  const totalVolume = useMemo(
    () =>
      blocks.reduce(
        (sum, b) =>
          sum +
          b.sets.reduce(
            (s, set) => s + (set.weight || 0) * (set.reps || 0),
            0
          ),
        0
      ),
    [blocks]
  );

  // Finish workout
  const handleFinish = useCallback(() => {
    if (blocks.length === 0 || totalSets === 0) {
      Alert.alert("尚無記錄", "請至少完成一組訓練再結束。");
      return;
    }

    const durationMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
    const expEarned = Math.round(totalSets * 15 + totalVolume * 0.01);

    logWorkout({
      exercise: blocks.map((b) => b.exerciseNameZh || b.exerciseName).join(", "),
      duration: durationMinutes,
      expEarned,
    });

    exerciseMonster(durationMinutes, Math.round(totalVolume * 0.05), 5).catch(() => {});

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert(
      "訓練完成! 💪",
      `時長: ${durationMinutes} 分鐘\n動作: ${blocks.length} 個\n總組數: ${totalSets} 組\n總訓練量: ${totalVolume.toLocaleString()} kg\n獲得 +${expEarned} EXP`,
      [
        {
          text: "完成",
          onPress: () => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
          },
        },
      ]
    );
  }, [blocks, totalSets, totalVolume, elapsedSeconds, logWorkout, exerciseMonster, router]);

  const handleCancel = useCallback(() => {
    Alert.alert("取消訓練", "確定要取消嗎？所有記錄將會遺失。", [
      { text: "繼續訓練", style: "cancel" },
      {
        text: "取消",
        style: "destructive",
        onPress: () => {
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)");
        },
      },
    ]);
  }, [router]);

  return (
    <ScreenContainer edges={["bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 44) + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
            }}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.topTitle, { color: colors.foreground }]}>組數追蹤</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary, fontVariant: ["tabular-nums"] }}>
              {formatTime(elapsedSeconds)}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancel} style={{ padding: 8 }} activeOpacity={0.7}>
            <Text style={{ fontSize: 13, color: "#EF4444", fontWeight: "600" }}>取消</Text>
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{blocks.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>動作</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalSets}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>組數</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalVolume.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>kg</Text>
          </View>
        </View>

        {/* Exercise blocks */}
        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: 16 }}>
          {blocks.map((block, blockIdx) => (
            <View
              key={`block-${blockIdx}`}
              style={[styles.blockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {/* Block header */}
              <View style={styles.blockHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>
                    {CATEGORY_LABELS[block.category] || block.category}
                  </Text>
                </View>
                <Text style={[styles.blockName, { color: colors.foreground }]}>
                  {block.exerciseNameZh || block.exerciseName}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveBlock(blockIdx)} style={{ padding: 4 }}>
                  <Text style={{ color: "#EF4444", fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Sets */}
              {block.sets.map((set, setIdx) => (
                <SetTrackerCard
                  key={`set-${blockIdx}-${setIdx}`}
                  exerciseName={block.exerciseName}
                  setNumber={set.setNumber}
                  lastSessionSet={block.lastSession?.sets[setIdx]}
                  onComplete={(data) => handleSetComplete(blockIdx, setIdx, data)}
                  onRemove={() => handleRemoveSet(blockIdx, setIdx)}
                />
              ))}

              {/* Add set button */}
              <TouchableOpacity
                onPress={() => handleAddSet(blockIdx)}
                style={[styles.addSetBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, color: colors.primary }}>+</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>新增一組</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add exercise button */}
          <TouchableOpacity
            onPress={() => setShowExercisePicker(true)}
            style={[styles.addExerciseBtn, { borderColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 24, color: colors.primary }}>+</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>新增動作</Text>
          </TouchableOpacity>

          {blocks.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
              <Text style={{ fontSize: 48 }}>🏋️</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>開始你的訓練</Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                點擊「新增動作」選擇訓練動作{"\n"}然後逐組記錄重量和次數
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom action bar */}
        {blocks.length > 0 && (
          <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowRestTimer(true)}
              style={[styles.restTimerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16 }}>⏱️</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>休息</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFinish} activeOpacity={0.8} style={{ flex: 1 }}>
              <LinearGradient
                colors={["#22C55E", "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.finishBtn}
              >
                <Text style={styles.finishBtnText}>完成訓練</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Exercise Picker Modal */}
      <Modal visible={showExercisePicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.pickerHandle} />
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>選擇動作</Text>

            {/* Search */}
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder="搜尋動作名稱..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="done"
            />

            {/* Category filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {[
                { key: "all", label: "全部" },
                { key: "chest", label: "胸" },
                { key: "back", label: "背" },
                { key: "legs", label: "腿" },
                { key: "shoulders", label: "肩" },
                { key: "arms", label: "手臂" },
                { key: "core", label: "核心" },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: selectedCategory === cat.key ? colors.primary : colors.surface,
                      borderColor: selectedCategory === cat.key ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: selectedCategory === cat.key ? "#fff" : colors.muted }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Exercise list */}
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleAddExercise(item)}
                  style={[styles.exerciseRow, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exerciseRowName, { color: colors.foreground }]}>{item.nameZh}</Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>{item.name} · {item.equipment}</Text>
                  </View>
                  <View style={[styles.exerciseRowCat, { backgroundColor: colors.primary + "15" }]}>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              style={{ flex: 1 }}
            />

            {/* Close */}
            <TouchableOpacity
              onPress={() => {
                setShowExercisePicker(false);
                setSearchQuery("");
              }}
              style={[styles.closePickerBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted }}>關閉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rest Timer */}
      <RestTimerSheet
        visible={showRestTimer}
        onDismiss={() => setShowRestTimer(false)}
        defaultSeconds={restTimerDefault}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statsBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 28, alignSelf: "center" },

  blockCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  blockName: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  restTimerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  finishBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  // Picker
  pickerOverlay: { flex: 1, justifyContent: "flex-end" },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 12,
    maxHeight: "80%",
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  searchInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  exerciseRowName: {
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseRowCat: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closePickerBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
});
