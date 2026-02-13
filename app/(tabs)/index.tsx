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
} from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

const MONSTER_TYPES = [
  { type: "Bodybuilder", icon: "💪", color: "#EF4444", desc: "High strength, balanced defense" },
  { type: "Physique", icon: "🏃", color: "#3B82F6", desc: "High agility, fast attacks" },
  { type: "Powerlifter", icon: "🏋️", color: "#F59E0B", desc: "Max strength, heavy hitter" },
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

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();

  const trainerName = user?.name || "Trainer";
  const [healthScore, setHealthScore] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [netExp, setNetExp] = useState(0);
  const [coins, setCoins] = useState(100);

  const [monsters, setMonsters] = useState<Monster[]>([
    {
      name: "Flexo",
      type: "Bodybuilder",
      level: 1,
      currentHp: 100,
      maxHp: 100,
      currentExp: 0,
      expToNextLevel: 100,
      strength: 10,
      defense: 10,
      agility: 10,
      evolutionProgress: 0,
      evolutionMax: 100,
      status: "Rookie",
      stage: 1,
    },
  ]);

  const [showHatchModal, setShowHatchModal] = useState(false);
  const [hatchStep, setHatchStep] = useState<"select" | "name" | "hatching" | "done">("select");
  const [selectedType, setSelectedType] = useState("");
  const [newMonsterName, setNewMonsterName] = useState("");

  const quests = [
    { id: 1, icon: "🥩", title: "Protein Champion", description: "Consume 100g protein today", progress: 0, target: 100, reward: 50, bgColor: "#7C3AED" },
    { id: 2, icon: "🚶", title: "Walking Master", description: "Walk 5,000 steps today", progress: todaySteps, target: 5000, reward: 50, bgColor: "#2563EB" },
    { id: 3, icon: "💪", title: "Strength Training", description: "Complete a 30-min workout", progress: 0, target: 30, reward: 100, bgColor: "#059669" },
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
        name: newMonsterName.trim(),
        type: selectedType,
        level: 1,
        currentHp: 100,
        maxHp: 100,
        currentExp: 0,
        expToNextLevel: 100,
        strength: stats.str,
        defense: stats.def,
        agility: stats.agi,
        evolutionProgress: 0,
        evolutionMax: 100,
        status: "Rookie",
        stage: 1,
      };
      setMonsters((prev) => [...prev, newMonster]);
      setHatchStep("done");
    }, 2000);
  }, [newMonsterName, selectedType]);

  const handleViewAll = useCallback(() => {
    if (monsters.length <= 1) {
      Alert.alert("Monster Team", "You only have 1 monster. Hatch more eggs to build your team!");
    } else {
      const list = monsters.map((m, i) => `${i + 1}. ${m.name} (${m.type} Lv.${m.level})`).join("\n");
      Alert.alert("My Monster Team", list);
    }
  }, [monsters]);

  const handleSettings = useCallback(() => {
    Alert.alert("Settings", "Settings screen coming soon!\n\n• Profile\n• Notifications\n• Theme\n• About");
  }, []);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.foreground }]}>Hi, {trainerName}!</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Stay healthy and strong today</Text>
            </View>
            <TouchableOpacity
              style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleSettings}
            >
              <IconSymbol name="gear" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Stats Card */}
          <View style={[styles.statsCard, { backgroundColor: "#7C3AED" }]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>❤️</Text>
                <Text style={styles.statValue}>{healthScore}</Text>
                <Text style={styles.statLabel}>Health Score</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>👣</Text>
                <Text style={styles.statValue}>{todaySteps}</Text>
                <Text style={styles.statLabel}>Today's Steps</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>⭐</Text>
                <Text style={styles.statValue}>{netExp}</Text>
                <Text style={styles.statLabel}>Net EXP</Text>
              </View>
            </View>
          </View>

          {/* My Monster Team */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Monster Team</Text>
            <TouchableOpacity onPress={handleViewAll}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Monster Card */}
          <View style={[styles.monsterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.badgeText}>Lv.{activeMonster.level}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: "#2563EB" }]}>
                <Text style={styles.badgeText}>{activeMonster.type}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: "#059669" }]}>
                <Text style={styles.badgeText}>{activeMonster.status}</Text>
              </View>
            </View>

            {/* Monster Image - dark background to hide checkered pattern */}
            <View style={styles.monsterImageContainer}>
              <View style={[styles.monsterImageBg, { backgroundColor: colors.surface }]}>
                <Image
                  source={MONSTER_IMAGES[`${activeMonster.type}-${activeMonster.stage}`]}
                  style={styles.monsterImage}
                  contentFit="contain"
                />
              </View>
              <Text style={[styles.monsterName, { color: colors.foreground }]}>{activeMonster.name}</Text>
            </View>

            {/* HP Bar */}
            <View style={styles.barContainer}>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.muted }]}>HP</Text>
                <Text style={[styles.barValue, { color: colors.muted }]}>{activeMonster.currentHp}/{activeMonster.maxHp}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.barFill, { width: `${hpPercent}%`, backgroundColor: "#22C55E" }]} />
              </View>
            </View>

            {/* EXP Bar */}
            <View style={styles.barContainer}>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.muted }]}>EXP</Text>
                <Text style={[styles.barValue, { color: colors.muted }]}>{activeMonster.currentExp}/{activeMonster.expToNextLevel}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.barFill, { width: `${expPercent}%`, backgroundColor: "#8B5CF6" }]} />
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.monsterStatsRow}>
              <View style={styles.monsterStat}>
                <Text style={styles.monsterStatIcon}>🥩</Text>
                <Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{activeMonster.strength}</Text>
              </View>
              <View style={styles.monsterStat}>
                <Text style={styles.monsterStatIcon}>🛡️</Text>
                <Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{activeMonster.defense}</Text>
              </View>
              <View style={styles.monsterStat}>
                <Text style={styles.monsterStatIcon}>⚡</Text>
                <Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{activeMonster.agility}</Text>
              </View>
            </View>

            {/* Evolution Progress */}
            <View style={styles.barContainer}>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.muted }]}>Evolution</Text>
                <Text style={[styles.barValue, { color: colors.muted }]}>{activeMonster.evolutionProgress}/{activeMonster.evolutionMax}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.barFill, { width: `${evoPercent}%`, backgroundColor: "#F59E0B" }]} />
              </View>
            </View>
          </View>

          {/* Hatch Egg Button */}
          <TouchableOpacity
            style={[styles.hatchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleHatchEgg}
          >
            <Text style={styles.hatchIcon}>🥚</Text>
            <Text style={[styles.hatchText, { color: colors.foreground }]}>Hatch Egg</Text>
          </TouchableOpacity>

          {/* Quick Action Buttons */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#7C3AED" }]}
            onPress={() => router.push("/(tabs)/camera")}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <View>
              <Text style={styles.actionTitle}>Photo Feed</Text>
              <Text style={styles.actionSubtitle}>Scan Food Analysis</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#DC2626" }]}
            onPress={() => router.push("/(tabs)/battle")}
          >
            <Text style={styles.actionIcon}>⚔️</Text>
            <View>
              <Text style={styles.actionTitle}>Quick Battle</Text>
              <Text style={styles.actionSubtitle}>PvP Matching</Text>
            </View>
          </TouchableOpacity>

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
                <View style={styles.questReward}>
                  <Text style={styles.rewardText}>+{quest.reward} 🪙</Text>
                </View>
              </View>
              <View style={[styles.questBarTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <View style={[styles.questBarFill, { width: `${quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0}%`, backgroundColor: "rgba(255,255,255,0.8)" }]} />
              </View>
              <Text style={styles.questProgress}>{quest.progress}/{quest.target}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Hatch Egg Modal */}
      <Modal visible={showHatchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {hatchStep === "select" && (
              <>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose Monster Type</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Select the type of monster to hatch</Text>
                {MONSTER_TYPES.map((mt) => (
                  <TouchableOpacity
                    key={mt.type}
                    style={[styles.typeOption, { backgroundColor: colors.surface, borderColor: mt.color }]}
                    onPress={() => handleSelectType(mt.type)}
                  >
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
                  <Image source={require("@/assets/monsters/egg.png")} style={styles.eggImage} contentFit="contain" />
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
                <View style={[styles.monsterImageBg, { backgroundColor: colors.surface }]}>
                  <Image
                    source={MONSTER_IMAGES[`${selectedType}-1`]}
                    style={styles.hatchedImage}
                    contentFit="contain"
                  />
                </View>
                <Text style={[styles.hatchedTitle, { color: colors.foreground }]}>
                  {newMonsterName} was born!
                </Text>
                <Text style={[styles.hatchedSubtitle, { color: colors.muted }]}>
                  A new {selectedType} joins your team
                </Text>
                <TouchableOpacity
                  style={[styles.hatchConfirmBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowHatchModal(false)}
                >
                  <Text style={styles.hatchConfirmText}>Awesome!</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 2 },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  statsCard: { borderRadius: 20, padding: 20 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  statItem: { alignItems: "center", flex: 1 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  statDivider: { width: 1, height: 40 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  viewAll: { fontSize: 14, fontWeight: "600" },
  monsterCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  badgesRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  monsterImageContainer: { alignItems: "center", marginBottom: 12 },
  monsterImageBg: { borderRadius: 20, padding: 8, alignItems: "center", justifyContent: "center" },
  monsterImage: { width: 180, height: 180 },
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
  hatchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", gap: 8 },
  hatchIcon: { fontSize: 24 },
  hatchText: { fontSize: 16, fontWeight: "600" },
  actionBtn: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, gap: 12 },
  actionIcon: { fontSize: 28 },
  actionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  actionSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
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
  questBarFill: { height: "100%", borderRadius: 3 },
  questProgress: { color: "rgba(255,255,255,0.7)", fontSize: 11, textAlign: "right" },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, gap: 12, maxHeight: "80%" },
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
  eggImage: { width: 120, height: 120 },
  nameInput: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  hatchConfirmBtn: { padding: 16, borderRadius: 16, alignItems: "center" },
  hatchConfirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hatchingContainer: { alignItems: "center", paddingVertical: 40, gap: 12 },
  hatchingEmoji: { fontSize: 64 },
  hatchingText: { fontSize: 22, fontWeight: "800" },
  hatchingSubtext: { fontSize: 14 },
  hatchedImage: { width: 140, height: 140 },
  hatchedTitle: { fontSize: 22, fontWeight: "800", marginTop: 8 },
  hatchedSubtitle: { fontSize: 14 },
});
