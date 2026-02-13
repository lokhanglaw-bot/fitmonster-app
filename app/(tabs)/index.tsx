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

const MONSTER_TYPES = [
  { type: "Bodybuilder", icon: "💪", color: "#EF4444", desc: "High strength, balanced defense", gradient: ["#FEE2E2", "#FECACA"] as const },
  { type: "Physique", icon: "🏃", color: "#3B82F6", desc: "High agility, fast attacks", gradient: ["#DBEAFE", "#BFDBFE"] as const },
  { type: "Powerlifter", icon: "🏋️", color: "#F59E0B", desc: "Max strength, heavy hitter", gradient: ["#FEF3C7", "#FDE68A"] as const },
];

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

const AI_DAILY_TASKS = [
  {
    title: "Today's 💪 Bodybuilder Monster Suggestion",
    totalExp: 700,
    workoutTitle: "Home Power Crusher",
    workoutDesc: "High-intensity bodyweight strength circuit focusing on compound movements to stimulate muscle hypertrophy and maximize morning energy without gym equipment.",
    workoutExp: 300,
    duration: "30min",
    sets: "3×12",
    calories: "220cal",
    tips: ["Focus on slow eccentric movements to tear more muscle fibers", "Keep rest between sets under 60 seconds"],
    skill: "Protein Blast",
    quote: '"Iron doesn\'t lie; every rep is a brick in the temple of your physique. Build it strong!"',
    dietTitle: "Protein Power Meal",
    dietDesc: "High protein meal plan to support muscle recovery and growth.",
    dietExp: 400,
  },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();

  const trainerName = user?.name || "Trainer";
  const [healthScore, setHealthScore] = useState(72);
  const [todaySteps, setTodaySteps] = useState(4280);
  const [netExp, setNetExp] = useState(839);
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
  const [caloriesIn] = useState(8420);
  const [caloriesBurned] = useState(3150);
  const [workoutDuration] = useState(185);
  const [avgProtein] = useState(95);

  // Add Record modal
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordType, setRecordType] = useState<"food" | "workout">("food");
  const [recordName, setRecordName] = useState("");
  const [recordCalories, setRecordCalories] = useState("");
  const [recordDuration, setRecordDuration] = useState("");

  // Sample chart data
  const chartData = {
    calories: [1850, 2100, 1650, 1920, 2300, 1780, 1200],
    macros: [95, 110, 85, 102, 120, 88, 65],
    workout: [45, 60, 30, 55, 75, 40, 0],
  };

  const quests = [
    { id: 1, icon: "🥩", title: "Protein Champion", description: "Consume 100g protein today", progress: 68, target: 100, reward: 50, bgColor: "#22C55E" },
    { id: 2, icon: "🚶", title: "Walking Master", description: "Walk 5,000 steps today", progress: todaySteps, target: 5000, reward: 50, bgColor: "#3B82F6" },
    { id: 3, icon: "💪", title: "Strength Training", description: "Complete a 30-min workout", progress: 25, target: 30, reward: 100, bgColor: "#F59E0B" },
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
      Alert.alert("Name Required", "Please give your monster a name!");
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

  const handleSettings = useCallback(() => {
    Alert.alert("Settings", "Settings screen coming soon!\n\n• Profile\n• Notifications\n• Theme\n• About");
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/auth");
          },
        },
      ]
    );
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
      Alert.alert("Required", "Please enter a name for the record.");
      return;
    }
    if (recordType === "food" && !recordCalories.trim()) {
      Alert.alert("Required", "Please enter the calorie amount.");
      return;
    }
    if (recordType === "workout" && !recordDuration.trim()) {
      Alert.alert("Required", "Please enter the workout duration.");
      return;
    }
    setShowAddRecord(false);
    const detail = recordType === "food" ? `${recordCalories} kcal` : `${recordDuration} min`;
    Alert.alert("Record Saved! ✅", `${recordName} — ${detail}\nYour stats have been updated.`);
  }, [recordType, recordName, recordCalories, recordDuration]);

  const handleRefreshTasks = useCallback(() => {
    Alert.alert("Refreshed!", "AI Daily Tasks have been updated with new suggestions.");
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
            <Text style={styles.badgeText}>{monster.type}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
            <Text style={styles.badgeText}>{monster.status}</Text>
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
            <Text style={[styles.barLabel, { color: colors.muted }]}>Evolution</Text>
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
            <Text style={styles.monsterActionText}>Train</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.monsterActionBtn, { backgroundColor: "#22C55E" }]}
            onPress={() => router.push("/(tabs)/camera")}
          >
            <Text style={styles.monsterActionIcon}>🍖</Text>
            <Text style={styles.monsterActionText}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.monsterActionBtn, { backgroundColor: "#EF4444" }]}
            onPress={() => router.push("/(tabs)/battle")}
          >
            <Text style={styles.monsterActionIcon}>⚔️</Text>
            <Text style={styles.monsterActionText}>Battle</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHomeTab = () => (
    <>
      {/* My Monster Team */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Monster Team</Text>
        <TouchableOpacity onPress={() => setShowMonsterList(true)}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {renderMonsterCard(activeMonster, 0)}

      {/* Hatch Egg Button */}
      <TouchableOpacity style={[styles.hatchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleHatchEgg}>
        <Text style={styles.hatchIcon}>🥚</Text>
        <Text style={[styles.hatchText, { color: colors.foreground }]}>Hatch Egg</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <TouchableOpacity style={styles.actionBtnInner} onPress={() => router.push("/(tabs)/camera")}>
          <Text style={styles.actionIcon}>📸</Text>
          <View><Text style={styles.actionTitle}>Photo Feed</Text><Text style={styles.actionSubtitle}>Scan Food Analysis</Text></View>
        </TouchableOpacity>
      </LinearGradient>

      <LinearGradient colors={["#3B82F6", "#2563EB"]} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <TouchableOpacity style={styles.actionBtnInner} onPress={() => router.push("/(tabs)/battle")}>
          <Text style={styles.actionIcon}>⚔️</Text>
          <View><Text style={styles.actionTitle}>Quick Battle</Text><Text style={styles.actionSubtitle}>PvP Matching</Text></View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Daily Quests */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily Quests</Text>
        <Text style={[styles.questCount, { color: colors.muted }]}>{completedQuests}/3 Completed</Text>
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
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>✨ AI Daily Tasks</Text>
        <TouchableOpacity onPress={handleRefreshTasks}><Text style={[styles.viewAll, { color: colors.primary }]}>Refresh</Text></TouchableOpacity>
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
          <Text style={[styles.completionLabel, { color: colors.muted }]}>Completion Progress</Text>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: dailyTaskView === "workout" ? `${Math.min((completedQuests / 3) * 100, 100)}%` : "33%", backgroundColor: "#22C55E" }]} />
          </View>

          {/* Workout / Diet toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.background }]}>
            <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: dailyTaskView === "workout" ? "#22C55E" : "transparent" }]} onPress={() => setDailyTaskView("workout")}>
              <Text style={dailyTaskView === "workout" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>🏋️ Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: dailyTaskView === "diet" ? "#22C55E" : "transparent" }]} onPress={() => setDailyTaskView("diet")}>
              <Text style={dailyTaskView === "diet" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>🍽️ Diet</Text>
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
                <View style={styles.metric}><Text style={styles.metricIcon}>🥩</Text><Text style={styles.metricValue}>120g protein</Text></View>
                <View style={styles.metric}><Text style={styles.metricIcon}>🍞</Text><Text style={styles.metricValue}>200g carbs</Text></View>
                <View style={styles.metric}><Text style={styles.metricIcon}>🧈</Text><Text style={styles.metricValue}>65g fat</Text></View>
              </View>

              <View style={styles.tipRow}>
                <Text style={styles.tipBullet}>💡</Text>
                <Text style={[styles.tipText, { color: "#6B7280" }]}>Eat protein within 30 min after workout for best recovery</Text>
              </View>
              <View style={styles.tipRow}>
                <Text style={styles.tipBullet}>💡</Text>
                <Text style={[styles.tipText, { color: "#6B7280" }]}>Stay hydrated — aim for 2-3 liters of water daily</Text>
              </View>

              <TouchableOpacity onPress={() => router.push("/(tabs)/camera")}>
                <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.workoutBtn}>
                  <Text style={styles.workoutBtnText}>🍖 Log Meal  ›</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.skillRow}>
                <Text style={styles.skillLabel}>⚡ Complete to unlock skill</Text>
                <View style={[styles.skillBadge, { backgroundColor: "#22C55E" }]}>
                  <Text style={styles.skillBadgeText}>Nutrition Boost</Text>
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
                <Text style={styles.workoutBtnText}>🏋️ Workout  ›</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>⚡ Complete to unlock skill</Text>
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
          <Text style={[styles.historyStatLabel, { color: "#EF4444" }]}>🍽️ Calories In</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{caloriesIn}</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>This week kcal</Text>
        </View>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#F59E0B" }]}>🔥 Calories Burned</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{caloriesBurned}</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>This week kcal</Text>
        </View>
      </View>
      <View style={styles.historyStatsRow}>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#3B82F6" }]}>🏋️ Workout Duration</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{workoutDuration}</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>This week min</Text>
        </View>
        <View style={[styles.historyStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.historyStatLabel, { color: "#22C55E" }]}>🥩 Avg Protein</Text>
          <Text style={[styles.historyStatValue, { color: colors.foreground }]}>{avgProtein}g</Text>
          <Text style={[styles.historyStatSub, { color: colors.muted }]}>Daily avg</Text>
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
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
            <Text style={styles.addRecordInlineText}>+ Add Record</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Chart / Calendar / List view */}
      {historyViewMode === "chart" && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>
            {historySubTab === "calories" ? "🔥 Daily Calorie Trend" : historySubTab === "macros" ? "🥩 Daily Protein Trend" : "🏋️ Workout Duration Trend"}
          </Text>
          <View style={styles.chartArea}>
            {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => {
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
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>📅 Weekly Calendar</Text>
          <View style={styles.calendarGrid}>
            {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => {
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
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>📋 Daily Records</Text>
          {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => {
            const data = chartData[historySubTab];
            const unit = historySubTab === "calories" ? "kcal" : historySubTab === "macros" ? "g protein" : "min";
            const isToday = i === 6;
            return (
              <View key={day} style={[styles.listRow, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {isToday && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
                  <Text style={[styles.listDay, { color: isToday ? colors.primary : colors.foreground }]}>{day}{isToday ? " (Today)" : ""}</Text>
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
              <Text style={[styles.greeting, { color: colors.foreground }]}>Hi, {trainerName}!</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Stay healthy and strong today 💪</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleSettings}>
                <IconSymbol name="gear" size={22} color={colors.muted} />
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
              <Text style={styles.statLabelLg}>Health Score</Text>
            </View>
            <View style={styles.statsRight}>
              <View style={styles.statSmall}>
                <Text style={styles.statSmallIcon}>👣</Text>
                <Text style={styles.statSmallValue}>{todaySteps}</Text>
                <Text style={styles.statSmallLabel}>Today's Steps</Text>
              </View>
              <View style={styles.statSmall}>
                <Text style={styles.statSmallIcon}>✨</Text>
                <Text style={styles.statSmallValue}>{netExp} Net EXP</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Tab Navigation: Home / Daily Tasks / History */}
          <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.tab, activeTab === "home" && styles.activeTab]} onPress={() => setActiveTab("home")}>
              <Text style={[styles.tabText, { color: activeTab === "home" ? colors.foreground : colors.muted }]}>🏠 Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === "daily" && styles.activeTab]} onPress={() => setActiveTab("daily")}>
              <Text style={[styles.tabText, { color: activeTab === "daily" ? colors.foreground : colors.muted }]}>📋 Daily Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === "history" && styles.activeTab]} onPress={() => setActiveTab("history")}>
              <Text style={[styles.tabText, { color: activeTab === "history" ? colors.foreground : colors.muted }]}>🕐 History</Text>
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>My Monster Team ({monsters.length})</Text>
              <TouchableOpacity onPress={() => setShowMonsterList(false)}>
                <IconSymbol name="xmark" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 500 }}>
              {monsters.map((m, i) => renderMonsterCard(m, i))}
            </ScrollView>
            <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowMonsterList(false); handleHatchEgg(); }}>
              <Text style={styles.hatchConfirmText}>🥚 Hatch New Egg</Text>
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
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose Monster Type</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Select the type of monster to hatch</Text>
                {MONSTER_TYPES.map((mt) => (
                  <TouchableOpacity key={mt.type} style={[styles.typeOption, { backgroundColor: colors.surface, borderColor: mt.color }]} onPress={() => handleSelectType(mt.type)}>
                    <Text style={styles.typeIcon}>{mt.icon}</Text>
                    <View style={styles.typeInfo}>
                      <Text style={[styles.typeName, { color: colors.foreground }]}>{mt.type}</Text>
                      <Text style={[styles.typeDesc, { color: colors.muted }]}>{mt.desc}</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={colors.muted} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowHatchModal(false)}>
                  <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {hatchStep === "name" && (
              <>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Name Your Monster</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Give your {selectedType} a name</Text>
                <View style={styles.eggPreview}>
                  <LinearGradient colors={MONSTER_TYPES.find((t) => t.type === selectedType)?.gradient || ["#DCFCE7", "#BBF7D0"]} style={styles.eggGradient}>
                    <Image source={require("@/assets/monsters/egg.png")} style={styles.eggImage} contentFit="contain" />
                  </LinearGradient>
                </View>
                <TextInput
                  style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Enter monster name..."
                  placeholderTextColor={colors.muted}
                  value={newMonsterName}
                  onChangeText={setNewMonsterName}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmHatch}
                />
                <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirmHatch}>
                  <Text style={styles.hatchConfirmText}>Hatch!</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setHatchStep("select")}>
                  <Text style={[styles.cancelText, { color: colors.muted }]}>Back</Text>
                </TouchableOpacity>
              </>
            )}

            {hatchStep === "hatching" && (
              <View style={styles.hatchingContainer}>
                <Text style={styles.hatchingEmoji}>🥚✨</Text>
                <Text style={[styles.hatchingText, { color: colors.foreground }]}>Hatching...</Text>
                <Text style={[styles.hatchingSubtext, { color: colors.muted }]}>Your egg is cracking open!</Text>
              </View>
            )}

            {hatchStep === "done" && (
              <View style={styles.hatchingContainer}>
                <LinearGradient colors={MONSTER_GRADIENTS[selectedType] || ["#DCFCE7", "#BBF7D0"]} style={styles.hatchedGradient}>
                  <Image source={MONSTER_IMAGES[`${selectedType}-1`]} style={styles.hatchedImage} contentFit="contain" />
                </LinearGradient>
                <Text style={[styles.hatchedTitle, { color: colors.foreground }]}>{newMonsterName} was born!</Text>
                <Text style={[styles.hatchedSubtitle, { color: colors.muted }]}>A new {selectedType} joins your team</Text>
                <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleCloseHatch}>
                  <Text style={styles.hatchConfirmText}>Awesome!</Text>
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
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Record</Text>
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
                  🍽️ Food
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: recordType === "workout" ? colors.primary : "transparent" }]}
                onPress={() => setRecordType("workout")}
              >
                <Text style={recordType === "workout" ? styles.toggleBtnText : [styles.toggleBtnTextInactive, { color: colors.muted }]}>
                  🏋️ Workout
                </Text>
              </TouchableOpacity>
            </View>

            {/* Record Name */}
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              placeholder={recordType === "food" ? "Food name (e.g. Grilled Chicken)" : "Exercise name (e.g. Running)"}
              placeholderTextColor={colors.muted}
              value={recordName}
              onChangeText={setRecordName}
            />

            {/* Calories or Duration */}
            {recordType === "food" ? (
              <TextInput
                style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Calories (kcal)"
                placeholderTextColor={colors.muted}
                value={recordCalories}
                onChangeText={setRecordCalories}
                keyboardType="numeric"
              />
            ) : (
              <TextInput
                style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Duration (minutes)"
                placeholderTextColor={colors.muted}
                value={recordDuration}
                onChangeText={setRecordDuration}
                keyboardType="numeric"
              />
            )}

            <TouchableOpacity style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleSaveRecord}>
              <Text style={styles.hatchConfirmText}>✅ Save Record</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowAddRecord(false)}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
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
