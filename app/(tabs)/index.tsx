import { useState, useCallback, useEffect, useRef } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat, Easing } from "react-native-reanimated";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { AppState, Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { useAuth } from "@/hooks/use-auth";
import { useActivity } from "@/lib/activity-context";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc";
import { MonsterCaringPanel } from "@/components/monster-caring-panel";
import { useCaring } from "@/lib/caring-context";
import { getMonsterImageForCaringState } from "@/lib/monster-expressions";

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
  // Lowercase aliases (server stores types in lowercase)
  "bodybuilder-1": require("@/assets/monsters/bodybuilder-stage1.png"),
  "bodybuilder-2": require("@/assets/monsters/bodybuilder-stage2.png"),
  "bodybuilder-3": require("@/assets/monsters/bodybuilder-stage3.png"),
  "physique-1": require("@/assets/monsters/physique-stage1.png"),
  "physique-2": require("@/assets/monsters/physique-stage2.png"),
  "physique-3": require("@/assets/monsters/physique-stage3.png"),
  "powerlifter-1": require("@/assets/monsters/powerlifter-stage1.png"),
  "powerlifter-2": require("@/assets/monsters/powerlifter-stage2.png"),
  "powerlifter-3": require("@/assets/monsters/powerlifter-stage3.png"),
};

