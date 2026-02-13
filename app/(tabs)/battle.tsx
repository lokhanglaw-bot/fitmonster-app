import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

const MOCK_OPPONENTS = [
  {
    id: 1,
    name: "FitChamp",
    distance: "2.5km",
    online: true,
    level: 18,
    monsterType: "Colossus",
    monsterImage: require("@/assets/monsters/powerlifter-stage2.png"),
    streak: "24 Hour Fitness",
    matchPercent: 85,
    todayExp: 450,
    strength: 25,
    defense: 20,
    agility: 18,
  },
  {
    id: 2,
    name: "GymRat",
    distance: "5km",
    online: true,
    level: 14,
    monsterType: "Bodybuilder",
    monsterImage: require("@/assets/monsters/bodybuilder-stage2.png"),
    streak: "Morning Warrior",
    matchPercent: 72,
    todayExp: 320,
    strength: 22,
    defense: 15,
    agility: 20,
  },
];

export default function BattleScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"match" | "friends">("match");
  const [swipesLeft, setSwipesLeft] = useState(50);
  const [currentOpponent, setCurrentOpponent] = useState(0);

  const opponent = MOCK_OPPONENTS[currentOpponent % MOCK_OPPONENTS.length];

  const handleSwipe = (direction: "left" | "right" | "star") => {
    if (direction !== "left") {
      setSwipesLeft((prev) => Math.max(0, prev - 1));
    }
    setCurrentOpponent((prev) => prev + 1);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>PvP Battle</Text>
          </View>

          {/* Tab Navigation */}
          <View style={[styles.tabRow, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "match" && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab("match")}
            >
              <Text style={[styles.tabText, { color: activeTab === "match" ? "#fff" : colors.muted }]}>
                Match
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "friends" && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab("friends")}
            >
              <Text style={[styles.tabText, { color: activeTab === "friends" ? "#fff" : colors.muted }]}>
                Friends
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "match" ? (
            <>
              {/* Banner */}
              <View style={[styles.banner, { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.bannerText}>Swipe Match to Find Opponents!</Text>
                <View style={styles.nearbyBadge}>
                  <Text style={styles.nearbyText}>6 nearby</Text>
                </View>
              </View>

              {/* Swipes Counter */}
              <View style={styles.swipeCounter}>
                <Text style={[styles.swipeLabel, { color: colors.muted }]}>Today's Swipes</Text>
                <Text style={[styles.swipeValue, { color: colors.foreground }]}>{swipesLeft}/50</Text>
              </View>

              {/* Opponent Card */}
              <View style={[styles.opponentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Top Badges */}
                <View style={styles.cardBadges}>
                  <View style={[styles.streakBadge, { backgroundColor: "#F59E0B" }]}>
                    <Text style={styles.streakText}>🔥 {opponent.streak}</Text>
                  </View>
                  <View style={[styles.matchBadge, { backgroundColor: "#22C55E" }]}>
                    <Text style={styles.matchText}>{opponent.matchPercent}% Match</Text>
                  </View>
                </View>

                {/* Monster Image */}
                <View style={styles.opponentMonster}>
                  <Image
                    source={opponent.monsterImage}
                    style={styles.opponentImage}
                    contentFit="contain"
                  />
                </View>

                {/* Opponent Info */}
                <View style={styles.opponentInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.opponentName, { color: colors.foreground }]}>{opponent.name}</Text>
                    {opponent.online && <View style={styles.onlineDot} />}
                  </View>
                  <Text style={[styles.opponentDistance, { color: colors.muted }]}>
                    {opponent.distance} away
                  </Text>
                </View>

                {/* Level & EXP */}
                <View style={styles.levelRow}>
                  <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.levelText}>Lv.{opponent.level}</Text>
                  </View>
                  <Text style={[styles.todayExp, { color: colors.muted }]}>
                    Today: {opponent.todayExp} EXP
                  </Text>
                </View>

                {/* Monster Type & Stats */}
                <View style={[styles.monsterTypeRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.monsterType, { color: colors.foreground }]}>
                    {opponent.monsterType} Lv.{opponent.level}
                  </Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statEmoji}>🥩 {opponent.strength}</Text>
                    <Text style={styles.statEmoji}>🛡️ {opponent.defense}</Text>
                    <Text style={styles.statEmoji}>⚡ {opponent.agility}</Text>
                  </View>
                </View>
              </View>

              {/* Swipe Buttons */}
              <View style={styles.swipeButtons}>
                <TouchableOpacity
                  style={[styles.swipeBtn, styles.rejectBtn, { borderColor: "#EF4444" }]}
                  onPress={() => handleSwipe("left")}
                >
                  <IconSymbol name="xmark" size={28} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swipeBtn, styles.starBtn, { backgroundColor: "#F59E0B" }]}
                  onPress={() => handleSwipe("star")}
                >
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.starCost}>10 🪙</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swipeBtn, styles.likeBtn, { borderColor: "#22C55E" }]}
                  onPress={() => handleSwipe("right")}
                >
                  <Text style={styles.heartIcon}>❤️</Text>
                </TouchableOpacity>
              </View>

              {/* Random Wild Battle */}
              <TouchableOpacity style={[styles.wildBattleBtn, { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.wildBattleIcon}>⚔️</Text>
                <Text style={styles.wildBattleText}>Random Wild Battle</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Friends Tab */
            <View style={[styles.emptyFriends, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Friends Yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                Match with other trainers to add them as friends!
              </Text>
            </View>
          )}
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
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  tabRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  nearbyBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nearbyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  swipeCounter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  swipeLabel: {
    fontSize: 14,
  },
  swipeValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  opponentCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  cardBadges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  streakBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  opponentMonster: {
    alignItems: "center",
    marginBottom: 12,
  },
  opponentImage: {
    width: 160,
    height: 160,
  },
  opponentInfo: {
    alignItems: "center",
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  opponentName: {
    fontSize: 20,
    fontWeight: "700",
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  opponentDistance: {
    fontSize: 13,
    marginTop: 2,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  todayExp: {
    fontSize: 13,
  },
  monsterTypeRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    alignItems: "center",
    gap: 8,
  },
  monsterType: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
  },
  statEmoji: {
    fontSize: 16,
  },
  swipeButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  swipeBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    borderWidth: 2,
  },
  starBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  starIcon: {
    fontSize: 24,
  },
  starCost: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  likeBtn: {
    borderWidth: 2,
  },
  heartIcon: {
    fontSize: 24,
  },
  wildBattleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  wildBattleIcon: {
    fontSize: 20,
  },
  wildBattleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyFriends: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
  },
});
