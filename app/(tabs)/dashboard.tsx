import { ScrollView, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { useActivity } from "@/lib/activity-context";

export default function DashboardScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { state: activity } = useActivity();

  // Read from shared activity context — no hardcoded values
  const todaySteps = activity.todaySteps;
  const stepsGoal = 10000;
  const caloriesBurned = activity.todayCaloriesBurned;
  const caloriesIntake = activity.todayCaloriesIn;
  const dailyCalorieNeed = 1800;
  const proteinIntake = activity.todayProtein;
  const proteinGoal = 100;
  const workoutExp = Math.round(activity.todayWorkoutMinutes * 5);
  const nutritionExp = activity.todayTotalExp - workoutExp;
  const netExp = activity.todayTotalExp;

  const stepsPercent = Math.min((todaySteps / stepsGoal) * 100, 100);
  const proteinPercent = Math.min((proteinIntake / proteinGoal) * 100, 100);

  // Step bonus calculations
  const expBonus = todaySteps >= 10000 ? 1.5 : todaySteps >= 5000 ? 1.2 : 1.0;
  const proteinEfficiency = todaySteps >= 10000 ? 1.3 : todaySteps >= 5000 ? 1.1 : 1.0;

  // Active monster from context (use activeMonsterIndex)
  const activeIdx = activity.activeMonsterIndex;
  const activeMonster = activity.monsters.length > 0 && activeIdx < activity.monsters.length
    ? activity.monsters[activeIdx]
    : activity.monsters.length > 0 ? activity.monsters[0] : null;

  const quests = [
    { title: t.questProteinChampion, desc: t.questProteinDescFull, progress: proteinIntake, target: 100, reward: 50, color: "#EF4444" },
    { title: t.questWalkingMaster, desc: t.questWalkingDescFull, progress: todaySteps, target: 5000, reward: 50, color: "#3B82F6" },
    { title: t.feedingExpert, desc: t.logThreeMeals, progress: activity.todayMealCount, target: 3, reward: 75, color: "#22C55E" },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t.todaysFitnessOverview}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t.trackYourProgress}</Text>
          </View>

          {/* Steps & Calories Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.statCardIcon}>👣</Text>
              <Text style={[styles.statCardTitle, { color: colors.muted }]}>{t.todaySteps}</Text>
              <Text style={[styles.statCardValue, { color: colors.foreground }]}>{todaySteps.toLocaleString()}</Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.progressFill, { width: `${stepsPercent}%`, backgroundColor: "#3B82F6" }]} />
              </View>
              <Text style={[styles.goalText, { color: colors.muted }]}>{t.stepsGoal}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.statCardIcon}>🔥</Text>
              <Text style={[styles.statCardTitle, { color: colors.muted }]}>{t.burnedCalories}</Text>
              <Text style={[styles.statCardValue, { color: colors.foreground }]}>{caloriesBurned}</Text>
              <Text style={[styles.formulaText, { color: colors.muted }]}>
                = MET x Weight x Duration
              </Text>
            </View>
          </View>

          {/* Net EXP Card */}
          <View style={[styles.expCard, { backgroundColor: "#7C3AED" }]}>
            <Text style={styles.expCardTitle}>{t.todaysNetExp}</Text>
            <Text style={styles.expCardValue}>{netExp}</Text>
            <View style={styles.expBreakdown}>
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>{t.calorieSurplus}</Text>
                <Text style={styles.expAmount}>{caloriesIntake - caloriesBurned} kcal</Text>
              </View>
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>{t.nutritionExp}</Text>
                <Text style={styles.expAmount}>{Math.max(0, nutritionExp)}</Text>
              </View>
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>{t.workoutExp}</Text>
                <Text style={styles.expAmount}>{workoutExp}</Text>
              </View>
              <View style={[styles.expDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>{t.intake}</Text>
                <Text style={styles.expAmount}>{caloriesIntake} kcal</Text>
              </View>
              <View style={styles.expRow}>
                <Text style={styles.expLabel}>{t.burned}</Text>
                <Text style={styles.expAmount}>{caloriesBurned} kcal</Text>
              </View>
              <View style={[styles.balanceBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={styles.balanceText}>⚖️ {t.balanced}</Text>
              </View>
            </View>
          </View>

          {/* Step Bonus Effects */}
          <View style={[styles.bonusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.stepBonusEffects}</Text>
            <View style={styles.bonusRow}>
              <View style={[styles.bonusItem, { backgroundColor: colors.background }]}>
                <Text style={styles.bonusIcon}>⚡</Text>
                <Text style={[styles.bonusLabel, { color: colors.muted }]}>{t.expBonus}</Text>
                <Text style={[styles.bonusValue, { color: colors.primary }]}>x{expBonus}</Text>
              </View>
              <View style={[styles.bonusItem, { backgroundColor: colors.background }]}>
                <Text style={styles.bonusIcon}>🥩</Text>
                <Text style={[styles.bonusLabel, { color: colors.muted }]}>{t.proteinEfficiency}</Text>
                <Text style={[styles.bonusValue, { color: colors.primary }]}>x{proteinEfficiency}</Text>
              </View>
            </View>
            <Text style={[styles.bonusHint, { color: colors.muted }]}>
              {t.walkMoreStepsHint}
            </Text>
          </View>

          {/* Nutrition Card */}
          <View style={[styles.nutritionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.totalNutrition}</Text>
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>{t.dailyCalorieNeed}</Text>
              <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{dailyCalorieNeed} kcal</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>{t.proteinIntake}</Text>
              <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{proteinIntake}g / {proteinGoal}g</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
              <View style={[styles.progressFill, { width: `${proteinPercent}%`, backgroundColor: "#22C55E" }]} />
            </View>
          </View>

          {/* Monster Growth Status */}
          <View style={[styles.monsterGrowth, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.monsterGrowth}</Text>
            {activeMonster ? (
              <View style={styles.monsterGrowthRow}>
                <LinearGradient colors={["#DCFCE7", "#BBF7D0"]} style={styles.monsterThumbGradient}>
                  <Image
                    source={require("@/assets/monsters/bodybuilder-stage1.png")}
                    style={styles.monsterThumb}
                    contentFit="contain"
                  />
                </LinearGradient>
                <View style={styles.monsterGrowthInfo}>
                  <Text style={[styles.monsterGrowthName, { color: colors.foreground }]}>{activeMonster.name}</Text>
                  <Text style={[styles.monsterGrowthLevel, { color: colors.muted }]}>Lv.{activeMonster.level}</Text>
                  <View style={styles.growthBarContainer}>
                    <Text style={[styles.growthBarLabel, { color: colors.muted }]}>EXP</Text>
                    <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                      <View style={[styles.progressFill, { width: `${activeMonster.expToNextLevel > 0 ? Math.min((activeMonster.currentExp / activeMonster.expToNextLevel) * 100, 100) : 0}%`, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                  <View style={styles.growthBarContainer}>
                    <Text style={[styles.growthBarLabel, { color: colors.muted }]}>{t.evolution}</Text>
                    <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                      <View style={[styles.progressFill, { width: `${activeMonster.evolutionMax > 0 ? Math.min((activeMonster.evolutionProgress / activeMonster.evolutionMax) * 100, 100) : 0}%`, backgroundColor: "#F59E0B" }]} />
                    </View>
                  </View>
                  <Text style={[styles.stageText, { color: colors.muted }]}>{t.evolutionStage} {activeMonster.stage}/3</Text>
                  <View style={styles.growthStats}>
                    <Text style={styles.growthStat}>🥩 {activeMonster.strength}</Text>
                    <Text style={styles.growthStat}>🛡️ {activeMonster.defense}</Text>
                    <Text style={styles.growthStat}>⚡ {activeMonster.agility}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noMonsterContainer}>
                <Text style={{ fontSize: 40 }}>🥚</Text>
                <Text style={[styles.noMonsterText, { color: colors.muted }]}>{t.hatchYourFirstMonster}</Text>
              </View>
            )}
          </View>

          {/* Daily Quest Progress */}
          <View style={[styles.questSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.dailyQuestProgress}</Text>
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
    alignItems: "center",
  },
  statCardIcon: {
    fontSize: 24,
  },
  statCardTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  formulaText: {
    fontSize: 10,
    textAlign: "center" as const,
  },
  goalText: {
    fontSize: 11,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    width: "100%",
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  expCard: {
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  expCardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  expCardValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
  },
  expBreakdown: {
    gap: 6,
    marginTop: 8,
  },
  expRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  expLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  expAmount: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  expDivider: {
    height: 1,
    marginVertical: 4,
  },
  balanceBadge: {
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
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
    fontSize: 20,
  },
  bonusLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  bonusValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  bonusHint: {
    fontSize: 12,
    textAlign: "center" as const,
  },
  nutritionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nutritionLabel: {
    fontSize: 13,
  },
  nutritionValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  monsterGrowth: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  monsterGrowthRow: {
    flexDirection: "row",
    gap: 16,
  },
  monsterThumbGradient: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  monsterThumb: {
    width: 60,
    height: 60,
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
    fontSize: 12,
  },
  growthBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  growthBarLabel: {
    fontSize: 11,
    width: 50,
  },
  stageText: {
    fontSize: 11,
  },
  growthStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  growthStat: {
    fontSize: 12,
  },
  noMonsterContainer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  noMonsterText: {
    fontSize: 14,
    textAlign: "center" as const,
  },
  questSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  questItem: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  questItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  questItemTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  questItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  questItemReward: {
    fontSize: 13,
    fontWeight: "700",
  },
  questItemProgress: {
    fontSize: 12,
    textAlign: "right" as const,
  },
});
