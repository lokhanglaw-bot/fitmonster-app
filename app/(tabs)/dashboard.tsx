import { ScrollView, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function DashboardScreen() {
  const colors = useColors();

  // Demo data - will be replaced with real API data
  const todaySteps = 0;
  const stepsGoal = 10000;
  const caloriesBurned = 0;
  const caloriesIntake = 0;
  const dailyCalorieNeed = 1800;
  const proteinIntake = 0;
  const proteinGoal = 100;
  const workoutExp = 0;
  const nutritionExp = 0;
  const netExp = workoutExp - nutritionExp;

  const stepsPercent = Math.min((todaySteps / stepsGoal) * 100, 100);
  const proteinPercent = Math.min((proteinIntake / proteinGoal) * 100, 100);

  // Step bonus calculations
  const expBonus = todaySteps >= 10000 ? 1.5 : todaySteps >= 5000 ? 1.2 : 1.0;
  const proteinEfficiency = todaySteps >= 10000 ? 1.3 : todaySteps >= 5000 ? 1.1 : 1.0;

  const quests = [
    { title: "Protein Champion", desc: "Consume 100g protein", progress: 0, target: 100, reward: 50, color: "#EF4444" },
    { title: "Walking Master", desc: "Walk 5,000 steps", progress: todaySteps, target: 5000, reward: 50, color: "#3B82F6" },
    { title: "Feeding Expert", desc: "Log 3 meals today", progress: 0, target: 3, reward: 75, color: "#22C55E" },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Today's Fitness Overview</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Track your health progress</Text>
          </View>

          {/* Steps & Calories Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.statCardIcon}>👣</Text>
              <Text style={[styles.statCardTitle, { color: colors.muted }]}>Today's Steps</Text>
              <Text style={[styles.statCardValue, { color: colors.foreground }]}>{todaySteps.toLocaleString()}</Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.progressFill, { width: `${stepsPercent}%`, backgroundColor: "#3B82F6" }]} />
              </View>
              <Text style={[styles.goalText, { color: colors.muted }]}>Goal: {stepsGoal.toLocaleString()} steps</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.statCardIcon}>🔥</Text>
              <Text style={[styles.statCardTitle, { color: colors.muted }]}>Burned Calories</Text>
              <Text style={[styles.statCardValue, { color: colors.foreground }]}>{caloriesBurned}</Text>
              <Text style={[styles.formulaText, { color: colors.muted }]}>
                = MET x Weight x Duration
              </Text>
            </View>
          </View>

          {/* Net EXP Card */}
          <View style={[styles.expCard, { backgroundColor: "#7C3AED" }]}>
            <Text style={styles.expCardTitle}>Today's Net EXP</Text>
            <Text style={styles.expCardValue}>{netExp}</Text>
            <View style={styles.expBreakdown}>
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>Calorie Surplus</Text>
                <Text style={styles.expAmount}>{caloriesIntake - caloriesBurned} kcal</Text>
              </View>
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>Nutrition EXP</Text>
                <Text style={styles.expAmount}>{nutritionExp}</Text>
              </View>
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>Workout EXP</Text>
                <Text style={styles.expAmount}>{workoutExp}</Text>
              </View>
              <View style={[styles.expDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>Intake</Text>
                <Text style={styles.expAmount}>{caloriesIntake} kcal</Text>
              </View>
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>Burned</Text>
                <Text style={styles.expAmount}>{caloriesBurned} kcal</Text>
              </View>
              <View style={[styles.balanceBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={styles.balanceText}>⚖️ Balanced</Text>
              </View>
            </View>
          </View>

          {/* Step Bonus Effects */}
          <View style={[styles.bonusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Step Bonus Effects</Text>
            <View style={styles.bonusRow}>
              <View style={[styles.bonusItem, { backgroundColor: colors.background }]}>
                <Text style={styles.bonusIcon}>⚡</Text>
                <Text style={[styles.bonusLabel, { color: colors.muted }]}>EXP Bonus</Text>
                <Text style={[styles.bonusValue, { color: colors.primary }]}>x{expBonus}</Text>
              </View>
              <View style={[styles.bonusItem, { backgroundColor: colors.background }]}>
                <Text style={styles.bonusIcon}>🥩</Text>
                <Text style={[styles.bonusLabel, { color: colors.muted }]}>Protein Efficiency</Text>
                <Text style={[styles.bonusValue, { color: colors.primary }]}>x{proteinEfficiency}</Text>
              </View>
            </View>
            <Text style={[styles.bonusHint, { color: colors.muted }]}>
              Walk more steps to increase your bonus multipliers!
            </Text>
          </View>

          {/* Nutrition Card */}
          <View style={[styles.nutritionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Today's Nutrition</Text>
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>Daily Calorie Need</Text>
              <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{dailyCalorieNeed} kcal</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>Protein Intake</Text>
              <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{proteinIntake}g / {proteinGoal}g</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
              <View style={[styles.progressFill, { width: `${proteinPercent}%`, backgroundColor: "#22C55E" }]} />
            </View>
          </View>

          {/* Monster Growth Status */}
          <View style={[styles.monsterGrowth, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Monster Growth Status</Text>
            <View style={styles.monsterGrowthRow}>
              <LinearGradient colors={["#DCFCE7", "#BBF7D0"]} style={styles.monsterThumbGradient}>
                <Image
                  source={require("@/assets/monsters/bodybuilder-stage1.png")}
                  style={styles.monsterThumb}
                  contentFit="contain"
                />
              </LinearGradient>
              <View style={styles.monsterGrowthInfo}>
                <Text style={[styles.monsterGrowthName, { color: colors.foreground }]}>Flexo</Text>
                <Text style={[styles.monsterGrowthLevel, { color: colors.muted }]}>Level 1</Text>
                <View style={styles.growthBarContainer}>
                  <Text style={[styles.growthBarLabel, { color: colors.muted }]}>EXP</Text>
                  <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                    <View style={[styles.progressFill, { width: "0%", backgroundColor: colors.primary }]} />
                  </View>
                </View>
                <View style={styles.growthBarContainer}>
                  <Text style={[styles.growthBarLabel, { color: colors.muted }]}>Evolution</Text>
                  <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                    <View style={[styles.progressFill, { width: "0%", backgroundColor: "#F59E0B" }]} />
                  </View>
                </View>
                <Text style={[styles.stageText, { color: colors.muted }]}>Stage 1/3</Text>
                <View style={styles.growthStats}>
                  <Text style={styles.growthStat}>🥩 10</Text>
                  <Text style={styles.growthStat}>🛡️ 10</Text>
                  <Text style={styles.growthStat}>⚡ 10</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Daily Quest Progress */}
          <View style={[styles.questSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Daily Quest Progress</Text>
            {quests.map((quest, index) => (
              <View key={index} style={[styles.questItem, { borderBottomColor: colors.border }]}>
                <View style={styles.questItemHeader}>
                  <View>
                    <Text style={[styles.questItemTitle, { color: colors.foreground }]}>{quest.title}</Text>
                    <Text style={[styles.questItemDesc, { color: colors.muted }]}>{quest.desc}</Text>
                  </View>
                  <Text style={[styles.questItemReward, { color: "#F59E0B" }]}>+{quest.reward} 🪙</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0}%`,
                        backgroundColor: quest.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.questItemProgress, { color: colors.muted }]}>
                  {quest.progress}/{quest.target}
                </Text>
              </View>
            ))}
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
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  statCardIcon: {
    fontSize: 24,
  },
  statCardTitle: {
    fontSize: 12,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  goalText: {
    fontSize: 11,
    marginTop: 4,
  },
  formulaText: {
    fontSize: 11,
    marginTop: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  expCard: {
    borderRadius: 20,
    padding: 20,
  },
  expCardTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  expCardValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginVertical: 8,
  },
  expBreakdown: {
    gap: 8,
  },
  expRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  expLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  expAmount: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  expDivider: {
    height: 1,
    marginVertical: 4,
  },
  balanceBadge: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  balanceText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  bonusCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  bonusRow: {
    flexDirection: "row",
    gap: 12,
  },
  bonusItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  bonusIcon: {
    fontSize: 24,
  },
  bonusLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  bonusValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  bonusHint: {
    fontSize: 12,
    textAlign: "center",
  },
  nutritionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nutritionLabel: {
    fontSize: 14,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  monsterGrowth: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  monsterGrowthRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  monsterThumbGradient: {
    borderRadius: 16,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  monsterThumb: {
    width: 65,
    height: 65,
  },
  monsterGrowthInfo: {
    flex: 1,
    gap: 4,
  },
  monsterGrowthName: {
    fontSize: 16,
    fontWeight: "700",
  },
  monsterGrowthLevel: {
    fontSize: 13,
  },
  growthBarContainer: {
    gap: 2,
  },
  growthBarLabel: {
    fontSize: 11,
  },
  stageText: {
    fontSize: 12,
    marginTop: 2,
  },
  growthStats: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  growthStat: {
    fontSize: 14,
  },
  questSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  questItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  questItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  questItemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  questItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  questItemReward: {
    fontSize: 13,
    fontWeight: "600",
  },
  questItemProgress: {
    fontSize: 11,
    textAlign: "right",
  },
});