const MONSTER_GRADIENTS: Record<string, readonly [string, string]> = {
  Bodybuilder: ["#DCFCE7", "#BBF7D0"],
  Physique: ["#DBEAFE", "#BFDBFE"],
  Powerlifter: ["#FEF3C7", "#FDE68A"],
  // Lowercase aliases (server stores types in lowercase)
  bodybuilder: ["#DCFCE7", "#BBF7D0"],
  physique: ["#DBEAFE", "#BFDBFE"],
  powerlifter: ["#FEF3C7", "#FDE68A"],
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

  const { state: activity, setSteps, logFood, addRecordFood, addRecordWorkout, addMonster, setMonsters: setMonstersCtx, removeMonster, evolveMonster, checkEvolution, setActiveMonster } = useActivity();
  const { state: caringState, feedMonster: caringFeedMonster, exerciseMonster: caringExerciseMonster, refresh: refreshCaring } = useCaring();
  const isFocused = useIsFocused();
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

  // --- Auto Step Sync ---
  const lastSyncRef = useRef<number>(0);
  const SYNC_THROTTLE_MS = 30_000; // max once per 30 seconds

  const autoSyncSteps = useCallback(async () => {
    if (Platform.OS === "web") return;
    const now = Date.now();
    if (now - lastSyncRef.current < SYNC_THROTTLE_MS) return;
    lastSyncRef.current = now;
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted) return;
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, end);
      const realSteps = result?.steps || 0;
      if (realSteps > 0) {
        setSteps(realSteps);
      }
    } catch {
      // Silently fail — pedometer may not be available
    }
  }, [setSteps]);

  // Auto sync when home screen is focused
  useEffect(() => {
    if (isFocused) {
      autoSyncSteps();
    }
  }, [isFocused, autoSyncSteps]);

  // Auto sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isFocused) {
        autoSyncSteps();
      }
    });
    return () => subscription.remove();
  }, [isFocused, autoSyncSteps]);

  const trainerName = user?.name || "Trainer";
  const todaySteps = activity.todaySteps;
  const netExp = activity.todayTotalExp;
  const healthScore = Math.min(100, 50 + Math.round(activity.todayProtein * 0.2) + Math.round(activity.todayWorkoutMinutes * 0.3) + Math.round(activity.todaySteps * 0.002));

  // Dynamic day labels: weekly array is [6 days ago, 5 days ago, ..., yesterday, today]
  // We compute the correct day name for each slot based on today's actual day-of-week
  const allDayLabels = [t.daySun, t.dayMon, t.dayTue, t.dayWed, t.dayThu, t.dayFri, t.daySat];
  const todayDow = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const weekDayLabels = Array.from({ length: 7 }, (_, i) => {
    // i=0 is 6 days ago, i=6 is today
    const daysAgo = 6 - i;
    const dow = ((todayDow - daysAgo) % 7 + 7) % 7;
    return allDayLabels[dow];
  });

  const [activeTab, setActiveTab] = useState<"home" | "daily" | "history">("home");

  // Monsters are stored in the per-user activity context
  const monsters = activity.monsters;
  const setMonsters = setMonstersCtx;

  const [showHatchModal, setShowHatchModal] = useState(false);
  const [hatchStep, setHatchStep] = useState<"select" | "name" | "hatching" | "done">("select");
  const [selectedType, setSelectedType] = useState("");
  const [newMonsterName, setNewMonsterName] = useState("");
  const [showMonsterList, setShowMonsterList] = useState(false);

  // History tab state
  const [historySubTab, setHistorySubTab] = useState<"calories" | "macros" | "workout">("calories");
  const [macroSubTab, setMacroSubTab] = useState<"protein" | "carbs" | "fat">("protein");
  const [dailyTaskView, setDailyTaskView] = useState<"workout" | "diet">("workout");
  const [historyViewMode, setHistoryViewMode] = useState<"chart" | "calendar" | "list">("chart");
  // Derive history stats from shared activity state
  const caloriesIn = activity.todayCaloriesIn;
  const caloriesBurned = activity.todayCaloriesBurned;
  const workoutDuration = activity.todayWorkoutMinutes;
  // Calculate weekly averages for macros (divide by number of days with data, not fixed 7)
  const weeklyProteinArray = activity.weeklyProtein || [0,0,0,0,0,0,0];
  const weeklyCarbsArray = activity.weeklyCarbs || [0,0,0,0,0,0,0];
  const weeklyFatArray = activity.weeklyFat || [0,0,0,0,0,0,0];
  const proteinDaysWithData = weeklyProteinArray.filter(v => v > 0).length || 1;
  const carbsDaysWithData = weeklyCarbsArray.filter(v => v > 0).length || 1;
  const fatDaysWithData = weeklyFatArray.filter(v => v > 0).length || 1;
  const avgProtein = Math.round(weeklyProteinArray.reduce((sum, val) => sum + val, 0) / proteinDaysWithData);
  const avgCarbs = Math.round(weeklyCarbsArray.reduce((sum, val) => sum + val, 0) / carbsDaysWithData);
  const avgFat = Math.round(weeklyFatArray.reduce((sum, val) => sum + val, 0) / fatDaysWithData);

  // Evolution modal
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [evolutionData, setEvolutionData] = useState<{ monsterName: string; monsterType: string; newStage: number; monsterIndex: number } | null>(null);
  const [evolutionPhase, setEvolutionPhase] = useState<"glowing" | "evolved">("glowing");
  const evolutionScale = useSharedValue(1);
  const evolutionGlow = useSharedValue(0);

  // Helper to open evolution modal for a specific monster
  const openEvolutionModal = useCallback((monsterIndex: number) => {
    const m = monsters[monsterIndex];
    if (!m || m.stage >= 3) return;
    setEvolutionData({
      monsterName: m.name,
      monsterType: m.type,
      newStage: m.stage + 1,
      monsterIndex,
    });
    setEvolutionPhase("glowing");
    setShowEvolutionModal(true);
    // Start glow animation
    evolutionScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      3,
      true
    );
    evolutionGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.3, { duration: 600 })
      ),
      3,
      true
    );
  }, [monsters]);

  const handleEvolve = useCallback(() => {
    if (!evolutionData) return;
    evolveMonster(evolutionData.monsterIndex);
    setEvolutionPhase("evolved");
    // Big pop animation
    evolutionScale.value = withSequence(
      withTiming(0.5, { duration: 200 }),
      withTiming(1.3, { duration: 400, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 })
    );
  }, [evolutionData, evolveMonster]);

  const evolutionAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: evolutionScale.value }],
    opacity: 0.5 + evolutionGlow.value * 0.5,
  }));

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Delete account modal
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();

  // Add Record modal
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordType, setRecordType] = useState<"food" | "workout">("food");
  const [recordName, setRecordName] = useState("");
  const [recordDuration, setRecordDuration] = useState("");
  // AI food analysis state
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeTextMutation = trpc.foodLogs.analyzeText.useMutation();

  // Chart data from shared activity state (weekly arrays)
  const macroData = {
    protein: activity.weeklyProtein,
    carbs: activity.weeklyCarbs || [0,0,0,0,0,0,0],
    fat: activity.weeklyFat || [0,0,0,0,0,0,0],
  };
  const chartData = {
    calories: activity.weeklyCalories,
    macros: macroData[macroSubTab],
    workout: activity.weeklyWorkout,
  };

  const quests = [
    { id: 1, icon: "🥩", title: t.questProteinChampion, description: t.questProteinDescFull, progress: activity.todayProtein, target: 100, reward: 50, bgColor: "#22C55E" },
    { id: 2, icon: "🚶", title: t.questWalkingMaster, description: t.questWalkingDescFull, progress: activity.todaySteps, target: 20000, reward: 50, bgColor: "#3B82F6" },
    { id: 3, icon: "💪", title: t.questStrengthTraining, description: t.questStrengthDescFull, progress: activity.todayWorkoutMinutes, target: 30, reward: 100, bgColor: "#F59E0B" },
  ];

  const activeMonsterIdx = activity.activeMonsterIndex;
  const activeMonster = monsters.length > 0 ? (monsters[activeMonsterIdx] || monsters[0]) : null;
  const hpPercent = activeMonster ? (activeMonster.currentHp / activeMonster.maxHp) * 100 : 0;
  const expPercent = activeMonster ? (activeMonster.currentExp / activeMonster.expToNextLevel) * 100 : 0;
  const evoPercent = activeMonster ? (activeMonster.evolutionProgress / activeMonster.evolutionMax) * 100 : 0;
  const completedQuests = quests.filter((q) => q.progress >= q.target).length;
  const hasNoMonster = !activeMonster;

  const handleHatchEgg = useCallback(() => {
    if (monsters.length >= 3) {
      Alert.alert(t.teamFull, t.teamFullMessage);
      return;
    }
    setHatchStep("select");
    setSelectedType("");
    setNewMonsterName("");
    setShowHatchModal(true);
  }, [monsters.length, t]);

  const handleSelectActiveMonster = useCallback((index: number) => {
    if (index === activeMonsterIdx) return;
    setActiveMonster(index);
    const m = monsters[index];
    if (m) {
      Alert.alert(tr("switchedTo", { name: m.name }), tr("nowTraining", { name: m.name }));
    }
  }, [activeMonsterIdx, monsters, setActiveMonster, tr]);

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
      addMonster(newMonster);
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

  const handleDeleteAccount = useCallback(() => {
    setShowDeleteAccountModal(true);
  }, []);

  const confirmDeleteAccount = useCallback(async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccountMutation.mutateAsync();
      // Clear ALL local data after successful server-side deletion
      const Auth = await import("@/lib/_core/auth");
      const AsyncStorageMod = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorageMod.clear();
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setShowDeleteAccountModal(false);
      await logout();
      router.replace("/auth");
    } catch (err: any) {
      console.error("[DeleteAccount] tRPC error, trying direct fetch:", err);
      // Fallback: direct fetch if tRPC fails (e.g. missing session)
      try {
        const { getApiBaseUrl } = await import("@/constants/oauth");
        const Auth = await import("@/lib/_core/auth");
        const AsyncStorageMod = (await import("@react-native-async-storage/async-storage")).default;
        const baseUrl = getApiBaseUrl();
        const token = await Auth.getSessionToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["Cookie"] = `session=${token}`;
        }
        if (!token) {
          const raw = await AsyncStorageMod.getItem("@fitmonster_local_auth");
          if (raw) {
            const u = JSON.parse(raw);
            if (u.id) headers["X-User-Id"] = String(u.id);
            if (u.openId) headers["X-Open-Id"] = u.openId;
          }
        }
        const res = await fetch(`${baseUrl}/api/trpc/auth.deleteAccount?batch=1`, {
          method: "POST",
          headers,
          body: JSON.stringify({ "0": { "json": null } }),
          credentials: "include",
        });
        if (res.ok) {
          await AsyncStorageMod.clear();
          await Auth.removeSessionToken();
          await Auth.clearUserInfo();
          setShowDeleteAccountModal(false);
          await logout();
          router.replace("/auth");
          return;
        }
        const errText = await res.text().catch(() => "");
        console.error("[DeleteAccount] Fallback fetch error:", res.status, errText);
        throw new Error(errText || "Delete failed");
      } catch (fallbackErr: any) {
        console.error("[DeleteAccount] All attempts failed:", fallbackErr);
        if (Platform.OS === "web") {
          alert(t.deleteAccountError);
        } else {
          Alert.alert(t.deleteAccountError);
        }
      }
    } finally {
      setIsDeletingAccount(false);
    }
  }, [deleteAccountMutation, logout, router, t.deleteAccountError]);

  const handleAddRecord = useCallback(() => {
    setRecordType("food");
    setRecordName("");
    setRecordDuration("");
    setAiAnalysisResult(null);
    setIsAnalyzing(false);
    setShowAddRecord(true);
  }, []);

  const handleAiAnalyze = useCallback(async () => {
    if (!recordName.trim()) {
      Alert.alert(t.required, t.pleaseDescribeFood);
      return;
    }
    setIsAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const result = await analyzeTextMutation.mutateAsync({
        description: recordName.trim(),
        language: language as "en" | "zh",
      });
      setAiAnalysisResult(result.analysis);
    } catch (e) {
      Alert.alert("Error", t.aiAnalyzeFailed);
    } finally {
      setIsAnalyzing(false);
    }
  }, [recordName, language, t]);

  const handleSaveRecord = useCallback(() => {
    if (recordType === "food") {
      if (!recordName.trim()) {
        Alert.alert(t.required, t.pleaseDescribeFood);
        return;
      }
      if (!aiAnalysisResult) {
        Alert.alert(t.required, t.pleaseAnalyzeFirst);
        return;
      }
      // Use AI analysis data for food log
      const calories = aiAnalysisResult.totalCalories || 0;
      const protein = aiAnalysisResult.totalProtein || 0;
      const carbs = aiAnalysisResult.totalCarbs || 0;
      const fat = aiAnalysisResult.totalFat || 0;
      const exp = Math.round(calories * 0.05);
      logFood({ name: recordName.trim(), calories, protein, carbs, fat, expEarned: exp });
      // Auto-feed monster via caring system
      caringFeedMonster(calories, protein, carbs, fat, "meal").then((result) => {
        if (result) {
          console.log(`[Caring] Fed monster: +${result.fullnessGain} fullness`);
        }
      }).catch(() => {});
      setShowAddRecord(false);
      Alert.alert(`${t.recordSaved} \u2705`, `${recordName}\n${calories} kcal \u2022 ${protein}g ${t.totalProtein} \u2022 ${carbs}g ${t.totalCarbs} \u2022 ${fat}g ${t.totalFat}\n${t.statsUpdated}`);
    } else {
      if (!recordName.trim()) {
        Alert.alert(t.required, t.pleaseEnterName);
        return;
      }
      if (!recordDuration.trim()) {
        Alert.alert(t.required, t.pleaseEnterDuration);
        return;
      }
      addRecordWorkout(recordName.trim(), parseInt(recordDuration, 10) || 0);
      setShowAddRecord(false);
      Alert.alert(`${t.recordSaved} \u2705`, `${recordName} \u2014 ${recordDuration} min\n${t.statsUpdated}`);
    }
  }, [recordType, recordName, recordDuration, aiAnalysisResult, logFood, addRecordWorkout, t]);

  const handleRefreshTasks = useCallback(() => {
    Alert.alert(t.refreshed, t.tasksUpdated);
  }, []);

  const handleStartWorkout = useCallback(() => {
    router.push("/(tabs)/workout");
  }, [router]);

  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);

  const handleDeleteMonster = useCallback((index: number) => {
    setDeleteConfirmIdx(index);
  }, []);

  const confirmDeleteMonster = useCallback(() => {
    if (deleteConfirmIdx !== null) {
      removeMonster(deleteConfirmIdx);
      setDeleteConfirmIdx(null);
    }
  }, [deleteConfirmIdx, removeMonster]);

  const renderMonsterCard = (monster: Monster, index: number, showSelectAction = false) => {
    const isActive = index === activeMonsterIdx;
    const hp = Math.min((monster.currentHp / monster.maxHp) * 100, 100);
    const exp = Math.min((monster.currentExp / monster.expToNextLevel) * 100, 100);
    const gradient = MONSTER_GRADIENTS[monster.type] || ["#DCFCE7", "#BBF7D0"];

    return (
      <TouchableOpacity
        key={`${monster.name}-${index}`}
        activeOpacity={showSelectAction ? 0.7 : 1}
        onPress={showSelectAction ? () => handleSelectActiveMonster(index) : undefined}
        style={[styles.monsterCard, { backgroundColor: colors.surface, borderColor: isActive ? "#22C55E" : colors.border, borderWidth: isActive ? 2 : 1 }]}>
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
            <Image source={getMonsterImageForCaringState(monster.type, monster.stage, caringState.fullness, caringState.energy, caringState.mood, caringState.peakStateBuff)} style={styles.monsterImage} contentFit="contain" />
          </LinearGradient>
          <Text style={[styles.monsterName, { color: colors.foreground }]}>{monster.name}</Text>
        </View>

        <View style={styles.barContainer}>
          <View style={styles.barLabelRow}>
            <Text style={[styles.barLabel, { color: colors.muted }]}>HP</Text>
            <Text style={[styles.barValue, { color: colors.muted }]}>{Math.min(monster.currentHp, monster.maxHp)}/{monster.maxHp}</Text>
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
            <Text style={[styles.barValue, { color: colors.muted }]}>{Math.min(monster.evolutionProgress, monster.evolutionMax)}/{monster.evolutionMax}</Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${Math.min((monster.evolutionProgress / monster.evolutionMax) * 100, 100)}%`, backgroundColor: "#F59E0B" }]} />
          </View>
          <Text style={[styles.barLabel, { color: colors.muted, fontSize: 11, marginTop: 2 }]}>{t.evolutionStage} {monster.stage}/3</Text>
        </View>

        {/* Evolve Button - shows when evolution bar is full */}
        {monster.evolutionProgress >= monster.evolutionMax && monster.stage < 3 && (
          <TouchableOpacity
            onPress={() => openEvolutionModal(index)}
            style={styles.evolveButton}
          >
            <Text style={styles.evolveButtonText}>✨ {t.evolveNow} ✨</Text>
          </TouchableOpacity>
        )}

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

        {/* Active indicator */}
        {isActive && (
          <View style={styles.activeBadgeRow}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>⭐ {t.activeMonsterLabel}</Text>
            </View>
          </View>
        )}
        {showSelectAction && !isActive && (
          <View style={styles.activeBadgeRow}>
            <Text style={[styles.tapToSelectText, { color: colors.muted }]}>{t.tapToSelect}</Text>
          </View>
        )}
      </TouchableOpacity>
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

      {/* Monster Team Selector - shows small thumbnails for quick switching */}
      {monsters.length > 1 && (
        <View style={styles.teamSelectorRow}>
          {monsters.map((m, i) => {
            const isSelected = i === activeMonsterIdx;
            const gradient = MONSTER_GRADIENTS[m.type] || ["#DCFCE7", "#BBF7D0"];
            return (
              <TouchableOpacity
                key={`team-slot-${i}`}
                onPress={() => handleSelectActiveMonster(i)}
                style={[styles.teamSlotCard, {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? "#22C55E" : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                }]}
              >
                <LinearGradient colors={[gradient[0], gradient[1]]} style={styles.teamSlotGradient}>
                  <Image source={getMonsterImageForCaringState(m.type, m.stage, caringState.fullness, caringState.energy, caringState.mood, caringState.peakStateBuff)} style={styles.teamSlotImage} contentFit="contain" />
                </LinearGradient>
                <Text style={[styles.teamSlotName, { color: colors.foreground }]} numberOfLines={1}>{m.name}</Text>
                <Text style={[styles.teamSlotLevel, { color: isSelected ? "#22C55E" : colors.muted }]}>
                  {isSelected ? `⭐ ${t.activeMonsterLabel}` : `Lv.${m.level}`}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Empty slots */}
          {Array.from({ length: 3 - monsters.length }).map((_, i) => (
            <TouchableOpacity
              key={`empty-slot-${i}`}
              onPress={handleHatchEgg}
              style={[styles.teamSlotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.teamSlotEmpty, { borderColor: colors.border }]}>
                <Text style={{ fontSize: 24 }}>🥚</Text>
              </View>
              <Text style={[styles.teamSlotName, { color: colors.muted }]}>{t.hatchEgg}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Active Monster Card */}
      {activeMonster ? (
        <>
          {renderMonsterCard(activeMonster, activeMonsterIdx)}
          {/* Monster Caring Panel */}
          <MonsterCaringPanel monsterName={activeMonster.name} />
        </>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleHatchEgg}
          style={[styles.emptyMonsterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={{ fontSize: 48 }}>🥚</Text>
          <Text style={[styles.emptyMonsterText, { color: colors.foreground }]}>{t.hatchEgg}</Text>
          <Text style={[styles.emptyMonsterSubtext, { color: colors.muted }]}>{t.hatchYourFirstMonster}</Text>
        </TouchableOpacity>
      )}

      {/* Hatch Egg Button - only show if team not full */}
      {monsters.length < 3 && (
        <TouchableOpacity style={[styles.hatchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleHatchEgg}>
          <Text style={styles.hatchIcon}>🥚</Text>
          <Text style={[styles.hatchText, { color: colors.foreground }]}>{t.hatchEgg} ({tr("monsterTeamSlots", { current: String(monsters.length) })})</Text>
        </TouchableOpacity>
      )}

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

      <LinearGradient colors={["#8B5CF6", "#7C3AED"]} style={[styles.actionBtn, { opacity: 0.7 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={styles.actionBtnInner}>
          <Text style={styles.actionIcon}>❤️</Text>
          <View style={{ flex: 1 }}><Text style={styles.actionTitle}>{t.healthSync}</Text><Text style={styles.actionSubtitle}>{t.healthSyncDesc}</Text></View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{t.comingSoon}</Text>
          </View>
        </View>
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
            <View style={styles.questReward}><Text style={styles.rewardText}>+{quest.reward} EXP</Text></View>
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
      <View style={styles.historyStatsRow}>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#3B82F6" }]}>🍞 {t.avgCarbs}</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{avgCarbs}g</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>{t.dailyAvg}</Text>
        </View>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#8B5CF6" }]}>🧈 {t.avgFat}</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{avgFat}g</Text>
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

      {/* Macro sub-tabs (protein/carbs/fat) */}
      {historySubTab === "macros" && (
        <View style={[styles.subTabRow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 8 }]}>
          {(["protein", "carbs", "fat"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.subTab, macroSubTab === tab && { backgroundColor: tab === "protein" ? "#22C55E" : tab === "carbs" ? "#3B82F6" : "#8B5CF6" }]}
              onPress={() => setMacroSubTab(tab)}
            >
              <Text style={[styles.subTabText, { color: macroSubTab === tab ? "#fff" : colors.muted }]}>
                {tab === "protein" ? t.proteinShort : tab === "carbs" ? t.carbsShort : t.fatShort}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
            {historySubTab === "calories" ? `🔥 ${t.dailyCalorieTrend}` : historySubTab === "macros" ? (macroSubTab === "protein" ? `🥩 ${t.dailyProteinTrend}` : macroSubTab === "carbs" ? `🍞 ${t.dailyCarbsTrend}` : `🧈 ${t.dailyFatTrend}`) : `🏋️ ${t.workoutDurationTrend}`}
          </Text>
          <View style={styles.chartArea}>
            {weekDayLabels.map((day, i) => {
              const data = chartData[historySubTab];
              const maxVal = Math.max(...data);
              const barHeight = maxVal > 0 ? Math.max(4, (data[i] / maxVal) * 70) : 4;
              const isToday = i === 6;
              return (
                <View key={day} style={styles.chartCol}>
                  <Text style={[styles.chartBarValue, { color: colors.muted }]}>
                    {data[i]}
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
            {weekDayLabels.map((day, i) => {
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
          {weekDayLabels.map((day, i) => {
            const data = chartData[historySubTab];
            const unit = historySubTab === "calories" ? t.kcalUnit : historySubTab === "macros" ? (macroSubTab === "protein" ? t.gProtein : macroSubTab === "carbs" ? t.gCarbs : t.gFat) : t.minUnit;
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
            <View style={styles.headerTextArea}>
              <Text style={[styles.greeting, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{tr("greeting", { name: trainerName })}</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>{t.stayHealthy}</Text>
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
              {monsters.map((m, i) => (
                <View key={`monster-list-${i}`}>
                  {renderMonsterCard(m, i, true)}
                  <Pressable
                    onPress={() => handleDeleteMonster(i)}
                    style={({ pressed }) => [
                      styles.deleteMonsterBtn,
                      { borderColor: "#EF4444", opacity: pressed ? 0.5 : 1 },
                    ]}
                  >
                    <Text style={styles.deleteMonsterText}>🗑️ {t.deleteMonster}</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            {/* Delete Confirmation */}
            {deleteConfirmIdx !== null && (
              <View style={[styles.deleteConfirmOverlay]}>
                <Text style={[styles.deleteConfirmTitle, { color: colors.foreground }]}>{t.deleteMonster}</Text>
                <Text style={[styles.deleteConfirmText, { color: colors.muted }]}>{t.deleteMonsterConfirm}</Text>
                <View style={styles.deleteConfirmBtns}>
                  <TouchableOpacity
                    style={[styles.deleteConfirmCancelBtn, { borderColor: colors.border }]}
                    onPress={() => setDeleteConfirmIdx(null)}
                  >
                    <Text style={[styles.deleteConfirmCancelText, { color: colors.foreground }]}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteConfirmDeleteBtn}
                    onPress={confirmDeleteMonster}
                  >
                    <Text style={styles.deleteConfirmDeleteText}>{t.delete}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {monsters.length < 3 && (
              <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowMonsterList(false); handleHatchEgg(); }}>
                <Text style={styles.hatchConfirmText}>🥚 {t.hatchNewEgg} ({tr("monsterTeamSlots", { current: String(monsters.length) })})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Hatch Egg Modal */}
      <Modal visible={showHatchModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
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
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Record Modal */}
      <Modal visible={showAddRecord} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
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
                    onPress={() => { setRecordType("food"); setAiAnalysisResult(null); }}
                  >
                    <Text style={recordType === "food" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>
                      🍽️ {t.food}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, { backgroundColor: recordType === "workout" ? colors.primary : "transparent" }]}
                    onPress={() => { setRecordType("workout"); setAiAnalysisResult(null); }}
                  >
                    <Text style={recordType === "workout" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>
                      🏋️ {t.workout}
                    </Text>
                  </TouchableOpacity>
                </View>

                {recordType === "food" ? (
                  <>
                    {/* Food description input */}
                    <TextInput
                      style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border, minHeight: 60, textAlignVertical: "top" }]}
                      placeholder={t.foodDescriptionHint}
                      placeholderTextColor={colors.muted}
                      value={recordName}
                      onChangeText={(text) => { setRecordName(text); setAiAnalysisResult(null); }}
                      multiline
                      returnKeyType="done"
                      blurOnSubmit
                    />

                    {/* AI Analyze Button */}
                    <TouchableOpacity
                      style={[styles.aiAnalyzeBtn, { backgroundColor: isAnalyzing ? colors.muted : "#8B5CF6" }]}
                      onPress={handleAiAnalyze}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.aiAnalyzeBtnText}>{t.aiAnalyzing}</Text>
                        </View>
                      ) : (
                        <Text style={styles.aiAnalyzeBtnText}>🤖 {t.aiAnalyze}</Text>
                      )}
                    </TouchableOpacity>

                    {/* AI Analysis Result */}
                    {aiAnalysisResult && (
                      <View style={[styles.analysisResultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.analysisResultTitle, { color: colors.foreground }]}>📊 {t.analysisResult}</Text>
                        {aiAnalysisResult.items?.map((item: any, idx: number) => (
                          <View key={idx} style={[styles.analysisItemRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.analysisItemName, { color: colors.foreground }]}>{item.name}</Text>
                            <Text style={[styles.analysisItemDetail, { color: colors.muted }]}>
                              {item.calories} kcal · P{item.protein}g · C{item.carbs}g · F{item.fat}g
                            </Text>
                          </View>
                        ))}
                        <View style={styles.analysisTotalRow}>
                          <Text style={[styles.analysisTotalLabel, { color: colors.primary }]}>🔥 {t.totalCalories}</Text>
                          <Text style={[styles.analysisTotalValue, { color: colors.primary }]}>{aiAnalysisResult.totalCalories} kcal</Text>
                        </View>
                        <View style={styles.macroRow}>
                          <View style={[styles.macroPill, { backgroundColor: "#EF444420" }]}>
                            <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700" }}>P {aiAnalysisResult.totalProtein}g</Text>
                          </View>
                          <View style={[styles.macroPill, { backgroundColor: "#F59E0B20" }]}>
                            <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "700" }}>C {aiAnalysisResult.totalCarbs}g</Text>
                          </View>
                          <View style={[styles.macroPill, { backgroundColor: "#3B82F620" }]}>
                            <Text style={{ color: "#3B82F6", fontSize: 12, fontWeight: "700" }}>F {aiAnalysisResult.totalFat}g</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    {/* Workout name input */}
                    <TextInput
                      style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                      placeholder={t.exerciseNameExample}
                      placeholderTextColor={colors.muted}
                      value={recordName}
                      onChangeText={setRecordName}
                      returnKeyType="done"
                      blurOnSubmit
                    />
                    {/* Duration input */}
                    <TextInput
                      style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                      placeholder={t.durationMinPlaceholder}
                      placeholderTextColor={colors.muted}
                      value={recordDuration}
                      onChangeText={setRecordDuration}
                      keyboardType="numeric"
                      returnKeyType="done"
                      blurOnSubmit
                    />
                  </>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.hatchConfirmBtn, { backgroundColor: (recordType === "food" && !aiAnalysisResult) ? colors.muted : colors.primary }]}
                  onPress={handleSaveRecord}
                  disabled={recordType === "food" && !aiAnalysisResult}
                >
                  <Text style={styles.hatchConfirmText}>✅ {t.saveRecord}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowAddRecord(false)}>
                  <Text style={[styles.cancelText, { color: colors.muted }]}>{t.cancel}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, width: "100%" }}>
              <TouchableOpacity
                onPress={() => { setShowLogoutModal(false); setTimeout(() => setShowDeleteAccountModal(true), 300); }}
                style={{ alignItems: "center" }}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#DC2626", fontSize: 14, fontWeight: "600" }}>{t.deleteAccount}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal visible={showDeleteAccountModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 }]}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
            <Text style={[styles.sectionTitle, { color: "#DC2626", textAlign: "center", marginBottom: 8 }]}>{t.deleteAccountTitle}</Text>
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 22 }}>{t.deleteAccountMessage}</Text>
            <TouchableOpacity
              onPress={confirmDeleteAccount}
              disabled={isDeletingAccount}
              style={{ backgroundColor: isDeletingAccount ? "#FCA5A5" : "#DC2626", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: "100%", alignItems: "center", marginBottom: 10, flexDirection: "row", justifyContent: "center" }}
            >
              {isDeletingAccount && <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />}
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{isDeletingAccount ? "..." : t.deleteAccountConfirm}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDeleteAccountModal(false)}
              disabled={isDeletingAccount}
              style={[styles.cancelBtn, { borderColor: colors.border, width: "100%" }]}
            >
              <Text style={[styles.cancelText, { color: colors.muted }]}>{t.deleteAccountCancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Evolution Modal */}
      <Modal visible={showEvolutionModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }]}>
            {evolutionPhase === "glowing" ? (
              <>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#F59E0B", marginBottom: 8 }}>✨ {t.evolutionReady} ✨</Text>
                <Text style={{ fontSize: 16, color: colors.muted, marginBottom: 20, textAlign: "center" }}>
                  {evolutionData?.monsterName} {t.monsterReadyToEvolve}
                </Text>
                <Animated.View style={[{ width: 180, height: 180, borderRadius: 20, overflow: "hidden", marginBottom: 20 }, evolutionAnimStyle]}>
                  <LinearGradient
                    colors={MONSTER_GRADIENTS[evolutionData?.monsterType || "Bodybuilder"] || ["#DCFCE7", "#BBF7D0"]}
                    style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
                  >
                    <Image
                      source={MONSTER_IMAGES[`${evolutionData?.monsterType}-${(evolutionData?.newStage || 2) - 1}`]}
                      style={{ width: 140, height: 140 }}
                      contentFit="contain"
                    />
                  </LinearGradient>
                </Animated.View>
                <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 20, textAlign: "center" }}>
                  Stage {(evolutionData?.newStage || 2) - 1} → Stage {evolutionData?.newStage}
                </Text>
                <TouchableOpacity
                  onPress={handleEvolve}
                  style={{ backgroundColor: "#F59E0B", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: "100%", alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>🔥 {t.evolveNow}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#22C55E", marginBottom: 8 }}>🎉 {t.evolutionComplete} 🎉</Text>
                <Text style={{ fontSize: 16, color: colors.foreground, fontWeight: "700", marginBottom: 4 }}>{t.congratulations}</Text>
                <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 20, textAlign: "center" }}>
                  {evolutionData?.monsterName} {language === "zh" ? `${t.monsterEvolved}${evolutionData?.newStage}階段！` : `${t.monsterEvolved} ${evolutionData?.newStage}!`}
                </Text>
                <Animated.View style={[{ width: 180, height: 180, borderRadius: 20, overflow: "hidden", marginBottom: 16 }, evolutionAnimStyle]}>
                  <LinearGradient
                    colors={MONSTER_GRADIENTS[evolutionData?.monsterType || "Bodybuilder"] || ["#DCFCE7", "#BBF7D0"]}
                    style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
                  >
                    <Image
                      source={MONSTER_IMAGES[`${evolutionData?.monsterType}-${evolutionData?.newStage}`]}
                      style={{ width: 140, height: 140 }}
                      contentFit="contain"
                    />
                  </LinearGradient>
                </Animated.View>
                <Text style={{ fontSize: 13, color: "#22C55E", fontWeight: "600", marginBottom: 20 }}>💪 {t.statsIncreased}</Text>
                <TouchableOpacity
                  onPress={() => setShowEvolutionModal(false)}
                  style={{ backgroundColor: "#22C55E", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: "100%", alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{t.closeEvolution}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  headerTextArea: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: "row", gap: 8, flexShrink: 0 },
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
  evolveButton: { backgroundColor: "#F59E0B", paddingVertical: 12, borderRadius: 14, alignItems: "center", marginTop: 12, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  evolveButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  monsterActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  monsterActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  monsterActionIcon: { fontSize: 16 },
  monsterActionText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Active monster indicator
  activeBadgeRow: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
  activeBadge: { backgroundColor: "#22C55E", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  activeBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  tapToSelectText: { fontSize: 13, fontWeight: "500" },

  // Monster team selector
  teamSelectorRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  teamSlotCard: { flex: 1, borderRadius: 16, padding: 10, borderWidth: 1, alignItems: "center", gap: 4 },
  teamSlotImage: { width: 56, height: 56 },
  teamSlotGradient: { borderRadius: 12, width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  teamSlotName: { fontSize: 12, fontWeight: "700", textAlign: "center" as const },
  teamSlotLevel: { fontSize: 10, fontWeight: "600" },
  teamSlotEmpty: { width: 64, height: 64, borderRadius: 12, borderWidth: 2, borderStyle: "dashed" as const, alignItems: "center", justifyContent: "center" },
  teamSlotsLabel: { fontSize: 13, fontWeight: "600" },

  // Delete monster button
  deleteMonsterBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, marginTop: -4, marginBottom: 12, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderStyle: "dashed" as const },
  deleteMonsterText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
  deleteConfirmOverlay: { backgroundColor: "#FEF2F2", borderRadius: 16, padding: 20, marginTop: 8, borderWidth: 1, borderColor: "#FECACA", gap: 8 },
  deleteConfirmTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" as const },
  deleteConfirmText: { fontSize: 14, textAlign: "center" as const },
  deleteConfirmBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  deleteConfirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  deleteConfirmCancelText: { fontSize: 14, fontWeight: "600" },
  deleteConfirmDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center" },
  deleteConfirmDeleteText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Empty monster state for new users
  emptyMonsterCard: { borderRadius: 20, padding: 32, borderWidth: 1, alignItems: "center", gap: 12 },
  emptyMonsterText: { fontSize: 20, fontWeight: "800" },
  emptyMonsterSubtext: { fontSize: 14, textAlign: "center" as const },

  // AI Food Analysis
  aiAnalyzeBtn: { padding: 14, borderRadius: 14, alignItems: "center" },
  aiAnalyzeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  analysisResultCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  analysisResultTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  analysisItemRow: { paddingVertical: 6, borderBottomWidth: 0.5 },
  analysisItemName: { fontSize: 14, fontWeight: "600" },
  analysisItemDetail: { fontSize: 12, marginTop: 2 },
  analysisTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  analysisTotalLabel: { fontSize: 15, fontWeight: "700" },
  analysisTotalValue: { fontSize: 18, fontWeight: "800" },
  macroRow: { flexDirection: "row", gap: 8, justifyContent: "center", paddingTop: 4 },
  macroPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
});
