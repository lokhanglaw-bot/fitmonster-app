import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

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

export default function WorkoutScreen() {
  const colors = useColors();
  const [selectedType, setSelectedType] = useState("All");
  const [totalExp, setTotalExp] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [steps, setSteps] = useState(0);

  const filteredExercises =
    selectedType === "All"
      ? EXERCISES
      : EXERCISES.filter((e) => e.category === selectedType);

  const handleExercisePress = (exercise: (typeof EXERCISES)[0]) => {
    Alert.alert(
      exercise.name,
      `MET Value: ${exercise.met}\n\nStart a ${exercise.name} session?\nEXP will be calculated based on duration and intensity.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: () => {
            setTotalExp((prev) => prev + exercise.met * 10);
            setCompletedCount((prev) => prev + 1);
          },
        },
      ]
    );
  };

  const handleManualLog = () => {
    Alert.alert("Manual Log", "Manual workout logging form will appear here.");
  };

  const handleSyncSteps = () => {
    Alert.alert("Sync Steps", "Step syncing will connect to your device's health data.");
  };

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

          {/* Monster Card */}
          <View style={[styles.monsterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.monsterRow}>
              <Image
                source={require("@/assets/monsters/bodybuilder-stage1.png")}
                style={styles.monsterImg}
                contentFit="contain"
              />
              <View style={styles.monsterInfo}>
                <Text style={[styles.monsterName, { color: colors.foreground }]}>Flexo</Text>
                <Text style={[styles.monsterLevel, { color: colors.muted }]}>Level 1</Text>
                <View style={[styles.xpBarTrack, { backgroundColor: colors.background }]}>
                  <View style={[styles.xpBarFill, { width: "0%", backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.bestType, { color: colors.muted }]}>Best: Weight Training</Text>
              </View>
            </View>
          </View>

          {/* Workout Type Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
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
                <Text
                  style={[
                    styles.filterText,
                    { color: selectedType === type ? "#fff" : colors.muted },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercise Grid */}
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
              <Text style={[styles.bottomStatValue, { color: colors.foreground }]}>{steps}</Text>
              <Text style={[styles.bottomStatLabel, { color: colors.muted }]}>Steps</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  expBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  expText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  monsterCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  monsterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  monsterImg: {
    width: 80,
    height: 80,
  },
  monsterInfo: {
    flex: 1,
    gap: 4,
  },
  monsterName: {
    fontSize: 18,
    fontWeight: "700",
  },
  monsterLevel: {
    fontSize: 13,
  },
  xpBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  bestType: {
    fontSize: 12,
    marginTop: 4,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  exerciseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  exerciseCard: {
    width: "30%",
    flexGrow: 1,
    minWidth: 100,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  exerciseIcon: {
    fontSize: 32,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  exerciseMet: {
    fontSize: 12,
    fontWeight: "700",
  },
  bottomStats: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  bottomStatItem: {
    flex: 1,
    alignItems: "center",
  },
  bottomStatValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  bottomStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  bottomStatDivider: {
    width: 1,
    height: 36,
    alignSelf: "center",
  },
});
