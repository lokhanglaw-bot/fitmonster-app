import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Linking, Modal } from "react-native";
import { useState, useCallback, useMemo } from "react";
import type { FoodLogEntry } from "@/lib/activity-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { useActivity } from "@/lib/activity-context";
import { useProfileData } from "@/hooks/use-profile-data";
import { useCaring } from "@/lib/caring-context";
import { getMonsterImageForCaringState } from "@/lib/monster-expressions";

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

// ── Meal type labels ──
const MEAL_LABELS: Record<string, { emoji: string; label: string; labelEn: string }> = {
  breakfast: { emoji: "🌅", label: "早餐", labelEn: "Breakfast" },
  lunch:     { emoji: "☀️", label: "午餐", labelEn: "Lunch" },
  dinner:    { emoji: "🌙", label: "晚餐", labelEn: "Dinner" },
};

function getMealLog(logs: FoodLogEntry[], mealType: string): FoodLogEntry | undefined {
  return logs.find((l) => l.mealType === mealType);
}

function MealBoxes({ activity, colors }: { activity: any; colors: any }) {
  const logs: FoodLogEntry[] = activity.todayFoodLogs || [];
  const breakfastLog = getMealLog(logs, "breakfast");
  const lunchLog = getMealLog(logs, "lunch");
  const dinnerLog = getMealLog(logs, "dinner");
  const allThreeDone = !!(breakfastLog && lunchLog && dinnerLog);
  const [showShareCard, setShowShareCard] = useState(false);

  const meals = [
    { key: "breakfast", log: breakfastLog },
    { key: "lunch", log: lunchLog },
    { key: "dinner", log: dinnerLog },
  ];

  const totalCal = logs.reduce((s, l) => s + l.calories, 0);
  const totalProtein = logs.reduce((s, l) => s + l.protein, 0);
  const totalCarbs = logs.reduce((s, l) => s + l.carbs, 0);
  const totalFat = logs.reduce((s, l) => s + l.fat, 0);
  const totalSugar = logs.reduce((s, l) => s + (l.sugar || 0), 0);

  return (
    <View style={[mealStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>今日三餐</Text>
      <Text style={[mealStyles.hint, { color: colors.muted }]}>
        {allThreeDone ? "三餐已記錄完成！可以分享今日成果 🎉" : "拍完早午晚三餐即可解鎖分享功能"}
      </Text>

      {/* 3 Meal Boxes */}
      <View style={mealStyles.boxRow}>
        {meals.map(({ key, log }) => {
          const info = MEAL_LABELS[key];
          return (
            <View
              key={key}
              style={[
                mealStyles.mealBox,
                {
                  backgroundColor: log ? colors.primary + "10" : colors.background,
                  borderColor: log ? colors.primary : colors.border,
                },
              ]}
            >
              {log?.imageUri ? (
                <Image source={{ uri: log.imageUri }} style={mealStyles.mealImage} contentFit="cover" />
              ) : (
                <View style={[mealStyles.mealPlaceholder, { backgroundColor: colors.background }]}>
                  <Text style={{ fontSize: 28 }}>{info.emoji}</Text>
                </View>
              )}
              <Text style={[mealStyles.mealLabel, { color: log ? colors.primary : colors.muted }]}>
                {info.label}
              </Text>
              {log ? (
                <Text style={[mealStyles.mealCal, { color: colors.foreground }]}>{log.calories} kcal</Text>
              ) : (
                <Text style={[mealStyles.mealCal, { color: colors.muted }]}>未記錄</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Share Button */}
      <TouchableOpacity
        style={[
          mealStyles.shareBtn,
          {
            backgroundColor: allThreeDone ? "#22C55E" : colors.border,
            opacity: allThreeDone ? 1 : 0.5,
          },
        ]}
        onPress={() => allThreeDone && setShowShareCard(true)}
        activeOpacity={allThreeDone ? 0.7 : 1}
        disabled={!allThreeDone}
      >
        <Text style={mealStyles.shareBtnText}>
          {allThreeDone ? "📤 分享今日操野成果" : "🔒 完成三餐記錄後解鎖分享"}
        </Text>
      </TouchableOpacity>

      {/* Share Card Modal */}
      <Modal visible={showShareCard} animationType="slide" transparent>
        <View style={mealStyles.modalOverlay}>
          <View style={[mealStyles.modalContent, { backgroundColor: colors.background }]}>
            <DailyShareCard
              meals={meals.map(({ key, log }) => ({
                type: key as "breakfast" | "lunch" | "dinner",
                log,
              }))}
              totalCal={totalCal}
              totalProtein={totalProtein}
              totalCarbs={totalCarbs}
              totalFat={totalFat}
              totalSugar={totalSugar}
              monsterName={activity.monsters?.[activity.activeMonsterIndex]?.name || "怪獸"}
              monsterLevel={activity.monsters?.[activity.activeMonsterIndex]?.level || 1}
              todayExp={activity.todayTotalExp}
            />
            <TouchableOpacity
              style={[mealStyles.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowShareCard(false)}
              activeOpacity={0.7}
            >
              <Text style={mealStyles.closeBtnText}>關閉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Daily Share Card (matches reference design) ──
function DailyShareCard({
  meals,
  totalCal,
  totalProtein,
  totalCarbs,
  totalFat,
  totalSugar,
  monsterName,
  monsterLevel,
  todayExp,
}: {
  meals: { type: "breakfast" | "lunch" | "dinner"; log?: FoodLogEntry }[];
  totalCal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSugar: number;
  monsterName: string;
  monsterLevel: number;
  todayExp: number;
}) {
  const handleShare = useCallback(async () => {
    const { Share } = require("react-native");
    const msg =
      `🍽️ 今日操野成果\n` +
      `🔥 ${totalCal} kcal\n` +
      `🥩 蛋白質 ${totalProtein}g | 🍚 碳水 ${totalCarbs}g | 🧈 脂肪 ${totalFat}g\n` +
      (totalSugar > 25 ? `⚠️ 糖份 ${totalSugar}g\n` : `🍬 糖份 ${totalSugar}g\n`) +
      `\n🐾 ${monsterName} Lv.${monsterLevel} | +${todayExp} EXP\n` +
      `\n#MyFitMonster #健身怪獸`;
    try {
      await Share.share({ message: msg });
    } catch {}
  }, [totalCal, totalProtein, totalCarbs, totalFat, totalSugar, monsterName, monsterLevel, todayExp]);

  return (
    <View style={shareStyles.card}>
      <LinearGradient
        colors={["#0F2027", "#203A43", "#2C5364"]}
        style={shareStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Title */}
        <Text style={shareStyles.title}>今日操野成果</Text>

        {/* 3 Meal Photos */}
        <View style={shareStyles.mealRow}>
          {meals.map(({ type, log }) => (
            <View key={type} style={shareStyles.mealPhotoBox}>
              {log?.imageUri ? (
                <Image source={{ uri: log.imageUri }} style={shareStyles.mealPhoto} contentFit="cover" />
              ) : (
                <View style={[shareStyles.mealPhoto, shareStyles.mealPhotoEmpty]}>
                  <Text style={{ fontSize: 24 }}>{MEAL_LABELS[type].emoji}</Text>
                </View>
              )}
              <Text style={shareStyles.mealPhotoLabel}>{MEAL_LABELS[type].label}</Text>
            </View>
          ))}
        </View>

        {/* Macro Bars */}
        <View style={shareStyles.macroRow}>
          <MacroBar label="Protein" value={Math.min(totalProtein / 120, 1)} percent={Math.round((totalProtein / 120) * 100)} color="#22C55E" />
          <MacroBar label="Carbs" value={Math.min(totalCarbs / 250, 1)} percent={Math.round((totalCarbs / 250) * 100)} color="#3B82F6" />
          <MacroBar label="Fat" value={Math.min(totalFat / 65, 1)} percent={Math.round((totalFat / 65) * 100)} color="#F59E0B" />
        </View>

        {/* Monster + Stats */}
        <View style={shareStyles.statsSection}>
          <View style={shareStyles.monsterInfo}>
            <Text style={shareStyles.monsterName}>🐾 {monsterName}</Text>
            <Text style={shareStyles.levelBadge}>Level {monsterLevel} ⬆</Text>
            <Text style={shareStyles.expBadge}>+{todayExp} EXP</Text>
          </View>
        </View>

        {/* Total Calories */}
        <Text style={shareStyles.totalCal}>{totalCal.toLocaleString()}</Text>
        <Text style={shareStyles.totalCalUnit}>KCAL</Text>

        {/* Sugar Warning */}
        {totalSugar > 25 && (
          <Text style={shareStyles.sugarWarning}>⚠️ 糖份 {totalSugar}g ⚠️</Text>
        )}

        {/* Branding */}
        <View style={shareStyles.branding}>
          <Text style={shareStyles.brandName}>My Fit{"\n"}Monster</Text>
        </View>

        {/* Share action */}
        <TouchableOpacity style={shareStyles.shareAction} onPress={handleShare} activeOpacity={0.7}>
          <Text style={shareStyles.shareActionText}>📤 分享到社交媒體</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

function MacroBar({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <View style={shareStyles.macroItem}>
      <Text style={shareStyles.macroLabel}>{label}</Text>
      <View style={shareStyles.macroBarBg}>
        <View style={[shareStyles.macroBarFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={shareStyles.macroPercent}>{percent}%</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { state: activity } = useActivity();
  const { state: dashCaring } = useCaring();

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
    ? (activeMonster.type === "powerlifter" || activeMonster.type === "powerlifter2" ? 2.0
      : activeMonster.type === "bodybuilder" || activeMonster.type === "bodybuilder2" ? 1.6
      : activeMonster.type === "physique" || activeMonster.type === "physique2" ? 1.4
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
    { title: t.questWalkingMaster, desc: t.questWalkingDescFull, progress: todaySteps, target: 20000, reward: 50, color: "#3B82F6" },
    { title: t.questStrengthTraining, desc: t.questStrengthDescFull, progress: activity.todayWorkoutMinutes, target: 30, reward: 100, color: "#F59E0B" },
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

          {/* Today's Meals — 3 Meal Boxes */}
          <MealBoxes activity={activity} colors={colors} />

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
              <View>
                <View style={[styles.bmrBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[styles.bmrBadgeText, { color: colors.primary }]}>
                    BMR: {profileData.bmr} kcal ({t.basedOnProfile})
                  </Text>
                </View>
                <Text style={[styles.bmrCitationText, { color: colors.muted }]}>
                  {t.bmrCitation}{" "}
                  <Text
                    style={{ color: colors.primary, textDecorationLine: "underline" }}
                    onPress={() => Linking.openURL("https://pubmed.ncbi.nlm.nih.gov/2305711/")}
                  >
                    {t.bmrSource}: Mifflin MD et al. (1990)
                  </Text>
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
            <View style={[styles.nutritionDivider, { backgroundColor: colors.border }]} />
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>🍬 糖分攝取</Text>
              <Text style={[styles.nutritionValue, { color: (activity.todaySugar || 0) > 25 ? colors.error : colors.foreground }]}>{activity.todaySugar || 0}g / 25g</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
              <View style={[styles.progressFill, { width: `${Math.min(((activity.todaySugar || 0) / 25) * 100, 100)}%`, backgroundColor: (activity.todaySugar || 0) > 25 ? colors.error : "#F59E0B" }]} />
            </View>
            {(activity.todaySugar || 0) > 25 && (
              <Text style={{ color: colors.error, fontSize: 11, marginTop: 4 }}>⚠️ 超過 WHO 建議每日添加糖上限 (25g)</Text>
            )}
          </View>

          {/* Monster Growth Status */}
          <View style={[styles.monsterGrowth, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.monsterGrowth}</Text>
            {activeMonster ? (
              <View style={styles.monsterGrowthRow}>
                <LinearGradient colors={["#DCFCE7", "#BBF7D0"]} style={styles.monsterThumbGradient}>
                  <Image
                    source={getMonsterImageForCaringState(activeMonster.type, activeMonster.stage, dashCaring.fullness, dashCaring.energy, dashCaring.mood, dashCaring.peakStateBuff)}
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
  bmrCitationText: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    paddingHorizontal: 2,
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

const mealStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  hint: {
    fontSize: 12,
    marginTop: -4,
  },
  boxRow: {
    flexDirection: "row",
    gap: 10,
  },
  mealBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 8,
  },
  mealImage: {
    width: "100%",
    height: 80,
  },
  mealPlaceholder: {
    width: "100%",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  mealLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  mealCal: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  shareBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 380,
    maxHeight: "90%",
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

const shareStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradient: {
    padding: 20,
    gap: 14,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#4ADE80",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  mealRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  mealPhotoBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  mealPhoto: {
    width: "100%",
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4ADE80",
  },
  mealPhotoEmpty: {
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  mealPhotoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  macroRow: {
    width: "100%",
    gap: 6,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  macroLabel: {
    width: 55,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  macroBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  macroBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  macroPercent: {
    width: 36,
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textAlign: "right",
  },
  statsSection: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  monsterInfo: {
    alignItems: "center",
    gap: 4,
  },
  monsterName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  levelBadge: {
    fontSize: 18,
    fontWeight: "900",
    color: "#4ADE80",
  },
  expBadge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFD700",
  },
  totalCal: {
    fontSize: 48,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    marginTop: -4,
  },
  totalCalUnit: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    marginTop: -8,
  },
  sugarWarning: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FBBF24",
    textAlign: "center",
  },
  branding: {
    marginTop: 8,
    alignItems: "flex-start",
    width: "100%",
  },
  brandName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#4ADE80",
    lineHeight: 26,
  },
  shareAction: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  shareActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
