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
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useActivity } from "@/lib/activity-context";
import { useI18n } from "@/lib/i18n-context";

// MONSTER_TYPES is built inside the component to use i18n

const MONSTER_IMAGES: Record<string, any> = {
  "Bodybuilder-1": require("@/assets/monsters/bodybuilder-stage1.png"),
  "Bodybuilder-2": require("@/assets/monsters/bodybuilder-stage2.png"),
  "Bodybuilder-3": require("@/assets/monsters/bodybuilder-stage3.png"),
  "Physique-1": require("@/assets/monsters/physique-stage1.png"),
  "Physique-2": require("@/assets/monsters/physique-stage2.png"),
  "Physique-3": require("@/assets/monsters/physique-stage3.png"),
  "Powerlifter-1": require("@/assets/monsters/powerlifter-stage1.png"),
  "Powerlifter-2": require("@/assets/monsters/powerlifter-stage2.png"),
  "Powerlifter-3": require("@/assets/monsters/powerlifter-stage3.png"),
};

const MONSTER_GRADIENTS: Record<string, readonly [string, string]> = {
  Bodybuilder: ["#DCFCE7", "#BBF7D0"],
  Physique: ["#DBEAFE", "#BFDBFE"],
  Powerlifter: ["#FEF3C7", "#FDE68A"],
};

type Monster = {
  name: string;
  type: string;
  level: number;
  currentHp: number;
  maxHp: number;
  currentExp: number;
  expToNextLevel: number;
  strength: number;
  defense: number;
  agility: number;
  evolutionProgress: number;
  evolutionMax: number;
  status: string;
  stage: number;
};

