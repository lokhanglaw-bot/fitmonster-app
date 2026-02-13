import { useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

const MOCK_OPPONENTS = [
  {
    id: 1, name: "FitChamp", distance: "2.5km", online: true, level: 18,
    monsterType: "Colossus", monsterImage: require("@/assets/monsters/powerlifter-stage2.png"),
    streak: "24 Hour Fitness", matchPercent: 85, todayExp: 450,
    strength: 25, defense: 20, agility: 18, hp: 280,
  },
  {
    id: 2, name: "GymRat", distance: "5km", online: true, level: 14,
    monsterType: "Bodybuilder", monsterImage: require("@/assets/monsters/bodybuilder-stage2.png"),
    streak: "Morning Warrior", matchPercent: 72, todayExp: 320,
    strength: 22, defense: 15, agility: 20, hp: 220,
  },
  {
    id: 3, name: "YogaMaster", distance: "1km", online: false, level: 12,
    monsterType: "Physique", monsterImage: require("@/assets/monsters/physique-stage2.png"),
    streak: "Zen Warrior", matchPercent: 65, todayExp: 200,
    strength: 15, defense: 18, agility: 25, hp: 200,
  },
  {
    id: 4, name: "IronWill", distance: "8km", online: true, level: 22,
    monsterType: "Powerlifter", monsterImage: require("@/assets/monsters/powerlifter-stage3.png"),
    streak: "Beast Mode", matchPercent: 90, todayExp: 600,
    strength: 30, defense: 25, agility: 15, hp: 350,
  },
];

type Friend = {
  id: number;
  name: string;
  level: number;
  monsterType: string;
  monsterImage: any;
  online: boolean;
};

type BattleState = {
  phase: "intro" | "fighting" | "result";
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  turn: "player" | "enemy";
  log: string[];
  opponent: typeof MOCK_OPPONENTS[0];
  result?: "win" | "lose";
};

export default function BattleScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"match" | "friends">("match");
  const [swipesLeft, setSwipesLeft] = useState(50);
  const [currentOpponent, setCurrentOpponent] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showBattle, setShowBattle] = useState(false);
  const [battle, setBattle] = useState<BattleState | null>(null);

  const opponent = MOCK_OPPONENTS[currentOpponent % MOCK_OPPONENTS.length];

  const handleSwipe = useCallback((direction: "left" | "right" | "star") => {
    if (direction === "left") {
      // Reject - just move to next
      setCurrentOpponent((prev) => prev + 1);
      return;
    }
    setSwipesLeft((prev) => Math.max(0, prev - 1));
    if (direction === "star") {
      // Super Like - always match
      const opp = MOCK_OPPONENTS[currentOpponent % MOCK_OPPONENTS.length];
      Alert.alert("It's a Match! ⭐", `You super liked ${opp.name}!\nThey've been added as a friend.`);
      setFriends((prev) => {
        if (prev.find((f) => f.id === opp.id)) return prev;
        return [...prev, { id: opp.id, name: opp.name, level: opp.level, monsterType: opp.monsterType, monsterImage: opp.monsterImage, online: opp.online }];
      });
    } else {
      // Like - 50% chance to match
      const opp = MOCK_OPPONENTS[currentOpponent % MOCK_OPPONENTS.length];
      const matched = Math.random() > 0.3;
      if (matched) {
        Alert.alert("It's a Match! ❤️", `You matched with ${opp.name}!\nThey've been added as a friend.`);
        setFriends((prev) => {
          if (prev.find((f) => f.id === opp.id)) return prev;
          return [...prev, { id: opp.id, name: opp.name, level: opp.level, monsterType: opp.monsterType, monsterImage: opp.monsterImage, online: opp.online }];
        });
      } else {
        Alert.alert("No Match", `${opp.name} didn't match this time. Keep swiping!`);
      }
    }
    setCurrentOpponent((prev) => prev + 1);
  }, [currentOpponent]);

  const startBattle = useCallback((opp: typeof MOCK_OPPONENTS[0]) => {
    const playerMaxHp = 150;
    setBattle({
      phase: "intro",
      playerHp: playerMaxHp,
      playerMaxHp,
      enemyHp: opp.hp,
      enemyMaxHp: opp.hp,
      turn: "player",
      log: [`Battle started against ${opp.name}'s ${opp.monsterType}!`],
      opponent: opp,
    });
    setShowBattle(true);
    // Auto-advance to fighting after intro
    setTimeout(() => {
      setBattle((prev) => prev ? { ...prev, phase: "fighting" } : null);
    }, 1500);
  }, []);

  const handleWildBattle = useCallback(() => {
    const randomOpp = MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)];
    startBattle(randomOpp);
  }, [startBattle]);

  const handleBattleAction = useCallback((action: "attack" | "defend" | "special") => {
    if (!battle || battle.turn !== "player") return;

    setBattle((prev) => {
      if (!prev) return null;
      const newLog = [...prev.log];
      let newEnemyHp = prev.enemyHp;
      let newPlayerHp = prev.playerHp;

      // Player attack
      if (action === "attack") {
        const dmg = Math.floor(Math.random() * 20) + 15;
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        newLog.push(`⚔️ Your monster attacks for ${dmg} damage!`);
      } else if (action === "defend") {
        newLog.push(`🛡️ Your monster defends! Damage reduced next turn.`);
      } else if (action === "special") {
        const dmg = Math.floor(Math.random() * 35) + 25;
        newEnemyHp = Math.max(0, newEnemyHp - dmg);
        newLog.push(`🔥 Special Attack! ${dmg} critical damage!`);
      }

      // Check win
      if (newEnemyHp <= 0) {
        newLog.push(`🏆 You defeated ${prev.opponent.name}!`);
        return { ...prev, enemyHp: 0, log: newLog, phase: "result", result: "win", turn: "player" };
      }

      // Enemy turn
      const isDefending = action === "defend";
      const enemyDmg = Math.max(5, Math.floor(Math.random() * 18) + 10 - (isDefending ? 10 : 0));
      newPlayerHp = Math.max(0, newPlayerHp - enemyDmg);
      newLog.push(`💥 ${prev.opponent.name}'s monster attacks for ${enemyDmg} damage!`);

      // Check lose
      if (newPlayerHp <= 0) {
        newLog.push(`💀 Your monster was defeated...`);
        return { ...prev, playerHp: 0, enemyHp: newEnemyHp, log: newLog, phase: "result", result: "lose", turn: "player" };
      }

      return { ...prev, playerHp: newPlayerHp, enemyHp: newEnemyHp, log: newLog, turn: "player" };
    });
  }, [battle]);

  const handleFriendAction = useCallback((friend: Friend, action: "battle" | "chat") => {
    if (action === "battle") {
      const opp = MOCK_OPPONENTS.find((o) => o.id === friend.id);
      if (opp) startBattle(opp);
      else {
        startBattle({ ...MOCK_OPPONENTS[0], id: friend.id, name: friend.name, level: friend.level, monsterType: friend.monsterType, monsterImage: friend.monsterImage });
      }
    } else {
      router.push({ pathname: "/chat" as any, params: { friendId: String(friend.id), friendName: friend.name } });
    }
  }, [startBattle, router]);

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
              <Text style={[styles.tabText, { color: activeTab === "match" ? "#fff" : colors.muted }]}>Match</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "friends" && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab("friends")}
            >
              <Text style={[styles.tabText, { color: activeTab === "friends" ? "#fff" : colors.muted }]}>
                Friends {friends.length > 0 ? `(${friends.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "match" ? (
            <>
              {/* Banner */}
              <View style={[styles.banner, { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.bannerText}>Swipe Match to Find Opponents!</Text>
                <View style={styles.nearbyBadge}>
                  <Text style={styles.nearbyText}>{MOCK_OPPONENTS.length} nearby</Text>
                </View>
              </View>

              {/* Swipes Counter */}
              <View style={styles.swipeCounter}>
                <Text style={[styles.swipeLabel, { color: colors.muted }]}>Today's Swipes</Text>
                <Text style={[styles.swipeValue, { color: colors.foreground }]}>{swipesLeft}/50</Text>
              </View>

              {/* Opponent Card */}
              <View style={[styles.opponentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardBadges}>
                  <View style={[styles.streakBadge, { backgroundColor: "#F59E0B" }]}>
                    <Text style={styles.streakText}>🔥 {opponent.streak}</Text>
                  </View>
                  <View style={[styles.matchBadge, { backgroundColor: "#22C55E" }]}>
                    <Text style={styles.matchText}>{opponent.matchPercent}% Match</Text>
                  </View>
                </View>

                <View style={[styles.opponentMonster, { backgroundColor: colors.surface }]}>
                  <Image source={opponent.monsterImage} style={styles.opponentImage} contentFit="contain" />
                </View>

                <View style={styles.opponentInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.opponentName, { color: colors.foreground }]}>{opponent.name}</Text>
                    {opponent.online && <View style={styles.onlineDot} />}
                  </View>
                  <Text style={[styles.opponentDistance, { color: colors.muted }]}>{opponent.distance} away</Text>
                </View>

                <View style={styles.levelRow}>
                  <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.levelText}>Lv.{opponent.level}</Text>
                  </View>
                  <Text style={[styles.todayExp, { color: colors.muted }]}>Today: {opponent.todayExp} EXP</Text>
                </View>

                <View style={[styles.monsterTypeRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.monsterType, { color: colors.foreground }]}>{opponent.monsterType} Lv.{opponent.level}</Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statEmoji}>🥩 {opponent.strength}</Text>
                    <Text style={styles.statEmoji}>🛡️ {opponent.defense}</Text>
                    <Text style={styles.statEmoji}>⚡ {opponent.agility}</Text>
                  </View>
                </View>
              </View>

              {/* Swipe Buttons */}
              <View style={styles.swipeButtons}>
                <TouchableOpacity style={[styles.swipeBtn, styles.rejectBtn, { borderColor: "#EF4444" }]} onPress={() => handleSwipe("left")}>
                  <IconSymbol name="xmark" size={28} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.swipeBtn, styles.starBtn, { backgroundColor: "#F59E0B" }]} onPress={() => handleSwipe("star")}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.starCost}>10 🪙</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.swipeBtn, styles.likeBtn, { borderColor: "#22C55E" }]} onPress={() => handleSwipe("right")}>
                  <Text style={styles.heartIcon}>❤️</Text>
                </TouchableOpacity>
              </View>

              {/* Random Wild Battle */}
              <TouchableOpacity style={[styles.wildBattleBtn, { backgroundColor: "#7C3AED" }]} onPress={handleWildBattle}>
                <Text style={styles.wildBattleIcon}>⚔️</Text>
                <Text style={styles.wildBattleText}>Random Wild Battle</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Friends Tab */
            friends.length === 0 ? (
              <View style={[styles.emptyFriends, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Friends Yet</Text>
                <Text style={[styles.emptyDesc, { color: colors.muted }]}>Match with other trainers to add them as friends!</Text>
              </View>
            ) : (
              friends.map((friend) => (
                <View key={friend.id} style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Image source={friend.monsterImage} style={styles.friendMonster} contentFit="contain" />
                  <View style={styles.friendInfo}>
                    <View style={styles.friendNameRow}>
                      <Text style={[styles.friendName, { color: colors.foreground }]}>{friend.name}</Text>
                      {friend.online && <View style={styles.onlineDot} />}
                    </View>
                    <Text style={[styles.friendLevel, { color: colors.muted }]}>{friend.monsterType} Lv.{friend.level}</Text>
                  </View>
                  <View style={styles.friendActions}>
                    <TouchableOpacity
                      style={[styles.friendActionBtn, { backgroundColor: "#7C3AED" }]}
                      onPress={() => handleFriendAction(friend, "battle")}
                    >
                      <Text style={styles.friendActionText}>⚔️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.friendActionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleFriendAction(friend, "chat")}
                    >
                      <IconSymbol name="message.fill" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}
        </View>
      </ScrollView>

      {/* Battle Modal */}
      <Modal visible={showBattle} animationType="fade" transparent>
        <View style={styles.battleOverlay}>
          <View style={[styles.battleContainer, { backgroundColor: colors.background }]}>
            {battle?.phase === "intro" && (
              <View style={styles.battleIntro}>
                <Text style={styles.battleIntroEmoji}>⚔️</Text>
                <Text style={[styles.battleIntroText, { color: colors.foreground }]}>BATTLE START!</Text>
                <Text style={[styles.battleIntroSub, { color: colors.muted }]}>vs {battle.opponent.name}</Text>
              </View>
            )}

            {battle?.phase === "fighting" && (
              <>
                {/* Enemy Side */}
                <View style={styles.battleSide}>
                  <View style={styles.battleMonsterRow}>
                    <Image source={battle.opponent.monsterImage} style={styles.battleMonster} contentFit="contain" />
                    <View style={styles.battleInfo}>
                      <Text style={[styles.battleName, { color: colors.foreground }]}>{battle.opponent.name}</Text>
                      <Text style={[styles.battleType, { color: colors.muted }]}>{battle.opponent.monsterType} Lv.{battle.opponent.level}</Text>
                      <View style={[styles.hpBar, { backgroundColor: colors.surface }]}>
                        <View style={[styles.hpFill, { width: `${(battle.enemyHp / battle.enemyMaxHp) * 100}%`, backgroundColor: battle.enemyHp > battle.enemyMaxHp * 0.3 ? "#22C55E" : "#EF4444" }]} />
                      </View>
                      <Text style={[styles.hpText, { color: colors.muted }]}>{battle.enemyHp}/{battle.enemyMaxHp} HP</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>

                {/* Player Side */}
                <View style={styles.battleSide}>
                  <View style={styles.battleMonsterRow}>
                    <Image source={require("@/assets/monsters/bodybuilder-stage1.png")} style={styles.battleMonster} contentFit="contain" />
                    <View style={styles.battleInfo}>
                      <Text style={[styles.battleName, { color: colors.foreground }]}>Flexo</Text>
                      <Text style={[styles.battleType, { color: colors.muted }]}>Bodybuilder Lv.1</Text>
                      <View style={[styles.hpBar, { backgroundColor: colors.surface }]}>
                        <View style={[styles.hpFill, { width: `${(battle.playerHp / battle.playerMaxHp) * 100}%`, backgroundColor: battle.playerHp > battle.playerMaxHp * 0.3 ? "#22C55E" : "#EF4444" }]} />
                      </View>
                      <Text style={[styles.hpText, { color: colors.muted }]}>{battle.playerHp}/{battle.playerMaxHp} HP</Text>
                    </View>
                  </View>
                </View>

                {/* Battle Log */}
                <View style={[styles.battleLog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {battle.log.slice(-3).map((msg, i) => (
                    <Text key={i} style={[styles.logMsg, { color: colors.foreground }]}>{msg}</Text>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.battleActions}>
                  <TouchableOpacity style={[styles.battleActionBtn, { backgroundColor: "#EF4444" }]} onPress={() => handleBattleAction("attack")}>
                    <Text style={styles.battleActionIcon}>⚔️</Text>
                    <Text style={styles.battleActionLabel}>Attack</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.battleActionBtn, { backgroundColor: "#3B82F6" }]} onPress={() => handleBattleAction("defend")}>
                    <Text style={styles.battleActionIcon}>🛡️</Text>
                    <Text style={styles.battleActionLabel}>Defend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.battleActionBtn, { backgroundColor: "#F59E0B" }]} onPress={() => handleBattleAction("special")}>
                    <Text style={styles.battleActionIcon}>🔥</Text>
                    <Text style={styles.battleActionLabel}>Special</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {battle?.phase === "result" && (
              <View style={styles.battleResult}>
                <Text style={styles.resultEmoji}>{battle.result === "win" ? "🏆" : "💀"}</Text>
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                  {battle.result === "win" ? "VICTORY!" : "DEFEATED"}
                </Text>
                <Text style={[styles.resultSub, { color: colors.muted }]}>
                  {battle.result === "win"
                    ? `You defeated ${battle.opponent.name}!\n+50 EXP  +25 🪙`
                    : `${battle.opponent.name} was too strong.\nTrain harder and try again!`}
                </Text>
                <TouchableOpacity
                  style={[styles.resultBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setShowBattle(false); setBattle(null); }}
                >
                  <Text style={styles.resultBtnText}>Continue</Text>
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
  title: { fontSize: 26, fontWeight: "800" },
  tabRow: { flexDirection: "row", borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  banner: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerText: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 },
  nearbyBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  nearbyText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  swipeCounter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  swipeLabel: { fontSize: 14 },
  swipeValue: { fontSize: 16, fontWeight: "700" },
  opponentCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  cardBadges: { flexDirection: "row", gap: 8, marginBottom: 12 },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  streakText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  matchBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  matchText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  opponentMonster: { alignItems: "center", marginBottom: 12, borderRadius: 16, padding: 8 },
  opponentImage: { width: 160, height: 160 },
  opponentInfo: { alignItems: "center", marginBottom: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  opponentName: { fontSize: 20, fontWeight: "700" },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  opponentDistance: { fontSize: 13, marginTop: 2 },
  levelRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  levelText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  todayExp: { fontSize: 13 },
  monsterTypeRow: { borderTopWidth: 1, paddingTop: 12, alignItems: "center", gap: 8 },
  monsterType: { fontSize: 16, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 20 },
  statEmoji: { fontSize: 16 },
  swipeButtons: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 },
  swipeBtn: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  rejectBtn: { borderWidth: 2 },
  starBtn: { width: 70, height: 70, borderRadius: 35 },
  starIcon: { fontSize: 24 },
  starCost: { color: "#fff", fontSize: 10, fontWeight: "600" },
  likeBtn: { borderWidth: 2 },
  heartIcon: { fontSize: 24 },
  wildBattleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, gap: 8 },
  wildBattleIcon: { fontSize: 20 },
  wildBattleText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  emptyFriends: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center" },

  // Friend card
  friendCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  friendMonster: { width: 50, height: 50 },
  friendInfo: { flex: 1 },
  friendNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  friendName: { fontSize: 16, fontWeight: "700" },
  friendLevel: { fontSize: 13, marginTop: 2 },
  friendActions: { flexDirection: "row", gap: 8 },
  friendActionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  friendActionText: { fontSize: 18 },

  // Battle modal
  battleOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", padding: 20 },
  battleContainer: { borderRadius: 24, padding: 20, gap: 16 },
  battleIntro: { alignItems: "center", paddingVertical: 60, gap: 12 },
  battleIntroEmoji: { fontSize: 64 },
  battleIntroText: { fontSize: 32, fontWeight: "900" },
  battleIntroSub: { fontSize: 18 },
  battleSide: { padding: 8 },
  battleMonsterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  battleMonster: { width: 80, height: 80 },
  battleInfo: { flex: 1, gap: 4 },
  battleName: { fontSize: 16, fontWeight: "700" },
  battleType: { fontSize: 12 },
  hpBar: { height: 10, borderRadius: 5, overflow: "hidden" },
  hpFill: { height: "100%", borderRadius: 5 },
  hpText: { fontSize: 11 },
  vsText: { fontSize: 24, fontWeight: "900", textAlign: "center" },
  battleLog: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 4, maxHeight: 100 },
  logMsg: { fontSize: 13 },
  battleActions: { flexDirection: "row", gap: 12 },
  battleActionBtn: { flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: 16, gap: 4 },
  battleActionIcon: { fontSize: 24 },
  battleActionLabel: { color: "#fff", fontSize: 13, fontWeight: "700" },
  battleResult: { alignItems: "center", paddingVertical: 40, gap: 12 },
  resultEmoji: { fontSize: 64 },
  resultTitle: { fontSize: 32, fontWeight: "900" },
  resultSub: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  resultBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 16, marginTop: 12 },
  resultBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
