import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Linking, Modal } from "react-native";
import { useState, useCallback, useMemo, useRef } from "react";
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
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";

function WeeklyWorkoutStatsCard() {
  const colors = useColors();
  const { t, language } = useI18n();
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

function MealBoxes({ activity, colors, language }: { activity: any; colors: any; language: string }) {
  const isEn = language === 'en';
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
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{isEn ? "Today's Meals" : "今日三餐"}</Text>
      <Text style={[mealStyles.hint, { color: colors.muted }]}>
        {allThreeDone ? (isEn ? "All meals recorded! Share your results 🎉" : "三餐已記錄完成！可以分享今日成果 🎉") : (isEn ? "Complete all 3 meals to unlock sharing" : "拍完早午晚三餐即可解鎖分享功能")}
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
                {isEn ? info.labelEn : info.label}
              </Text>
              {log ? (
                <Text style={[mealStyles.mealCal, { color: colors.foreground }]}>{log.calories} kcal</Text>
              ) : (
                <Text style={[mealStyles.mealCal, { color: colors.muted }]}>{isEn ? 'None' : '未記錄'}</Text>
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
          {allThreeDone ? (isEn ? "📤 Share Today's Results" : "📤 分享今日操野成果") : (isEn ? "🔒 Complete all meals to unlock" : "🔒 完成三餐記錄後解鎖分享")}
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
              monsterName={activity.monsters?.[activity.activeMonsterIndex]?.name || (isEn ? "Monster" : "怪獸")}
              monsterLevel={activity.monsters?.[activity.activeMonsterIndex]?.level || 1}
              todayExp={activity.todayTotalExp}
              language={language}
            />
            <TouchableOpacity
              style={[mealStyles.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowShareCard(false)}
              activeOpacity={0.7}
            >
              <Text style={mealStyles.closeBtnText}>{isEn ? 'Close' : '關閉'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Daily Share Card (unified with Food page design) ──
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
  language,
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
  language: string;
}) {
  const { state: activity } = useActivity();
  const { state: caringState } = useCaring();
  const isEn = language === 'en';
  const activeIdx = activity.activeMonsterIndex;
  const activeMonster = activity.monsters.length > 0 && activeIdx < activity.monsters.length
    ? activity.monsters[activeIdx]
    : activity.monsters.length > 0 ? activity.monsters[0] : null;
  const maxMacro = Math.max(totalProtein, totalCarbs, totalFat, totalSugar, 1);
  const viewShotRef = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      setIsCapturing(true);
      const uri = await (viewShotRef.current as any)?.capture?.();
      setIsCapturing(false);
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: isEn ? `${monsterName}'s Daily Results` : `${monsterName} 的今日成果`,
        });
      } else {
        // Fallback to text share if image capture fails
        const { Share } = require("react-native");
        const msg = isEn
          ? `🍽️ Today's Results\n🔥 ${totalCal} kcal\n🥩 Protein ${totalProtein}g | 🍚 Carbs ${totalCarbs}g | 🧈 Fat ${totalFat}g\n🐾 ${monsterName} Lv.${monsterLevel} | +${todayExp} EXP\n#MyFitMonster`
          : `🍽️ 今日操野成果\n🔥 ${totalCal} kcal\n🥩 蛋白質 ${totalProtein}g | 🍚 碳水 ${totalCarbs}g | 🧈 脂肪 ${totalFat}g\n🐾 ${monsterName} Lv.${monsterLevel} | +${todayExp} EXP\n#MyFitMonster #健身怪獸`;
        await Share.share({ message: msg });
      }
    } catch {
      setIsCapturing(false);
    }
  }, [totalCal, totalProtein, totalCarbs, totalFat, totalSugar, monsterName, monsterLevel, todayExp, isEn]);

  return (
    <View style={shareStyles.card}>
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={shareStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Monster Image + Name */}
        <View style={shareStyles.headerSection}>
          {activeMonster && (
            <Image
              source={getMonsterImageForCaringState(activeMonster.type, activeMonster.stage, caringState.fullness, caringState.energy, caringState.mood, caringState.peakStateBuff)}
              style={shareStyles.monsterImg}
              contentFit="contain"
            />
          )}
          <Text style={shareStyles.monsterNameText}>{monsterName}</Text>
        </View>

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
              <Text style={shareStyles.mealPhotoLabel}>{isEn ? MEAL_LABELS[type].labelEn : MEAL_LABELS[type].label}</Text>
            </View>
          ))}
        </View>

        {/* Macro Bars (grams, not percentage) */}
        <View style={shareStyles.macroRow}>
          {[
            { label: isEn ? "Protein" : "蛋白質", value: totalProtein, color: "#4ADE80" },
            { label: isEn ? "Carbs" : "碳水", value: totalCarbs, color: "#60A5FA" },
            { label: isEn ? "Fat" : "脂肪", value: totalFat, color: "#FBBF24" },
            { label: isEn ? "Sugar" : "糖分", value: totalSugar, color: "#F97316" },
          ].map((macro, i) => (
            <View key={i} style={shareStyles.macroItem}>
              <Text style={shareStyles.macroLabel}>{macro.label}</Text>
              <View style={shareStyles.macroBarBg}>
                <View style={[shareStyles.macroBarFill, { width: `${Math.min((macro.value / maxMacro) * 100, 100)}%`, backgroundColor: macro.color }]} />
              </View>
              <Text style={shareStyles.macroValue}>{macro.value}g</Text>
            </View>
          ))}
        </View>

        {/* Total Calories */}
        <View style={shareStyles.kcalSection}>
          <Text style={shareStyles.totalCal}>{totalCal}</Text>
          <Text style={shareStyles.totalCalUnit}>{isEn ? 'kcal Total' : 'kcal 總熱量'}</Text>
        </View>

        {/* Sugar Warning */}
        {totalSugar > 25 && (
          <Text style={shareStyles.sugarWarning}>{isEn ? `⚠️ Sugar ${totalSugar}g over limit!` : `⚠️ 糖分 ${totalSugar}g 超過建議量!`}</Text>
        )}

        {/* Branding - logo left, text right */}
        <View style={shareStyles.branding}>
          <Image source={require('@/assets/images/monster-battle-logo.jpg')} style={shareStyles.brandImg} contentFit="cover" />
          <Text style={shareStyles.brandName}>My Fit Monster</Text>
        </View>
      </LinearGradient>
      </ViewShot>

      {/* Share action */}
      <TouchableOpacity style={[shareStyles.shareAction, { opacity: isCapturing ? 0.6 : 1 }]} onPress={handleShare} activeOpacity={0.7} disabled={isCapturing}>
        <Text style={shareStyles.shareActionText}>{isCapturing ? (isEn ? 'Capturing...' : '截圖中...') : (isEn ? '📸 Share Image' : '📸 分享圖片')}</Text>
      </TouchableOpacity>
    </View>
  );
}



