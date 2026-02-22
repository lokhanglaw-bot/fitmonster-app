import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useCallback, useMemo } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { useActivity } from "@/lib/activity-context";
import { useProfileData } from "@/hooks/use-profile-data";

function WeeklyWorkoutStatsCard() {
  const colors = useColors();
  const { t } = useI18n();
  const { state: activity } = useActivity();

  const weeklyStats = useMemo(() => {
    const now = new Date();
    // Get Monday of this week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const weekLogs = activity.allWorkoutLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= monday;
    });

    const count = weekLogs.length;
    const totalMinutes = weekLogs.reduce((sum, log) => sum + log.duration, 0);
    // Estimate calories: ~7.5 kcal/min (consistent with LOG_WORKOUT reducer)
    const totalCalories = weekLogs.reduce((sum, log) => sum + Math.round(log.duration * 7.5), 0);

    return { count, totalMinutes, totalCalories };
  }, [activity.allWorkoutLogs]);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}${t.weeklyStatsMinUnit}` : `${h}h`;
    }
    return `${minutes} ${t.weeklyStatsMinUnit}`;
  };

  return (
    <View style={[weeklyStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={weeklyStyles.headerRow}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.weeklyWorkoutStats}</Text>
        <View style={[weeklyStyles.badge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[weeklyStyles.badgeText, { color: colors.primary }]}>{t.thisWeek}</Text>
        </View>
      </View>

      {weeklyStats.count === 0 ? (
        <View style={weeklyStyles.emptyContainer}>
          <Text style={{ fontSize: 32 }}>🏋️</Text>
          <Text style={[weeklyStyles.emptyText, { color: colors.muted }]}>{t.noWorkoutsThisWeek}</Text>
        </View>
      ) : (
        <View style={weeklyStyles.statsRow}>
          <View style={[weeklyStyles.statItem, { backgroundColor: colors.background }]}>
            <Text style={weeklyStyles.statIcon}>💪</Text>
            <Text style={[weeklyStyles.statValue, { color: colors.foreground }]}>{weeklyStats.count}</Text>
            <Text style={[weeklyStyles.statLabel, { color: colors.muted }]}>{t.workoutCount}</Text>
          </View>
          <View style={[weeklyStyles.statItem, { backgroundColor: colors.background }]}>
            <Text style={weeklyStyles.statIcon}>⏱️</Text>
            <Text style={[weeklyStyles.statValue, { color: colors.foreground }]}>{formatDuration(weeklyStats.totalMinutes)}</Text>
            <Text style={[weeklyStyles.statLabel, { color: colors.muted }]}>{t.totalDuration}</Text>
          </View>
          <View style={[weeklyStyles.statItem, { backgroundColor: colors.background }]}>
            <Text style={weeklyStyles.statIcon}>🔥</Text>
            <Text style={[weeklyStyles.statValue, { color: colors.foreground }]}>{weeklyStats.totalCalories}</Text>
            <Text style={[weeklyStyles.statLabel, { color: colors.muted }]}>{t.totalCaloriesBurned}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { state: activity } = useActivity();

  // Read from shared activity context — no hardcoded values
  const todaySteps = activity.todaySteps;
  const stepsGoal = 10000;
  const caloriesBurned = activity.todayCaloriesBurned;
  const caloriesIntake = activity.todayCaloriesIn;
  const { data: profileData, reload: reloadProfile } = useProfileData();
  const dailyCalorieNeed = profileData?.dailyCalorieGoal || 1800;

  // Reload profile data every time this screen gains focus (e.g. returning from edit-profile)
  useFocusEffect(
    useCallback(() => {
      reloadProfile();
    }, [reloadProfile])
  );
  const proteinIntake = activity.todayProtein;

  // Active monster from context (use activeMonsterIndex)
  const activeIdx = activity.activeMonsterIndex;
  const activeMonster = activity.monsters.length > 0 && activeIdx < activity.monsters.length
    ? activity.monsters[activeIdx]
    : activity.monsters.length > 0 ? activity.monsters[0] : null;

  // Protein goal based on monster type and body weight
  const monsterTypeCoefficient = activeMonster
    ? (activeMonster.type === "powerlifter" ? 2.0
      : activeMonster.type === "bodybuilder" ? 1.6
      : activeMonster.type === "physique" ? 1.4
      : activeMonster.type === "colossus" ? 1.8
      : 1.2) // athlete or default
    : 1.2;
  const bodyWeight = profileData?.weight || 65;
  const proteinGoal = Math.round(bodyWeight * monsterTypeCoefficient);
  const workoutExp = Math.round(activity.todayWorkoutMinutes * 5);
  const nutritionExp = activity.todayTotalExp - workoutExp;
  const netExp = activity.todayTotalExp;

  const stepsPercent = Math.min((todaySteps / stepsGoal) * 100, 100);
  const proteinPercent = Math.min((proteinIntake / proteinGoal) * 100, 100);

  // Step bonus calculations
  const expBonus = todaySteps >= 10000 ? 1.5 : todaySteps >= 5000 ? 1.2 : 1.0;
  const proteinEfficiency = todaySteps >= 10000 ? 1.3 : todaySteps >= 5000 ? 1.1 : 1.0;

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

          {/* Weekly Workout Stats Card */}
          <WeeklyWorkoutStatsCard />

          {/* Nutrition Card */}
          <View style={[styles.nutritionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.totalNutrition}</Text>
              <TouchableOpacity
                style={[styles.editProfileBtn, { backgroundColor: colors.primary + "15" }]}
                onPress={() => router.push("/edit-profile" as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.editProfileBtnText, { color: colors.primary }]}>{t.editProfile}</Text>
              </TouchableOpacity>
            </View>
            {profileData?.bmr ? (
              <View style={[styles.bmrBadge, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.bmrBadgeText, { color: colors.primary }]}>
                  BMR: {profileData.bmr} kcal ({t.basedOnProfile})
                </Text>
              </View>
            ) : null}
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>{t.dailyCalorieNeed}</Text>
              <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{dailyCalorieNeed} kcal</Text>
            </View>
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>{t.caloriesConsumed}</Text>
              <Text style={[styles.nutritionValue, { color: caloriesIntake > dailyCalorieNeed ? colors.error : colors.foreground }]}>{caloriesIntake} kcal</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
              <View style={[styles.progressFill, { width: `${Math.min((caloriesIntake / dailyCalorieNeed) * 100, 100)}%`, backgroundColor: caloriesIntake > dailyCalorieNeed ? colors.error : "#F59E0B" }]} />
            </View>
            <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>{t.recommendedProtein}</Text>
              <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{proteinGoal}g ({monsterTypeCoefficient}{t.gPerKg})</Text>
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
                    <View style={[styles.progressTrack, { flex: 1, backgroundColor: colors.background }]}>
                      <View style={[styles.progressFill, { width: `${activeMonster.expToNextLevel > 0 ? Math.min((activeMonster.currentExp / activeMonster.expToNextLevel) * 100, 100) : 0}%`, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                  <View style={styles.growthBarContainer}>
                    <Text style={[styles.growthBarLabel, { color: colors.muted }]}>{t.evolution}</Text>
                    <View style={[styles.progressTrack, { flex: 1, backgroundColor: colors.background }]}>
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
                  <Text style={[styles.questItemReward, { color: "#F59E0B" }]}>+{quest.reward} EXP</Text>
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
  bmrBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start" as const,
    marginBottom: 2,
  },
  bmrBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  nutritionDivider: {
    height: 1,
    marginVertical: 2,
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
  cardTitleRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  editProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
});

const weeklyStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statItem: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    fontSize: 22,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center" as const,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center" as const,
  },
});
