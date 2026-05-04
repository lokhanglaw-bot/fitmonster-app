import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import type { WorkoutExerciseDetail } from "@/lib/activity-context";

const SET_TYPE_LABELS: Record<string, { en: string; zh: string }> = {
  warmup: { en: "Warm-up", zh: "熱身" },
  working: { en: "Working", zh: "正式" },
  strength: { en: "Strength", zh: "力竭" },
  dropset: { en: "Drop Set", zh: "遞減" },
  superset: { en: "Superset", zh: "超級組" },
};

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { language } = useI18n();
  const params = useLocalSearchParams<{
    duration: string;
    exercises: string;
    totalSets: string;
    totalVolume: string;
    expEarned: string;
    details: string;
  }>();

  const duration = parseInt(params.duration || "0", 10);
  const exerciseCount = parseInt(params.exercises || "0", 10);
  const totalSets = parseInt(params.totalSets || "0", 10);
  const totalVolume = parseInt(params.totalVolume || "0", 10);
  const expEarned = parseInt(params.expEarned || "0", 10);

  let exerciseDetails: WorkoutExerciseDetail[] = [];
  try {
    exerciseDetails = JSON.parse(params.details || "[]");
  } catch {
    exerciseDetails = [];
  }

  const handleDone = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace("/(tabs)");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {language === "zh" ? "訓練完成!" : "Workout Complete!"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {language === "zh" ? "太棒了，繼續保持！" : "Great job, keep it up!"}
          </Text>
        </View>

        {/* Summary stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxValue, { color: colors.primary }]}>{duration}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.muted }]}>
                {language === "zh" ? "分鐘" : "min"}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxValue, { color: colors.primary }]}>{exerciseCount}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.muted }]}>
                {language === "zh" ? "動作" : "Exercises"}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxValue, { color: colors.primary }]}>{totalSets}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.muted }]}>
                {language === "zh" ? "組" : "Sets"}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxValue, { color: colors.primary }]}>{totalVolume.toLocaleString()}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.muted }]}>kg</Text>
            </View>
          </View>
          <View style={[styles.expBadge, { backgroundColor: "#DCFCE7" }]}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#166534" }}>+{expEarned} EXP</Text>
          </View>
        </View>

        {/* Exercise details */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {language === "zh" ? "訓練詳情" : "Workout Details"}
        </Text>

        {exerciseDetails.map((exercise, exIdx) => (
          <View
            key={`ex-${exIdx}`}
            style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseName, { color: colors.foreground }]}>
                {language === "zh" ? (exercise.exerciseNameZh || exercise.exerciseName) : exercise.exerciseName}
              </Text>
              <Text style={[styles.exerciseSets, { color: colors.muted }]}>
                {exercise.sets.length} {language === "zh" ? "組" : "sets"}
              </Text>
            </View>

            {/* Set header */}
            <View style={[styles.setRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.setHeaderText, { color: colors.muted, flex: 0.5 }]}>#</Text>
              <Text style={[styles.setHeaderText, { color: colors.muted, flex: 1 }]}>
                {language === "zh" ? "類型" : "Type"}
              </Text>
              <Text style={[styles.setHeaderText, { color: colors.muted, flex: 1 }]}>
                {language === "zh" ? "重量" : "Weight"}
              </Text>
              <Text style={[styles.setHeaderText, { color: colors.muted, flex: 1 }]}>
                {language === "zh" ? "次數" : "Reps"}
              </Text>
              <Text style={[styles.setHeaderText, { color: colors.muted, flex: 0.7 }]}>RPE</Text>
            </View>

            {/* Set rows */}
            {exercise.sets.map((set, setIdx) => {
              const typeLabel = SET_TYPE_LABELS[set.setType]?.[language] || set.setType;
              return (
                <View key={`set-${setIdx}`} style={[styles.setRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.setValueText, { color: colors.foreground, flex: 0.5 }]}>{set.setNumber}</Text>
                  <Text style={[styles.setValueText, { color: colors.primary, flex: 1 }]}>{typeLabel}</Text>
                  <Text style={[styles.setValueText, { color: colors.foreground, flex: 1 }]}>
                    {set.weight ? `${set.weight}kg` : "—"}
                  </Text>
                  <Text style={[styles.setValueText, { color: colors.foreground, flex: 1 }]}>
                    {set.reps || "—"}
                  </Text>
                  <Text style={[styles.setValueText, { color: colors.muted, flex: 0.7 }]}>
                    {set.rpe || "—"}
                  </Text>
                </View>
              );
            })}

            {/* Exercise volume */}
            <View style={styles.exerciseVolume}>
              <Text style={[styles.exerciseVolumeText, { color: colors.muted }]}>
                {language === "zh" ? "訓練量" : "Volume"}: {exercise.sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0).toLocaleString()} kg
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Done button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleDone} activeOpacity={0.8} style={{ flex: 1 }}>
          <LinearGradient
            colors={["#22C55E", "#16A34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.doneBtn}
          >
            <Text style={styles.doneBtnText}>{language === "zh" ? "完成" : "Done"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 14,
  },
  statsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBox: {
    alignItems: "center",
    gap: 2,
  },
  statBoxValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statBoxLabel: {
    fontSize: 11,
  },
  expBadge: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  exerciseCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "700",
  },
  exerciseSets: {
    fontSize: 12,
  },
  setRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  setHeaderText: {
    fontSize: 11,
    fontWeight: "600",
  },
  setValueText: {
    fontSize: 13,
    fontWeight: "500",
  },
  exerciseVolume: {
    padding: 12,
    alignItems: "flex-end",
  },
  exerciseVolumeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  doneBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  doneBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
});