// AI_DAILY_TASKS is now built inside the component to use i18n

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();

  const { state: activity, addRecordFood, addRecordWorkout } = useActivity();
  const { language, setLanguage, t, tr } = useI18n();

  const MONSTER_TYPES = [
    { type: "Bodybuilder", icon: "💪", color: "#EF4444", desc: t.bodybuilderDesc, label: t.bodybuilder, gradient: ["#FEE2E2", "#FECACA"] as const },
    { type: "Physique", icon: "🏃", color: "#3B82F6", desc: t.physiqueDesc, label: t.physique, gradient: ["#DBEAFE", "#BFDBFE"] as const },
    { type: "Powerlifter", icon: "🏋️", color: "#F59E0B", desc: t.powerlifterDesc, label: t.powerlifter, gradient: ["#FEF3C7", "#FDE68A"] as const },
  ];

  const AI_DAILY_TASKS = [
    {
      title: `💪 ${tr("todaysSuggestion", { type: t.bodybuilder })}`,
      totalExp: 700,
      workoutTitle: t.homePowerCrusher,
      workoutDesc: t.homePowerCrusherDesc,
      workoutExp: 300,
      duration: "30min",
      sets: "3×12",
      calories: "220cal",
      tips: [t.workoutTip1, t.workoutTip2],
      skill: t.proteinBlast,
      quote: t.ironQuote,
      dietTitle: t.proteinPowerMeal,
      dietDesc: t.proteinPowerMealDesc,
      dietExp: 400,
    },
  ];

  const trainerName = user?.name || "Trainer";
  const todaySteps = activity.todaySteps;
  const netExp = activity.todayTotalExp;
  const healthScore = Math.min(100, 50 + Math.round(activity.todayProtein * 0.2) + Math.round(activity.todayWorkoutMinutes * 0.3) + Math.round(activity.todaySteps * 0.002));
  const [coins, setCoins] = useState(350);
  const [activeTab, setActiveTab] = useState<"home" | "daily" | "history">("home");

  const [monsters, setMonsters] = useState<Monster[]>([
    {
      name: "Flexo", type: "Bodybuilder", level: 5, currentHp: 85, maxHp: 120,
      currentExp: 65, expToNextLevel: 100, strength: 22, defense: 15, agility: 12,
      evolutionProgress: 35, evolutionMax: 100, status: "Fighter", stage: 1,
    },
  ]);

  const [showHatchModal, setShowHatchModal] = useState(false);
  const [hatchStep, setHatchStep] = useState<"select" | "name" | "hatching" | "done">("select");
  const [selectedType, setSelectedType] = useState("");
  const [newMonsterName, setNewMonsterName] = useState("");
  const [showMonsterList, setShowMonsterList] = useState(false);

  // History tab state
  const [historySubTab, setHistorySubTab] = useState<"calories" | "macros" | "workout">("calories");
  const [dailyTaskView, setDailyTaskView] = useState<"workout" | "diet">("workout");
  const [historyViewMode, setHistoryViewMode] = useState<"chart" | "calendar" | "list">("chart");
  // Derive history stats from shared activity state
  const caloriesIn = activity.todayCaloriesIn;
  const caloriesBurned = activity.todayCaloriesBurned;
  const workoutDuration = activity.todayWorkoutMinutes;
  const avgProtein = activity.todayProtein;

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Add Record modal
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordType, setRecordType] = useState<"food" | "workout">("food");
  const [recordName, setRecordName] = useState("");
  const [recordCalories, setRecordCalories] = useState("");
  const [recordDuration, setRecordDuration] = useState("");

  // Chart data from shared activity state (weekly arrays)
  const chartData = {
    calories: activity.weeklyCalories,
    macros: activity.weeklyProtein,
    workout: activity.weeklyWorkout,
  };

  const quests = [
    { id: 1, icon: "🥩", title: t.questProteinChampion, description: t.questProteinDescFull, progress: activity.todayProtein, target: 100, reward: 50, bgColor: "#22C55E" },
    { id: 2, icon: "🚶", title: t.questWalkingMaster, description: t.questWalkingDescFull, progress: activity.todaySteps, target: 5000, reward: 50, bgColor: "#3B82F6" },
    { id: 3, icon: "💪", title: t.questStrengthTraining, description: t.questStrengthDescFull, progress: activity.todayWorkoutMinutes, target: 30, reward: 100, bgColor: "#F59E0B" },
  ];

  const activeMonster = monsters[0];
  const hpPercent = (activeMonster.currentHp / activeMonster.maxHp) * 100;
  const expPercent = (activeMonster.currentExp / activeMonster.expToNextLevel) * 100;
  const evoPercent = (activeMonster.evolutionProgress / activeMonster.evolutionMax) * 100;
  const completedQuests = quests.filter((q) => q.progress >= q.target).length;

  const handleHatchEgg = useCallback(() => {
    setHatchStep("select");
    setSelectedType("");
    setNewMonsterName("");
    setShowHatchModal(true);
  }, []);

  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type);
    setHatchStep("name");
  }, []);

  const handleConfirmHatch = useCallback(() => {
    if (!newMonsterName.trim()) {
      Alert.alert(t.nameRequired, t.pleaseNameMonster);
      return;
    }
    setHatchStep("hatching");
    setTimeout(() => {
      const baseStats: Record<string, { str: number; def: number; agi: number }> = {
        Bodybuilder: { str: 14, def: 10, agi: 8 },
        Physique: { str: 8, def: 8, agi: 14 },
        Powerlifter: { str: 16, def: 12, agi: 6 },
      };
      const stats = baseStats[selectedType] || { str: 10, def: 10, agi: 10 };
      const newMonster: Monster = {
        name: newMonsterName.trim(), type: selectedType, level: 1,
        currentHp: 100, maxHp: 100, currentExp: 0, expToNextLevel: 100,
        strength: stats.str, defense: stats.def, agility: stats.agi,
        evolutionProgress: 0, evolutionMax: 100, status: "Rookie", stage: 1,
      };
      setMonsters((prev) => [...prev, newMonster]);
      setHatchStep("done");
    }, 2000);
  }, [newMonsterName, selectedType]);

  const handleCloseHatch = useCallback(() => {
    setShowHatchModal(false);
  }, []);

  const handleToggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "zh" : "en");
  }, [language, setLanguage]);

  const handleLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace("/auth");
  }, [logout, router]);

  const handleAddRecord = useCallback(() => {
    setRecordType("food");
    setRecordName("");
    setRecordCalories("");
    setRecordDuration("");
    setShowAddRecord(true);
  }, []);

  const handleSaveRecord = useCallback(() => {
    if (!recordName.trim()) {
      Alert.alert(t.required, t.pleaseEnterName);
      return;
    }
    if (recordType === "food" && !recordCalories.trim()) {
      Alert.alert(t.required, t.pleaseEnterCalories);
      return;
    }
    if (recordType === "workout" && !recordDuration.trim()) {
      Alert.alert(t.required, t.pleaseEnterDuration);
      return;
    }
    setShowAddRecord(false);
    // Update shared activity state
    if (recordType === "food") {
      addRecordFood(recordName.trim(), parseInt(recordCalories, 10) || 0);
    } else {
      addRecordWorkout(recordName.trim(), parseInt(recordDuration, 10) || 0);
    }
    const detail = recordType === "food" ? `${recordCalories} kcal` : `${recordDuration} min`;
    Alert.alert(`${t.recordSaved} ✅`, `${recordName} — ${detail}\n${t.statsUpdated}`);
  }, [recordType, recordName, recordCalories, recordDuration, addRecordFood, addRecordWorkout]);

  const handleRefreshTasks = useCallback(() => {
    Alert.alert(t.refreshed, t.tasksUpdated);
  }, []);

  const handleStartWorkout = useCallback(() => {
    router.push("/(tabs)/workout");
  }, [router]);

  const renderMonsterCard = (monster: Monster, index: number) => {
    const isActive = index === 0;
    const hp = (monster.currentHp / monster.maxHp) * 100;
    const exp = (monster.currentExp / monster.expToNextLevel) * 100;
    const gradient = MONSTER_GRADIENTS[monster.type] || ["#DCFCE7", "#BBF7D0"];

    return (
      <View key={`${monster.name}-${index}`} style={[styles.monsterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: "#22C55E" }]}>
            <Text style={styles.badgeText}>Lv.{monster.level}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#3B82F6" }]}>
            <Text style={styles.badgeText}>{monster.type === "Bodybuilder" ? t.bodybuilder : monster.type === "Physique" ? t.physique : t.powerlifter}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
            <Text style={styles.badgeText}>{monster.status === "Fighter" ? t.fighter : monster.status === "Rookie" ? t.rookie : monster.status}</Text>
          </View>
        </View>

        <View style={styles.monsterImageContainer}>
          <LinearGradient colors={[gradient[0], gradient[1]]} style={styles.monsterGradientBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Image source={MONSTER_IMAGES[`${monster.type}-${monster.stage}`]} style={styles.monsterImage} contentFit="contain" />
          </LinearGradient>
          <Text style={[styles.monsterName, { color: colors.foreground }]}>{monster.name}</Text>
        </View>

        <View style={styles.barContainer}>
          <View style={styles.barLabelRow}>
            <Text style={[styles.barLabel, { color: colors.muted }]}>HP</Text>
            <Text style={[styles.barValue, { color: colors.muted }]}>{monster.currentHp}/{monster.maxHp}</Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${hp}%`, backgroundColor: "#22C55E" }]} />
          </View>
        </View>

        <View style={styles.barContainer}>
          <View style={styles.barLabelRow}>
            <Text style={[styles.barLabel, { color: colors.muted }]}>EXP</Text>
            <Text style={[styles.barValue, { color: colors.muted }]}>{monster.currentExp}/{monster.expToNextLevel}</Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${exp}%`, backgroundColor: "#8B5CF6" }]} />
          </View>
        </View>

        <View style={styles.monsterStatsRow}>
          <View style={styles.monsterStat}><Text style={styles.monsterStatIcon}>🥩</Text><Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{monster.strength}</Text></View>
          <View style={styles.monsterStat}><Text style={styles.monsterStatIcon}>🛡️</Text><Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{monster.defense}</Text></View>
          <View style={styles.monsterStat}><Text style={styles.monsterStatIcon}>⚡</Text><Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{monster.agility}</Text></View>
        </View>

        <View style={styles.barContainer}>
          <View style={styles.barLabelRow}>
            <Text style={[styles.barLabel, { color: colors.muted }]}>{t.evolution}</Text>
            <Text style={[styles.barValue, { color: colors.muted }]}>{monster.evolutionProgress}/{monster.evolutionMax}</Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${(monster.evolutionProgress / monster.evolutionMax) * 100}%`, backgroundColor: "#F59E0B" }]} />
          </View>
        </View>

        {/* Monster Action Buttons */}
        <View style={styles.monsterActions}>
          <TouchableOpacity
            style={[styles.monsterActionBtn, { backgroundColor: "#3B82F6" }]}
            onPress={() => router.push("/(tabs)/workout")}
          >
            <Text style={styles.monsterActionIcon}>🏋️</Text>
            <Text style={styles.monsterActionText}>{t.train}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.monsterActionBtn, { backgroundColor: "#22C55E" }]}
            onPress={() => router.push("/(tabs)/camera")}
          >
            <Text style={styles.monsterActionIcon}>🍖</Text>
            <Text style={styles.monsterActionText}>{t.feed}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.monsterActionBtn, { backgroundColor: "#EF4444" }]}
            onPress={() => router.push("/(tabs)/battle")}
          >
            <Text style={styles.monsterActionIcon}>⚔️</Text>
            <Text style={styles.monsterActionText}>{t.battle}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHomeTab = () => (
    <>
      {/* My Monster Team */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.myMonsterTeam}</Text>
        <TouchableOpacity onPress={() => setShowMonsterList(true)}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>{t.viewAll}</Text>
        </TouchableOpacity>
      </View>

      {renderMonsterCard(activeMonster, 0)}

      {/* Hatch Egg Button */}
      <TouchableOpacity style={[styles.hatchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleHatchEgg}>
        <Text style={styles.hatchIcon}>🥚</Text>
        <Text style={[styles.hatchText, { color: colors.foreground }]}>{t.hatchEgg}</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <TouchableOpacity style={styles.actionBtnInner} onPress={() => router.push("/(tabs)/camera")}>
          <Text style={styles.actionIcon}>📸</Text>
          <View><Text style={styles.actionTitle}>{t.photoFeed}</Text><Text style={styles.actionSubtitle}>{t.scanFoodAnalysis}</Text></View>
        </TouchableOpacity>
      </LinearGradient>

      <LinearGradient colors={["#3B82F6", "#2563EB"]} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <TouchableOpacity style={styles.actionBtnInner} onPress={() => router.push("/(tabs)/battle")}>
          <Text style={styles.actionIcon}>⚔️</Text>
          <View><Text style={styles.actionTitle}>{t.quickBattle}</Text><Text style={styles.actionSubtitle}>{t.pvpMatching}</Text></View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Daily Quests */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.dailyQuests}</Text>
        <Text style={[styles.questCount, { color: colors.muted }]}>{completedQuests}/3 {t.completed}</Text>
      </View>

      {quests.map((quest) => (
        <View key={quest.id} style={[styles.questCard, { backgroundColor: quest.bgColor }]}>
          <View style={styles.questHeader}>
            <Text style={styles.questIcon}>{quest.icon}</Text>
            <View style={styles.questInfo}>
              <Text style={styles.questTitle}>{quest.title}</Text>
              <Text style={styles.questDesc}>{quest.description}</Text>
            </View>
            <View style={styles.questReward}><Text style={styles.rewardText}>+{quest.reward} 🪙</Text></View>
          </View>
          <View style={[styles.questBarTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <View style={[styles.questBarFill, { width: `${quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0}%` }]} />
          </View>
          <Text style={styles.questProgress}>{quest.progress}/{quest.target}</Text>
        </View>
      ))}
    </>
  );

  const renderDailyTasksTab = () => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>✨ {t.aiDailyTasks}</Text>
        <TouchableOpacity onPress={handleRefreshTasks}><Text style={[styles.viewAll, { color: colors.primary }]}>{t.refresh}</Text></TouchableOpacity>
      </View>

      {AI_DAILY_TASKS.map((task, idx) => (
        <View key={idx} style={[styles.dailyTaskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.taskHeader}>
            <Text style={[styles.taskTitle, { color: colors.foreground }]}>✨ {task.title}</Text>
            <View style={[styles.expBadge, { backgroundColor: "#DCFCE7" }]}>
              <Text style={[styles.expBadgeText, { color: "#16A34A" }]}>+{task.totalExp} EXP</Text>
            </View>
          </View>

          {/* Completion Progress */}
          <Text style={[styles.completionLabel, { color: colors.muted }]}>{t.completionProgress}</Text>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: dailyTaskView === "workout" ? `${Math.min((completedQuests / 3) * 100, 100)}%` : "33%", backgroundColor: "#22C55E" }]} />
          </View>

          {/* Workout / Diet toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.background }]}>
            <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: dailyTaskView === "workout" ? "#22C55E" : "transparent" }]} onPress={() => setDailyTaskView("workout")}>
              <Text style={dailyTaskView === "workout" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>🏋️ {t.workout}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: dailyTaskView === "diet" ? "#22C55E" : "transparent" }]} onPress={() => setDailyTaskView("diet")}>
              <Text style={dailyTaskView === "diet" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>🍽️ {t.diet}</Text>
            </TouchableOpacity>
          </View>

          {dailyTaskView === "diet" ? (
            /* Diet Suggestion Card */
            <LinearGradient colors={["#F0FDF4", "#DCFCE7"]} style={styles.suggestionCard}>
              <View style={styles.suggestionHeader}>
                <Text style={[styles.suggestionTitle, { color: "#1A1A2E" }]}>{task.dietTitle}</Text>
                <View style={[styles.expBadge, { backgroundColor: "#BBF7D0" }]}>
                  <Text style={[styles.expBadgeText, { color: "#16A34A" }]}>+{task.dietExp} EXP</Text>
                </View>
              </View>
              <Text style={[styles.suggestionDesc, { color: "#6B7280" }]}>{task.dietDesc}</Text>

              <View style={styles.workoutMetrics}>
                <View style={styles.metric}><Text style={styles.metricIcon}>🥩</Text><Text style={styles.metricValue}>{tr("proteinMetric", { amount: "120" })}</Text></View>
                <View style={styles.metric}><Text style={styles.metricIcon}>🍞</Text><Text style={styles.metricValue}>{tr("carbsMetric", { amount: "200" })}</Text></View>
                <View style={styles.metric}><Text style={styles.metricIcon}>🧈</Text><Text style={styles.metricValue}>{tr("fatMetric", { amount: "65" })}</Text></View>
              </View>

              <View style={styles.tipRow}>
                <Text style={styles.tipBullet}>💡</Text>
                <Text style={[styles.tipText, { color: "#6B7280" }]}>{t.dietTip1}</Text>
              </View>
              <View style={styles.tipRow}>
                <Text style={styles.tipBullet}>💡</Text>
                <Text style={[styles.tipText, { color: "#6B7280" }]}>{t.dietTip2}</Text>
              </View>

              <TouchableOpacity onPress={() => router.push("/(tabs)/camera")}>
                <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.workoutBtn}>
                  <Text style={styles.workoutBtnText}>🍖 {t.logMeal}  ›</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.skillRow}>
                <Text style={styles.skillLabel}>⚡ {t.completeToUnlockSkill}</Text>
                <View style={[styles.skillBadge, { backgroundColor: "#22C55E" }]}>
                  <Text style={styles.skillBadgeText}>{t.nutritionBoost}</Text>
                </View>
              </View>
            </LinearGradient>
          ) : (
          /* Workout Suggestion Card */
          <LinearGradient colors={["#FFF7ED", "#FFEDD5"]} style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={[styles.suggestionTitle, { color: "#1A1A2E" }]}>{task.workoutTitle}</Text>
              <View style={[styles.expBadge, { backgroundColor: "#FED7AA" }]}>
                <Text style={[styles.expBadgeText, { color: "#C2410C" }]}>+{task.workoutExp} EXP</Text>
              </View>
            </View>
            <Text style={[styles.suggestionDesc, { color: "#6B7280" }]}>{task.workoutDesc}</Text>

            <View style={styles.workoutMetrics}>
              <View style={styles.metric}><Text style={styles.metricIcon}>🕐</Text><Text style={styles.metricValue}>{task.duration}</Text></View>
              <View style={styles.metric}><Text style={styles.metricIcon}>⚙️</Text><Text style={styles.metricValue}>{task.sets}</Text></View>
              <View style={styles.metric}><Text style={styles.metricIcon}>🔥</Text><Text style={styles.metricValue}>{task.calories}</Text></View>
            </View>

            {task.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipBullet}>💡</Text>
                <Text style={[styles.tipText, { color: "#6B7280" }]}>{tip}</Text>
              </View>
            ))}

            <TouchableOpacity onPress={handleStartWorkout}>
              <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.workoutBtn}>
                <Text style={styles.workoutBtnText}>🏋️ {t.workout}  ›</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>⚡ {t.completeToUnlockSkill}</Text>
              <View style={[styles.skillBadge, { backgroundColor: "#22C55E" }]}>
                <Text style={styles.skillBadgeText}>{task.skill}</Text>
              </View>
            </View>
          </LinearGradient>
          )}

          <Text style={[styles.quoteText, { color: colors.muted }]}>{task.quote}</Text>
        </View>
      ))}
    </>
  );

  const renderHistoryTab = () => (
    <>
      {/* Stats Cards Row */}
      <View style={styles.historyStatsRow}>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#EF4444" }]}>🍽️ {t.caloriesIn}</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{caloriesIn}</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>{t.thisWeek} kcal</Text>
        </View>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#F59E0B" }]}>🔥 {t.caloriesBurned}</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{caloriesBurned}</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>{t.thisWeek} kcal</Text>
        </View>
      </View>
      <View style={styles.historyStatsRow}>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#3B82F6" }]}>🏋️ {t.workoutDuration}</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{workoutDuration}</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>{t.thisWeek} min</Text>
        </View>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#22C55E" }]}>🥩 {t.avgProtein}</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{avgProtein}g</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>{t.dailyAvg}</Text>
        </View>
      </View>

      {/* Sub-tabs */}
      <View style={[styles.subTabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(["calories", "macros", "workout"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTab, historySubTab === tab && { backgroundColor: colors.primary }]}
            onPress={() => setHistorySubTab(tab)}
          >
            <Text style={[styles.subTabText, { color: historySubTab === tab ? "#fff" : colors.muted }]}>
              {tab === "calories" ? t.caloriesTab : tab === "macros" ? t.macrosTab : t.workoutTab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* View toggle icons */}
      <View style={styles.viewToggleRow}>
        <View style={styles.viewToggleIcons}>
          <TouchableOpacity style={[styles.viewToggleBtn, { backgroundColor: historyViewMode === "chart" ? colors.primary : colors.surface }]} onPress={() => setHistoryViewMode("chart")}>
            <Text style={{ color: historyViewMode === "chart" ? "#fff" : colors.muted, fontSize: 14 }}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewToggleBtn, { backgroundColor: historyViewMode === "calendar" ? colors.primary : colors.surface }]} onPress={() => setHistoryViewMode("calendar")}>
            <Text style={{ color: historyViewMode === "calendar" ? "#fff" : colors.muted, fontSize: 14 }}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewToggleBtn, { backgroundColor: historyViewMode === "list" ? colors.primary : colors.surface }]} onPress={() => setHistoryViewMode("list")}>
            <Text style={{ color: historyViewMode === "list" ? "#fff" : colors.muted, fontSize: 14 }}>📋</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleAddRecord}>
          <View style={[styles.addRecordInline, { backgroundColor: colors.primary }]}>
            <Text style={styles.addRecordInlineText}>+ {t.addRecord}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Chart / Calendar / List view */}
      {historyViewMode === "chart" && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>
            {historySubTab === "calories" ? `🔥 ${t.dailyCalorieTrend}` : historySubTab === "macros" ? `🥩 ${t.dailyProteinTrend}` : `🏋️ ${t.workoutDurationTrend}`}
          </Text>
          <View style={styles.chartArea}>
            {[t.daySat, t.daySun, t.dayMon, t.dayTue, t.dayWed, t.dayThu, t.dayFri].map((day, i) => {
              const data = chartData[historySubTab];
              const maxVal = Math.max(...data);
              const barHeight = maxVal > 0 ? Math.max(4, (data[i] / maxVal) * 70) : 4;
              const isToday = i === 6;
              return (
                <View key={day} style={styles.chartCol}>
                  <Text style={[styles.chartBarValue, { color: colors.muted }]}>
                    {historySubTab === "calories" ? Math.round(data[i] / 100) : data[i]}
                  </Text>
                  <View style={[styles.chartBar, { height: barHeight, backgroundColor: isToday ? colors.primary : "#E5E7EB" }]} />
                  <Text style={[styles.chartDay, { color: colors.muted }]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {historyViewMode === "calendar" && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>📅 {t.weeklyCalendar}</Text>
          <View style={styles.calendarGrid}>
            {[t.daySat, t.daySun, t.dayMon, t.dayTue, t.dayWed, t.dayThu, t.dayFri].map((day, i) => {
              const data = chartData[historySubTab];
              const hasData = data[i] > 0;
              const isToday = i === 6;
              return (
                <View key={day} style={[styles.calendarDay, { backgroundColor: isToday ? colors.primary : hasData ? "#DCFCE7" : colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.calendarDayLabel, { color: isToday ? "#fff" : colors.muted }]}>{day}</Text>
                  <Text style={[styles.calendarDayValue, { color: isToday ? "#fff" : colors.foreground }]}>
                    {historySubTab === "calories" ? `${Math.round(data[i])}` : `${data[i]}`}
                  </Text>
                  {hasData && <Text style={{ fontSize: 10, color: isToday ? "#fff" : "#22C55E" }}>✓</Text>}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {historyViewMode === "list" && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>📋 {t.dailyRecords}</Text>
          {[t.daySat, t.daySun, t.dayMon, t.dayTue, t.dayWed, t.dayThu, t.dayFri].map((day, i) => {
            const data = chartData[historySubTab];
            const unit = historySubTab === "calories" ? t.kcalUnit : historySubTab === "macros" ? t.gProtein : t.minUnit;
            const isToday = i === 6;
            return (
              <View key={day} style={[styles.listRow, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {isToday && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
                  <Text style={[styles.listDay, { color: isToday ? colors.primary : colors.foreground }]}>{day}{isToday ? ` (${t.today})` : ""}</Text>
                </View>
                <Text style={[styles.listValue, { color: data[i] > 0 ? colors.foreground : colors.muted }]}>
                  {data[i] > 0 ? `${data[i]} ${unit}` : "—"}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.foreground }]}>{tr("greeting", { name: trainerName })}</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>{t.stayHealthy}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={[styles.langBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleToggleLanguage}>
                <Text style={[styles.langBtnText, { color: colors.primary }]}>{language === "en" ? "中" : "EN"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]} onPress={handleLogout}>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Card */}
          <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.statsCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.statsLeft}>
              <Text style={styles.heartIcon}>🤍</Text>
              <Text style={styles.statValueLg}>{healthScore}</Text>
              <Text style={styles.statLabelLg}>{t.healthScore}</Text>
            </View>
            <View style={styles.statsRight}>
              <View style={styles.statSmall}>
                <Text style={styles.statSmallIcon}>👣</Text>
                <Text style={styles.statSmallValue}>{todaySteps}</Text>
                <Text style={styles.statSmallLabel}>{t.steps}</Text>
              </View>
              <View style={styles.statSmall}>
                <Text style={styles.statSmallIcon}>✨</Text>
                <Text style={styles.statSmallValue}>{netExp} {t.netExp}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Tab Navigation: Home / Daily Tasks / History */}
          <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.tab, activeTab === "home" && styles.activeTab]} onPress={() => setActiveTab("home")}>
              <Text style={[styles.tabText, { color: activeTab === "home" ? colors.foreground : colors.muted }]}>🏠 {t.homeTabs.home}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === "daily" && styles.activeTab]} onPress={() => setActiveTab("daily")}>
              <Text style={[styles.tabText, { color: activeTab === "daily" ? colors.foreground : colors.muted }]}>📋 {t.homeTabs.dailyTasks}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === "history" && styles.activeTab]} onPress={() => setActiveTab("history")}>
              <Text style={[styles.tabText, { color: activeTab === "history" ? colors.foreground : colors.muted }]}>🕐 {t.homeTabs.history}</Text>
            </TouchableOpacity>
          </View>

          {activeTab === "home" && renderHomeTab()}
          {activeTab === "daily" && renderDailyTasksTab()}
          {activeTab === "history" && renderHistoryTab()}
        </View>
      </ScrollView>

      {/* View All Monsters Modal */}
      <Modal visible={showMonsterList} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{tr("myMonsterTeamCount", { count: String(monsters.length) })}</Text>
              <TouchableOpacity onPress={() => setShowMonsterList(false)}>
                <IconSymbol name="xmark" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 500 }}>
              {monsters.map((m, i) => renderMonsterCard(m, i))}
            </ScrollView>
            <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowMonsterList(false); handleHatchEgg(); }}>
              <Text style={styles.hatchConfirmText}>🥚 {t.hatchNewEgg}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Hatch Egg Modal */}
      <Modal visible={showHatchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {hatchStep === "select" && (
              <>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.chooseMonsterType}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{t.selectTypeToHatch}</Text>
                {MONSTER_TYPES.map((mt) => (
                  <TouchableOpacity key={mt.type} style={[styles.typeOption, { backgroundColor: colors.surface, borderColor: mt.color }]} onPress={() => handleSelectType(mt.type)}>
                    <Text style={styles.typeIcon}>{mt.icon}</Text>
                    <View style={styles.typeInfo}>
                      <Text style={[styles.typeName, { color: colors.foreground }]}>{mt.label || mt.type}</Text>
                      <Text style={[styles.typeDesc, { color: colors.muted }]}>{mt.desc}</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.muted} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowHatchModal(false)}>
                  <Text style={[styles.cancelText, { color: colors.muted }]}>{t.cancel}</Text>
                </TouchableOpacity>
              </>
            )}

            {hatchStep === "name" && (
              <>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.nameYourMonster}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{tr("giveYourMonsterName", { type: selectedType === "Bodybuilder" ? t.bodybuilder : selectedType === "Physique" ? t.physique : t.powerlifter })}</Text>
                <View style={styles.eggPreview}>
                  <LinearGradient colors={MONSTER_TYPES.find((t) => t.type === selectedType)?.gradient || ["#DCFCE7", "#BBF7D0"]} style={styles.eggGradient}>
                    <Image source={require("@/assets/monsters/egg.png")} style={styles.eggImage} contentFit="contain" />
                  </LinearGradient>
                </View>
                <TextInput
                  style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  placeholder={t.enterMonsterName}
                  placeholderTextColor={colors.muted}
                  value={newMonsterName}
                  onChangeText={setNewMonsterName}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmHatch}
                />
                <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirmHatch}>
                  <Text style={styles.hatchConfirmText}>{t.hatch}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setHatchStep("select")}>
                  <Text style={[styles.cancelText, { color: colors.muted }]}>{t.cancel}</Text>
                </TouchableOpacity>
              </>
            )}

            {hatchStep === "hatching" && (
              <View style={styles.hatchingContainer}>
                <Text style={styles.hatchingEmoji}>🥚✨</Text>
                <Text style={[styles.hatchingText, { color: colors.foreground }]}>{t.hatching}</Text>
                <Text style={[styles.hatchingSubtext, { color: colors.muted }]}>{t.eggCracking}</Text>
              </View>
            )}

            {hatchStep === "done" && (
              <View style={styles.hatchingContainer}>
                <LinearGradient colors={MONSTER_GRADIENTS[selectedType] || ["#DCFCE7", "#BBF7D0"]} style={styles.hatchedGradient}>
                  <Image source={MONSTER_IMAGES[`${selectedType}-1`]} style={styles.hatchedImage} contentFit="contain" />
                </LinearGradient>
                <Text style={[styles.hatchedTitle, { color: colors.foreground }]}>{tr("monsterBorn", { name: newMonsterName })}</Text>
                <Text style={[styles.hatchedSubtitle, { color: colors.muted }]}>{tr("newMonsterJoins", { type: selectedType === "Bodybuilder" ? t.bodybuilder : selectedType === "Physique" ? t.physique : t.powerlifter })}</Text>
                <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleCloseHatch}>
                  <Text style={styles.hatchConfirmText}>{t.awesome}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Record Modal */}
      <Modal visible={showAddRecord} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.addRecordTitle}</Text>
              <TouchableOpacity onPress={() => setShowAddRecord(false)}>
                <IconSymbol name="xmark" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Record Type Toggle */}
            <View style={[styles.toggleRow, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: recordType === "food" ? colors.primary : "transparent" }]}
                onPress={() => setRecordType("food")}
              >
                <Text style={recordType === "food" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>
                  🍽️ {t.food}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: recordType === "workout" ? colors.primary : "transparent" }]}
                onPress={() => setRecordType("workout")}
              >
                <Text style={recordType === "workout" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>
                  🏋️ {t.workout}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Record Name */}
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder={recordType === "food" ? t.foodNameExample : t.exerciseNameExample}
              placeholderTextColor={colors.muted}
              value={recordName}
              onChangeText={setRecordName}
            />

            {/* Calories or Duration */}
            {recordType === "food" ? (
              <TextInput
                style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                placeholder={t.caloriesKcalPlaceholder}
                placeholderTextColor={colors.muted}
                value={recordCalories}
                onChangeText={setRecordCalories}
                keyboardType="numeric"
              />
            ) : (
              <TextInput
                style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                placeholder={t.durationMinPlaceholder}
                placeholderTextColor={colors.muted}
                value={recordDuration}
                onChangeText={setRecordDuration}
                keyboardType="numeric"
              />
            )}

            <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleSaveRecord}>
              <Text style={styles.hatchConfirmText}>✅ {t.saveRecord}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowAddRecord(false)}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 }]}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>👋</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: "center", marginBottom: 8 }]}>{t.logoutTitle}</Text>
            <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 }}>{t.logoutMessage}</Text>
            <TouchableOpacity
              onPress={confirmLogout}
              style={{ backgroundColor: "#EF4444", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: "100%", alignItems: "center", marginBottom: 10 }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{t.logoutConfirm}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowLogoutModal(false)}
              style={[styles.cancelBtn, { borderColor: colors.border, width: "100%" }]}
            >
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
  headerActions: { flexDirection: "row", gap: 8 },
  greeting: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 2 },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  langBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  langBtnText: { fontSize: 16, fontWeight: "800" },

  // Stats Card
  statsCard: { borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center" },
  statsLeft: { flex: 1, alignItems: "flex-start" },
  heartIcon: { fontSize: 28, marginBottom: 4 },
  statValueLg: { fontSize: 36, fontWeight: "900", color: "#fff" },
  statLabelLg: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  statsRight: { gap: 8 },
  statSmall: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statSmallIcon: { fontSize: 16 },
  statSmallValue: { color: "#fff", fontSize: 14, fontWeight: "700" },
  statSmallLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12 },

  // Tabs
  tabRow: { flexDirection: "row", borderRadius: 12, padding: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#22C55E" },
  tabText: { fontSize: 13, fontWeight: "600" },

  // Section
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  viewAll: { fontSize: 14, fontWeight: "600" },

  // Monster Card
  monsterCard: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 8 },
  badgesRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  monsterImageContainer: { alignItems: "center", marginBottom: 12 },
  monsterGradientBg: { borderRadius: 20, padding: 16, alignItems: "center", justifyContent: "center", width: 200, height: 200 },
  monsterImage: { width: 170, height: 170 },
  monsterName: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  barContainer: { marginBottom: 8 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { fontSize: 12, fontWeight: "600" },
  barValue: { fontSize: 12 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  monsterStatsRow: { flexDirection: "row", justifyContent: "center", gap: 32, marginVertical: 12 },
  monsterStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  monsterStatIcon: { fontSize: 18 },
  monsterStatValue: { fontSize: 16, fontWeight: "700" },

  // Hatch
  hatchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", gap: 8 },
  hatchIcon: { fontSize: 24 },
  hatchText: { fontSize: 16, fontWeight: "600" },

  // Actions
  actionBtn: { borderRadius: 16, overflow: "hidden" },
  actionBtnInner: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  actionIcon: { fontSize: 28 },
  actionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  actionSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13 },

  // Quests
  questCount: { fontSize: 14 },
  questCard: { borderRadius: 16, padding: 16 },
  questHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  questIcon: { fontSize: 28 },
  questInfo: { flex: 1 },
  questTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  questDesc: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  questReward: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rewardText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  questBarTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  questBarFill: { height: "100%", borderRadius: 3, backgroundColor: "rgba(255,255,255,0.8)" },
  questProgress: { color: "rgba(255,255,255,0.7)", fontSize: 11, textAlign: "right" },

  // Daily Tasks
  dailyTaskCard: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 12 },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  taskTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  expBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  expBadgeText: { fontSize: 12, fontWeight: "700" },
  completionLabel: { fontSize: 13 },
  toggleRow: { flexDirection: "row", borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  toggleBtnTextInactive: { fontSize: 14, fontWeight: "600" },
  suggestionCard: { borderRadius: 16, padding: 16, gap: 10 },
  suggestionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  suggestionTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  suggestionDesc: { fontSize: 13, lineHeight: 20 },
  workoutMetrics: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  metric: { alignItems: "center", gap: 4 },
  metricIcon: { fontSize: 18 },
  metricValue: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  tipRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  tipBullet: { fontSize: 14 },
  tipText: { fontSize: 13, flex: 1, lineHeight: 20 },
  workoutBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  workoutBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skillRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skillLabel: { fontSize: 13, color: "#6B7280" },
  skillBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  skillBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  quoteText: { fontSize: 13, fontStyle: "italic", textAlign: "center", lineHeight: 20 },

  // History
  historyStatsRow: { flexDirection: "row", gap: 12 },
  historyStatCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, gap: 4 },
  historyStatLabel: { fontSize: 12, fontWeight: "600" },
  historyStatValue: { fontSize: 28, fontWeight: "800" },
  historyStatSub: { fontSize: 12 },
  subTabRow: { flexDirection: "row", borderRadius: 12, padding: 4, borderWidth: 1 },
  subTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  subTabText: { fontSize: 13, fontWeight: "600" },
  chartCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  chartTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  chartArea: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 80 },
  chartCol: { alignItems: "center", gap: 4 },
  chartBar: { width: 24, borderRadius: 4 },
  chartDay: { fontSize: 11 },
  addRecordBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  addRecordText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  viewToggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  viewToggleIcons: { flexDirection: "row", gap: 8 },
  viewToggleBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addRecordInline: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4 },
  addRecordInlineText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  chartBarValue: { fontSize: 10, marginBottom: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, gap: 12, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 8 },
  typeOption: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 2, gap: 12 },
  typeIcon: { fontSize: 32 },
  typeInfo: { flex: 1 },
  typeName: { fontSize: 16, fontWeight: "700" },
  typeDesc: { fontSize: 13, marginTop: 2 },
  cancelBtn: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600" },
  eggPreview: { alignItems: "center", marginVertical: 16 },
  eggGradient: { borderRadius: 60, width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  eggImage: { width: 80, height: 80 },
  nameInput: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  hatchConfirmBtn: { padding: 16, borderRadius: 16, alignItems: "center" },
  hatchConfirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hatchingContainer: { alignItems: "center", paddingVertical: 40, gap: 12 },
  hatchingEmoji: { fontSize: 64 },
  hatchingText: { fontSize: 22, fontWeight: "800" },
  hatchingSubtext: { fontSize: 14 },
  hatchedGradient: { borderRadius: 20, width: 160, height: 160, alignItems: "center", justifyContent: "center" },
  hatchedImage: { width: 130, height: 130 },
  hatchedTitle: { fontSize: 22, fontWeight: "800", marginTop: 8 },
  hatchedSubtitle: { fontSize: 14 },

  // Calendar view
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  calendarDay: { width: 70, padding: 10, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  calendarDayLabel: { fontSize: 11, fontWeight: "600" },
  calendarDayValue: { fontSize: 14, fontWeight: "700" },

  // List view
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  listDay: { fontSize: 14, fontWeight: "600" },
  listValue: { fontSize: 14, fontWeight: "700" },
  todayDot: { width: 8, height: 8, borderRadius: 4 },

  // Monster Action Buttons
  monsterActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  monsterActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  monsterActionIcon: { fontSize: 16 },
  monsterActionText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