export default function DashboardScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
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
          <MealBoxes activity={activity} colors={colors} language={language} />

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
              <Text style={[styles.nutritionLabel, { color: colors.muted }]}>🍬 {language === "zh" ? "糖分攝取" : "Sugar Intake"}</Text>
              <Text style={[styles.nutritionValue, { color: (activity.todaySugar || 0) > 25 ? colors.error : colors.foreground }]}>{activity.todaySugar || 0}g / 25g</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
              <View style={[styles.progressFill, { width: `${Math.min(((activity.todaySugar || 0) / 25) * 100, 100)}%`, backgroundColor: (activity.todaySugar || 0) > 25 ? colors.error : "#F59E0B" }]} />
            </View>
            {(activity.todaySugar || 0) > 25 && (
              <Text style={{ color: colors.error, fontSize: 11, marginTop: 4 }}>{language === 'en' ? '⚠️ Exceeds WHO daily added sugar limit (25g)' : '⚠️ 超過 WHO 建議每日添加糖上限 (25g)'}</Text>
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
    borderRadius: 24,
    overflow: "hidden",
  },
  gradient: {
    padding: 20,
    gap: 12,
    alignItems: "center",
  },
  headerSection: {
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  monsterImg: {
    width: 100,
    height: 100,
  },
  monsterNameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  mealRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    paddingHorizontal: 4,
  },
  mealPhotoBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  mealPhoto: {
    width: "100%",
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
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
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 8,
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
    color: "rgba(255,255,255,0.7)",
  },
  macroBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  macroBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  macroValue: {
    width: 50,
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    textAlign: "right",
  },
  kcalSection: {
    alignItems: "center",
    paddingVertical: 8,
  },
  totalCal: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
  },
  totalCalUnit: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  sugarWarning: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FBBF24",
    textAlign: "center",
  },
  branding: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    width: "100%",
    gap: 12,
  },
  brandImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  brandName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#4ADE80",
  },
  shareAction: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  shareActionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
