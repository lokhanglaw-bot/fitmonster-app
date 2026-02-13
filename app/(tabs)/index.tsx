import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Demo data - will be replaced with real data from API
  const trainerName = user?.name || "Trainer";
  const healthScore = 0;
  const todaySteps = 0;
  const netExp = 0;

  const monster = {
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
  };

  const quests = [
    {
      id: 1,
      icon: "🥩",
      title: "Protein Champion",
      description: "Consume 100g protein today",
      progress: 0,
      target: 100,
      reward: 50,
      bgColor: "#7C3AED",
    },
    {
      id: 2,
      icon: "🚶",
      title: "Walking Master",
      description: "Walk 5,000 steps today",
      progress: 0,
      target: 5000,
      reward: 50,
      bgColor: "#2563EB",
    },
    {
      id: 3,
      icon: "💪",
      title: "Strength Training",
      description: "Complete a 30-min workout",
      progress: 0,
      target: 30,
      reward: 100,
      bgColor: "#059669",
    },
  ];

  const hpPercent = (monster.currentHp / monster.maxHp) * 100;
  const expPercent = (monster.currentExp / monster.expToNextLevel) * 100;
  const evoPercent = (monster.evolutionProgress / monster.evolutionMax) * 100;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.foreground }]}>
                Hi, {trainerName}!
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Stay healthy and strong today
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {}}
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
            <TouchableOpacity>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Monster Card */}
          <View style={[styles.monsterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.badgeText}>Lv.{monster.level}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: "#2563EB" }]}>
                <Text style={styles.badgeText}>{monster.type}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: "#059669" }]}>
                <Text style={styles.badgeText}>{monster.status}</Text>
              </View>
            </View>

            {/* Monster Image */}
            <View style={styles.monsterImageContainer}>
              <Image
                source={require("@/assets/monsters/bodybuilder-stage1.png")}
                style={styles.monsterImage}
                contentFit="contain"
              />
              <Text style={[styles.monsterName, { color: colors.foreground }]}>{monster.name}</Text>
            </View>

            {/* HP Bar */}
            <View style={styles.barContainer}>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.muted }]}>HP</Text>
                <Text style={[styles.barValue, { color: colors.muted }]}>
                  {monster.currentHp}/{monster.maxHp}
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.barFill, { width: `${hpPercent}%`, backgroundColor: "#22C55E" }]} />
              </View>
            </View>

            {/* EXP Bar */}
            <View style={styles.barContainer}>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.muted }]}>EXP</Text>
                <Text style={[styles.barValue, { color: colors.muted }]}>
                  {monster.currentExp}/{monster.expToNextLevel}
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.barFill, { width: `${expPercent}%`, backgroundColor: "#8B5CF6" }]} />
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.monsterStatsRow}>
              <View style={styles.monsterStat}>
                <Text style={styles.monsterStatIcon}>🥩</Text>
                <Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{monster.strength}</Text>
              </View>
              <View style={styles.monsterStat}>
                <Text style={styles.monsterStatIcon}>🛡️</Text>
                <Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{monster.defense}</Text>
              </View>
              <View style={styles.monsterStat}>
                <Text style={styles.monsterStatIcon}>⚡</Text>
                <Text style={[styles.monsterStatValue, { color: colors.foreground }]}>{monster.agility}</Text>
              </View>
            </View>

            {/* Evolution Progress */}
            <View style={styles.barContainer}>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.muted }]}>Evolution</Text>
                <Text style={[styles.barValue, { color: colors.muted }]}>
                  {monster.evolutionProgress}/{monster.evolutionMax}
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                <View style={[styles.barFill, { width: `${evoPercent}%`, backgroundColor: "#F59E0B" }]} />
              </View>
            </View>
          </View>

          {/* Hatch Egg Button */}
          <TouchableOpacity
            style={[styles.hatchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
            <Text style={[styles.questCount, { color: colors.muted }]}>0/3 Completed</Text>
          </View>

          {quests.map((quest) => (
            <View
              key={quest.id}
              style={[styles.questCard, { backgroundColor: quest.bgColor }]}
            >
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
                <View
                  style={[
                    styles.questBarFill,
                    {
                      width: `${quest.target > 0 ? (quest.progress / quest.target) * 100 : 0}%`,
                      backgroundColor: "rgba(255,255,255,0.8)",
                    },
                  ]}
                />
              </View>
              <Text style={styles.questProgress}>
                {quest.progress}/{quest.target}
              </Text>
            </View>
          ))}
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
  greeting: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  viewAll: {
    fontSize: 14,
    fontWeight: "600",
  },
  monsterCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  monsterImageContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  monsterImage: {
    width: 180,
    height: 180,
  },
  monsterName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  barContainer: {
    marginBottom: 8,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  barValue: {
    fontSize: 12,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  monsterStatsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    marginVertical: 12,
  },
  monsterStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  monsterStatIcon: {
    fontSize: 18,
  },
  monsterStatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  hatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
  },
  hatchIcon: {
    fontSize: 24,
  },
  hatchText: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  actionSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  questCount: {
    fontSize: 14,
  },
  questCard: {
    borderRadius: 16,
    padding: 16,
  },
  questHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  questIcon: {
    fontSize: 28,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  questDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  questReward: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  questBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  questBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  questProgress: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    textAlign: "right",
  },
});
