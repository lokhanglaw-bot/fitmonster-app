import { useState, useCallback, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Animated as RNAnimated,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useI18n } from "@/lib/i18n-context";

const MOCK_OPPONENTS = [
  {
    id: 1, name: "FitChamp", distance: "2.5km", online: true, level: 18,
    monsterType: "Powerlifter", monsterImage: require("@/assets/monsters/powerlifter-stage2.png"),
    streakKey: "streak24HourFitness" as const, matchPercent: 85, todayExp: 450,
    strength: 25, defense: 20, agility: 18, hp: 280,
    gradient: ["#FEF3C7", "#FDE68A"] as readonly [string, string],
  },
  {
    id: 2, name: "GymRat", distance: "5km", online: true, level: 14,
    monsterType: "Bodybuilder", monsterImage: require("@/assets/monsters/bodybuilder-stage2.png"),
    streakKey: "streakMorningWarrior" as const, matchPercent: 72, todayExp: 320,
    strength: 22, defense: 15, agility: 20, hp: 220,
    gradient: ["#DCFCE7", "#BBF7D0"] as readonly [string, string],
  },
  {
    id: 3, name: "YogaMaster", distance: "1km", online: false, level: 12,
    monsterType: "Physique", monsterImage: require("@/assets/monsters/physique-stage2.png"),
    streakKey: "streakZenWarrior" as const, matchPercent: 65, todayExp: 200,
    strength: 15, defense: 18, agility: 25, hp: 200,
    gradient: ["#DBEAFE", "#BFDBFE"] as readonly [string, string],
  },
  {
    id: 4, name: "IronWill", distance: "8km", online: true, level: 22,
    monsterType: "Powerlifter", monsterImage: require("@/assets/monsters/powerlifter-stage3.png"),
    streakKey: "streakBeastMode" as const, matchPercent: 90, todayExp: 600,
    strength: 30, defense: 25, agility: 15, hp: 350,
    gradient: ["#FEF3C7", "#FDE68A"] as readonly [string, string],
  },
];

type Opponent = typeof MOCK_OPPONENTS[0];

type FriendRequest = {
  id: number;
  from: Opponent;
  status: "pending" | "accepted" | "rejected";
  sentByMe: boolean;
  timestamp: Date;
};

type Friend = {
  id: number;
  name: string;
  level: number;
  monsterType: string;
  monsterImage: any;
  online: boolean;
  gradient: readonly [string, string];
  addedAt: Date;
};

type BattleState = {
  phase: "intro" | "fighting" | "result";
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  turn: "player" | "enemy";
  log: string[];
  opponent: Opponent;
  result?: "win" | "lose";
  actionLock: boolean;
};

export default function BattleScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, tr } = useI18n();
  const [activeTab, setActiveTab] = useState<"match" | "requests" | "friends">("match");
  const [swipesLeft, setSwipesLeft] = useState(50);
  const [currentOpponent, setCurrentOpponent] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([
    // Simulate some incoming requests from other users
    {
      id: 101, from: MOCK_OPPONENTS[2], status: "pending", sentByMe: false,
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 102, from: MOCK_OPPONENTS[3], status: "pending", sentByMe: false,
      timestamp: new Date(Date.now() - 7200000),
    },
  ]);
  const [showBattle, setShowBattle] = useState(false);
  const [battle, setBattle] = useState<BattleState | null>(null);

  // Animation refs for battle
  const playerShake = useRef(new RNAnimated.Value(0)).current;
  const enemyShake = useRef(new RNAnimated.Value(0)).current;
  const attackFlash = useRef(new RNAnimated.Value(0)).current;
  const defendFlash = useRef(new RNAnimated.Value(0)).current;
  const specialFlash = useRef(new RNAnimated.Value(0)).current;

  const opponent = MOCK_OPPONENTS[currentOpponent % MOCK_OPPONENTS.length];

  const pendingRequests = friendRequests.filter((r) => r.status === "pending");
  const incomingRequests = pendingRequests.filter((r) => !r.sentByMe);
  const sentRequests = pendingRequests.filter((r) => r.sentByMe);

  const shakeAnimation = (target: RNAnimated.Value) => {
    RNAnimated.sequence([
      RNAnimated.timing(target, { toValue: 10, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(target, { toValue: -10, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(target, { toValue: 8, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(target, { toValue: -8, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(target, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const flashAnimation = (target: RNAnimated.Value) => {
    RNAnimated.sequence([
      RNAnimated.timing(target, { toValue: 1, duration: 150, useNativeDriver: true }),
      RNAnimated.timing(target, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  // Send friend request (swipe right)
  const handleSwipe = useCallback((direction: "left" | "right" | "star") => {
    const opp = MOCK_OPPONENTS[currentOpponent % MOCK_OPPONENTS.length];

    if (direction === "left") {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentOpponent((prev) => prev + 1);
      return;
    }

    setSwipesLeft((prev) => Math.max(0, prev - 1));

    // Check if already sent a request or already friends
    const alreadyRequested = friendRequests.some((r) => r.from.id === opp.id);
    const alreadyFriend = friends.some((f) => f.id === opp.id);

    if (alreadyFriend) {
      Alert.alert(t.alreadyFriendsTitle, tr("alreadyFriendsMsg", { name: opp.name }));
      setCurrentOpponent((prev) => prev + 1);
      return;
    }

    if (alreadyRequested) {
      Alert.alert(t.requestAlreadySentTitle, tr("requestAlreadySentMsg", { name: opp.name }));
      setCurrentOpponent((prev) => prev + 1);
      return;
    }

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (direction === "star") {
      // Super like = instant mutual match (both agree)
      Alert.alert(
        t.itsAMatchTitle,
        tr("itsAMatchMsg", { name: opp.name }),
      );
      setFriends((prev) => [
        ...prev,
        {
          id: opp.id, name: opp.name, level: opp.level,
          monsterType: opp.monsterType, monsterImage: opp.monsterImage,
          online: opp.online, gradient: opp.gradient, addedAt: new Date(),
        },
      ]);
    } else {
      // Regular like = send friend request (needs acceptance)
      Alert.alert(
        t.friendRequestSentEmoji,
        tr("friendRequestSentMsg", { name: opp.name }),
      );
      setFriendRequests((prev) => [
        ...prev,
        {
          id: Date.now(),
          from: opp,
          status: "pending",
          sentByMe: true,
          timestamp: new Date(),
        },
      ]);

      // Simulate the other user accepting after 5-15 seconds
      const acceptDelay = Math.floor(Math.random() * 10000) + 5000;
      const reqId = Date.now();
      setTimeout(() => {
        setFriendRequests((prev) => {
          const req = prev.find((r) => r.id === reqId);
          if (!req || req.status !== "pending") return prev;
          return prev.map((r) =>
            r.id === reqId ? { ...r, status: "accepted" as const } : r
          );
        });
        setFriends((prev) => {
          if (prev.find((f) => f.id === opp.id)) return prev;
          return [
            ...prev,
            {
              id: opp.id, name: opp.name, level: opp.level,
              monsterType: opp.monsterType, monsterImage: opp.monsterImage,
              online: opp.online, gradient: opp.gradient, addedAt: new Date(),
            },
          ];
        });
      }, acceptDelay);
    }

    setCurrentOpponent((prev) => prev + 1);
  }, [currentOpponent, friendRequests, friends]);

  // Accept incoming friend request
  const handleAcceptRequest = useCallback((request: FriendRequest) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setFriendRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status: "accepted" as const } : r))
    );
    setFriends((prev) => {
      if (prev.find((f) => f.id === request.from.id)) return prev;
      return [
        ...prev,
        {
          id: request.from.id, name: request.from.name, level: request.from.level,
          monsterType: request.from.monsterType, monsterImage: request.from.monsterImage,
          online: request.from.online, gradient: request.from.gradient, addedAt: new Date(),
        },
      ];
    });
    Alert.alert(t.friendAddedTitle, tr("friendAddedMsg", { name: request.from.name }));
  }, []);

  // Reject incoming friend request
  const handleRejectRequest = useCallback((request: FriendRequest) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFriendRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status: "rejected" as const } : r))
    );
  }, []);

  const startBattle = useCallback((opp: Opponent) => {
    const playerMaxHp = 150;
    setBattle({
      phase: "intro", playerHp: playerMaxHp, playerMaxHp,
      enemyHp: opp.hp, enemyMaxHp: opp.hp, turn: "player",
      log: [tr("battleStartedLog", { name: opp.name, type: opp.monsterType })],
      opponent: opp, actionLock: false,
    });
    setShowBattle(true);
    setTimeout(() => {
      setBattle((prev) => prev ? { ...prev, phase: "fighting" } : null);
    }, 1500);
  }, []);

  const handleWildBattle = useCallback(() => {
    const randomOpp = MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)];
    startBattle(randomOpp);
  }, [startBattle]);

  const handleBattleAction = useCallback((action: "attack" | "defend" | "special") => {
    if (!battle || battle.turn !== "player" || battle.actionLock) return;
    setBattle((prev) => prev ? { ...prev, actionLock: true } : null);

    if (action === "attack") {
      shakeAnimation(enemyShake);
      flashAnimation(attackFlash);
    } else if (action === "defend") {
      flashAnimation(defendFlash);
    } else {
      shakeAnimation(enemyShake);
      flashAnimation(specialFlash);
    }

    setTimeout(() => {
      setBattle((prev) => {
        if (!prev) return null;
        const newLog = [...prev.log];
        let newEnemyHp = prev.enemyHp;
        let newPlayerHp = prev.playerHp;

        if (action === "attack") {
          const dmg = Math.floor(Math.random() * 20) + 15;
          newEnemyHp = Math.max(0, newEnemyHp - dmg);
          newLog.push(tr("yourMonsterAttacksLog", { dmg: String(dmg) }));
        } else if (action === "defend") {
          newLog.push(t.yourMonsterDefendsLog);
        } else {
          const dmg = Math.floor(Math.random() * 35) + 25;
          newEnemyHp = Math.max(0, newEnemyHp - dmg);
          newLog.push(tr("specialAttackLog", { dmg: String(dmg) }));
        }

        if (newEnemyHp <= 0) {
          newLog.push(tr("youDefeatedLog", { name: prev.opponent.name }));
          return { ...prev, enemyHp: 0, log: newLog, phase: "result", result: "win", turn: "player", actionLock: false };
        }

        const isDefending = action === "defend";
        const enemyDmg = Math.max(5, Math.floor(Math.random() * 18) + 10 - (isDefending ? 10 : 0));
        newPlayerHp = Math.max(0, newPlayerHp - enemyDmg);
        newLog.push(tr("enemyAttacksLog", { name: prev.opponent.name, dmg: String(enemyDmg) }));

        setTimeout(() => shakeAnimation(playerShake), 200);

        if (newPlayerHp <= 0) {
          newLog.push(t.yourMonsterDefeatedLog);
          return { ...prev, playerHp: 0, enemyHp: newEnemyHp, log: newLog, phase: "result", result: "lose", turn: "player", actionLock: false };
        }

        return { ...prev, playerHp: newPlayerHp, enemyHp: newEnemyHp, log: newLog, turn: "player", actionLock: false };
      });
    }, 500);
  }, [battle, enemyShake, playerShake, attackFlash, defendFlash, specialFlash]);

  const handleFriendAction = useCallback((friend: Friend, action: "battle" | "chat") => {
    if (action === "battle") {
      const opp = MOCK_OPPONENTS.find((o) => o.id === friend.id);
      if (opp) startBattle(opp);
      else {
        startBattle({ ...MOCK_OPPONENTS[0], id: friend.id, name: friend.name, level: friend.level, monsterType: friend.monsterType, monsterImage: friend.monsterImage, gradient: friend.gradient });
      }
    } else {
      router.push({ pathname: "/chat" as any, params: { friendId: String(friend.id), friendName: friend.name } });
    }
  }, [startBattle, router]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t.pvpBattle}</Text>
            <TouchableOpacity
              style={[styles.mapBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push("/nearby-map" as any)}
              activeOpacity={0.7}
            >
              <IconSymbol name="map.fill" size={18} color={colors.primary} />
              <Text style={[styles.mapBtnText, { color: colors.primary }]}>{t.map}</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Navigation - 3 tabs */}
          <View style={[styles.tabRow, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "match" && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab("match")}
            >
              <Text style={[styles.tabText, { color: activeTab === "match" ? "#fff" : colors.muted }]}>{t.match}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "requests" && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab("requests")}
            >
              <Text style={[styles.tabText, { color: activeTab === "requests" ? "#fff" : colors.muted }]}>
                {t.requests} {incomingRequests.length > 0 ? `(${incomingRequests.length})` : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "friends" && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab("friends")}
            >
              <Text style={[styles.tabText, { color: activeTab === "friends" ? "#fff" : colors.muted }]}>
                {t.friends} {friends.length > 0 ? `(${friends.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ===== MATCH TAB ===== */}
          {activeTab === "match" && (
            <>
              <LinearGradient colors={["#7C3AED", "#6D28D9"]} style={styles.banner}>
                <Text style={styles.bannerText}>{t.swipeToFind}</Text>
                <View style={styles.nearbyBadge}>
                  <Text style={styles.nearbyText}>{MOCK_OPPONENTS.length} {t.nearby}</Text>
                </View>
              </LinearGradient>

              <View style={styles.swipeCounter}>
                <Text style={[styles.swipeLabel, { color: colors.muted }]}>{t.todaysSwipes}</Text>
                <Text style={[styles.swipeValue, { color: colors.foreground }]}>{swipesLeft}/50</Text>
              </View>

              {/* How it works info */}
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 16 }}>💡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoTitle, { color: colors.foreground }]}>{t.howMatchingWorks}</Text>
                  <Text style={[styles.infoDesc, { color: colors.muted }]}>
                    {t.matchInfoLike}{"\n"}
                    {t.matchInfoSuperLike}{"\n"}
                    {t.matchInfoSkip}
                  </Text>
                </View>
              </View>

              {/* Opponent Card */}
              <View style={[styles.opponentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardBadges}>
                  <View style={[styles.streakBadge, { backgroundColor: "#F59E0B" }]}>
                    <Text style={styles.streakText}>🔥 {(t as any)[opponent.streakKey] || opponent.streakKey}</Text>
                  </View>
                  <View style={[styles.matchBadge, { backgroundColor: "#22C55E" }]}>
                    <Text style={styles.matchText}>{tr("matchPercent", { percent: String(opponent.matchPercent) })}</Text>
                  </View>
                </View>

                <View style={styles.opponentMonsterContainer}>
                  <LinearGradient colors={[opponent.gradient[0], opponent.gradient[1]]} style={styles.opponentGradient}>
                    <Image source={opponent.monsterImage} style={styles.opponentImage} contentFit="contain" />
                  </LinearGradient>
                </View>

                <View style={styles.opponentInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.opponentName, { color: colors.foreground }]}>{opponent.name}</Text>
                    {opponent.online && <View style={styles.onlineDot} />}
                  </View>
                  <Text style={[styles.opponentDistance, { color: colors.muted }]}>{opponent.distance} {t.away}</Text>
                </View>

                <View style={styles.levelRow}>
                  <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.levelText}>Lv.{opponent.level}</Text>
                  </View>
                  <Text style={[styles.todayExp, { color: colors.muted }]}>{t.todayExpLabel} {opponent.todayExp} EXP</Text>
                </View>

                <View style={[styles.monsterTypeRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.monsterType, { color: colors.foreground }]}>{(t as any)[opponent.monsterType.toLowerCase()] || opponent.monsterType} Lv.{opponent.level}</Text>
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
                  <Text style={styles.heartEmoji}>❤️</Text>
                </TouchableOpacity>
              </View>

              {/* Random Wild Battle */}
              <TouchableOpacity onPress={handleWildBattle}>
                <LinearGradient colors={["#7C3AED", "#6D28D9"]} style={styles.wildBattleBtn}>
                  <Text style={styles.wildBattleIcon}>⚔️</Text>
                  <Text style={styles.wildBattleText}>{t.randomWildBattle}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* ===== REQUESTS TAB ===== */}
          {activeTab === "requests" && (
            <>
              {/* Incoming Requests */}
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                📥 {t.incomingRequests} ({incomingRequests.length})
              </Text>
              {incomingRequests.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 32 }}>📭</Text>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.noIncomingRequests}</Text>
                  <Text style={[styles.emptyDesc, { color: colors.muted }]}>{t.noIncomingRequestsDesc}</Text>
                </View>
              ) : (
                incomingRequests.map((req) => (
                  <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <LinearGradient colors={[req.from.gradient[0], req.from.gradient[1]]} style={styles.requestGradient}>
                      <Image source={req.from.monsterImage} style={styles.requestMonster} contentFit="contain" />
                    </LinearGradient>
                    <View style={styles.requestInfo}>
                      <View style={styles.requestNameRow}>
                        <Text style={[styles.requestName, { color: colors.foreground }]}>{req.from.name}</Text>
                        {req.from.online && <View style={styles.onlineDot} />}
                      </View>
                      <Text style={[styles.requestLevel, { color: colors.muted }]}>
                        {(t as any)[req.from.monsterType.toLowerCase()] || req.from.monsterType} Lv.{req.from.level} · {req.from.distance}
                      </Text>
                      <Text style={[styles.requestTime, { color: colors.muted }]}>
                        {getTimeAgo(req.timestamp, t as any)}
                      </Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: "#22C55E" }]}
                        onPress={() => handleAcceptRequest(req)}
                      >
                        <IconSymbol name="checkmark" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rejectRequestBtn, { backgroundColor: "#FEE2E2" }]}
                        onPress={() => handleRejectRequest(req)}
                      >
                        <IconSymbol name="xmark" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Sent Requests */}
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
                📤 {t.sentRequests} ({sentRequests.length})
              </Text>
              {sentRequests.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 32 }}>💌</Text>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.noSentRequests}</Text>
                  <Text style={[styles.emptyDesc, { color: colors.muted }]}>{t.noSentRequestsDesc}</Text>
                </View>
              ) : (
                sentRequests.map((req) => (
                  <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <LinearGradient colors={[req.from.gradient[0], req.from.gradient[1]]} style={styles.requestGradient}>
                      <Image source={req.from.monsterImage} style={styles.requestMonster} contentFit="contain" />
                    </LinearGradient>
                    <View style={styles.requestInfo}>
                      <Text style={[styles.requestName, { color: colors.foreground }]}>{req.from.name}</Text>
                      <Text style={[styles.requestLevel, { color: colors.muted }]}>
                        {(t as any)[req.from.monsterType.toLowerCase()] || req.from.monsterType} Lv.{req.from.level}
                      </Text>
                    </View>
                    <View style={[styles.pendingBadge, { backgroundColor: "#FEF3C7" }]}>
                      <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "600" }}>⏳ {t.pending}</Text>
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* ===== FRIENDS TAB ===== */}
          {activeTab === "friends" && (
            <>
              {friends.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 40 }}>👥</Text>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.noFriendsYet}</Text>
                  <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                    {t.noFriendsYetDesc}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    🏆 {t.yourBattleFriends} ({friends.length})
                  </Text>
                  {friends.map((friend) => (
                    <View key={friend.id} style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <LinearGradient colors={[friend.gradient[0], friend.gradient[1]]} style={styles.friendGradient}>
                        <Image source={friend.monsterImage} style={styles.friendMonster} contentFit="contain" />
                      </LinearGradient>
                      <View style={styles.friendInfo}>
                        <View style={styles.friendNameRow}>
                          <Text style={[styles.friendName, { color: colors.foreground }]}>{friend.name}</Text>
                          {friend.online && <View style={styles.onlineDot} />}
                        </View>
                        <Text style={[styles.friendLevel, { color: colors.muted }]}>{(t as any)[friend.monsterType.toLowerCase()] || friend.monsterType} Lv.{friend.level}</Text>
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
                  ))}
                </>
              )}

              {/* Random Wild Battle always available */}
              <TouchableOpacity onPress={handleWildBattle} style={{ marginTop: 8 }}>
                <LinearGradient colors={["#7C3AED", "#6D28D9"]} style={styles.wildBattleBtn}>
                  <Text style={styles.wildBattleIcon}>⚔️</Text>
                  <Text style={styles.wildBattleText}>{t.randomWildBattle}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
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
                <Text style={[styles.battleIntroText, { color: colors.foreground }]}>{t.battleStart}</Text>
                <Text style={[styles.battleIntroSub, { color: colors.muted }]}>vs {battle.opponent.name}</Text>
              </View>
            )}

            {battle?.phase === "fighting" && (
              <>
                <View style={styles.battleSide}>
                  <RNAnimated.View style={[styles.battleMonsterRow, { transform: [{ translateX: enemyShake }] }]}>
                    <LinearGradient colors={[battle.opponent.gradient[0], battle.opponent.gradient[1]]} style={styles.battleGradient}>
                      <Image source={battle.opponent.monsterImage} style={styles.battleMonster} contentFit="contain" />
                    </LinearGradient>
                    <View style={styles.battleInfo}>
                      <Text style={[styles.battleName, { color: colors.foreground }]}>{battle.opponent.name}</Text>
                      <Text style={[styles.battleType, { color: colors.muted }]}>{(t as any)[battle.opponent.monsterType.toLowerCase()] || battle.opponent.monsterType} Lv.{battle.opponent.level}</Text>
                      <View style={[styles.hpBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.hpFill, { width: `${(battle.enemyHp / battle.enemyMaxHp) * 100}%`, backgroundColor: battle.enemyHp > battle.enemyMaxHp * 0.3 ? "#22C55E" : "#EF4444" }]} />
                      </View>
                      <Text style={[styles.hpText, { color: colors.muted }]}>{battle.enemyHp}/{battle.enemyMaxHp} HP</Text>
                    </View>
                  </RNAnimated.View>
                </View>

                <Text style={[styles.vsText, { color: colors.primary }]}>VS</Text>

                <View style={styles.battleSide}>
                  <RNAnimated.View style={[styles.battleMonsterRow, { transform: [{ translateX: playerShake }] }]}>
                    <LinearGradient colors={["#DCFCE7", "#BBF7D0"]} style={styles.battleGradient}>
                      <Image source={require("@/assets/monsters/bodybuilder-stage1.png")} style={styles.battleMonster} contentFit="contain" />
                    </LinearGradient>
                    <View style={styles.battleInfo}>
                      <Text style={[styles.battleName, { color: colors.foreground }]}>Flexo</Text>
                      <Text style={[styles.battleType, { color: colors.muted }]}>{t.bodybuilder} Lv.1</Text>
                      <View style={[styles.hpBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.hpFill, { width: `${(battle.playerHp / battle.playerMaxHp) * 100}%`, backgroundColor: battle.playerHp > battle.playerMaxHp * 0.3 ? "#22C55E" : "#EF4444" }]} />
                      </View>
                      <Text style={[styles.hpText, { color: colors.muted }]}>{battle.playerHp}/{battle.playerMaxHp} HP</Text>
                    </View>
                  </RNAnimated.View>
                </View>

                <RNAnimated.View pointerEvents="none" style={[styles.flashOverlay, { backgroundColor: "#EF4444", opacity: attackFlash }]} />
                <RNAnimated.View pointerEvents="none" style={[styles.flashOverlay, { backgroundColor: "#3B82F6", opacity: defendFlash }]} />
                <RNAnimated.View pointerEvents="none" style={[styles.flashOverlay, { backgroundColor: "#F59E0B", opacity: specialFlash }]} />

                <View style={[styles.battleLog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {battle.log.slice(-3).map((msg, i) => (
                    <Text key={i} style={[styles.logMsg, { color: colors.foreground }]}>{msg}</Text>
                  ))}
                </View>

                <View style={styles.battleActions}>
                  <TouchableOpacity style={[styles.battleActionBtn, { backgroundColor: battle.actionLock ? "#999" : "#EF4444" }]} onPress={() => handleBattleAction("attack")} disabled={battle.actionLock}>
                    <Text style={styles.battleActionIcon}>⚔️</Text>
                    <Text style={styles.battleActionLabel}>{t.attack}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.battleActionBtn, { backgroundColor: battle.actionLock ? "#999" : "#3B82F6" }]} onPress={() => handleBattleAction("defend")} disabled={battle.actionLock}>
                    <Text style={styles.battleActionIcon}>🛡️</Text>
                    <Text style={styles.battleActionLabel}>{t.defend}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.battleActionBtn, { backgroundColor: battle.actionLock ? "#999" : "#F59E0B" }]} onPress={() => handleBattleAction("special")} disabled={battle.actionLock}>
                    <Text style={styles.battleActionIcon}>🔥</Text>
                    <Text style={styles.battleActionLabel}>{t.special}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {battle?.phase === "result" && (
              <View style={styles.battleResult}>
                <Text style={styles.resultEmoji}>{battle.result === "win" ? "🏆" : "💀"}</Text>
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                  {battle.result === "win" ? t.victory : t.defeat}
                </Text>
                <Text style={[styles.resultSub, { color: colors.muted }]}>
                  {battle.result === "win"
                    ? `${t.victoryMessage}\n+50 EXP  +25 🪙`
                    : t.defeatMessage}
                </Text>
                <TouchableOpacity
                  style={[styles.resultBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setShowBattle(false); setBattle(null); }}
                >
                  <Text style={styles.resultBtnText}>{t.continueBtn}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function getTimeAgo(date: Date, t?: any): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t?.justNow || "Just now";
  if (minutes < 60) return t?.minutesAgo?.replace("{n}", String(minutes)) || `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t?.hoursAgo?.replace("{n}", String(hours)) || `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return t?.daysAgo?.replace("{n}", String(days)) || `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800" },
  tabRow: { flexDirection: "row", borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 13, fontWeight: "600" },
  banner: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bannerText: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 },
  nearbyBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  nearbyText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  swipeCounter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  swipeLabel: { fontSize: 14 },
  swipeValue: { fontSize: 16, fontWeight: "700" },

  // Info card
  infoCard: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, alignItems: "flex-start" },
  infoTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  infoDesc: { fontSize: 12, lineHeight: 20 },

  // Opponent card
  opponentCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  cardBadges: { flexDirection: "row", gap: 8, marginBottom: 12 },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  streakText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  matchBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  matchText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  opponentMonsterContainer: { alignItems: "center", marginBottom: 12 },
  opponentGradient: { borderRadius: 20, padding: 16, alignItems: "center", justifyContent: "center", width: 180, height: 180 },
  opponentImage: { width: 150, height: 150 },
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

  // Swipe buttons
  swipeButtons: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 },
  swipeBtn: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  rejectBtn: { borderWidth: 2 },
  starBtn: { width: 70, height: 70, borderRadius: 35 },
  starIcon: { fontSize: 24 },
  starCost: { color: "#fff", fontSize: 10, fontWeight: "600" },
  likeBtn: { borderWidth: 2 },
  heartEmoji: { fontSize: 24 },
  wildBattleBtn: { borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  wildBattleIcon: { fontSize: 20 },
  wildBattleText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Section title
  sectionTitle: { fontSize: 18, fontWeight: "700" },

  // Empty card
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },

  // Request card
  requestCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  requestGradient: { borderRadius: 12, width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  requestMonster: { width: 44, height: 44 },
  requestInfo: { flex: 1 },
  requestNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  requestName: { fontSize: 16, fontWeight: "700" },
  requestLevel: { fontSize: 13, marginTop: 2 },
  requestTime: { fontSize: 11, marginTop: 2 },
  requestActions: { flexDirection: "row", gap: 8 },
  acceptBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rejectRequestBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pendingBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },

  // Friend card
  friendCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  friendGradient: { borderRadius: 12, width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  friendMonster: { width: 40, height: 40 },
  friendInfo: { flex: 1 },
  friendNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  friendName: { fontSize: 16, fontWeight: "700" },
  friendLevel: { fontSize: 13, marginTop: 2 },
  friendActions: { flexDirection: "row", gap: 8 },
  friendActionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  friendActionText: { fontSize: 18 },

  // Battle modal
  battleOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 20 },
  battleContainer: { borderRadius: 24, padding: 20, gap: 16, overflow: "hidden" },
  battleIntro: { alignItems: "center", paddingVertical: 60, gap: 12 },
  battleIntroEmoji: { fontSize: 64 },
  battleIntroText: { fontSize: 32, fontWeight: "900" },
  battleIntroSub: { fontSize: 18 },
  battleSide: { padding: 8 },
  battleMonsterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  battleGradient: { borderRadius: 16, width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  battleMonster: { width: 65, height: 65 },
  battleInfo: { flex: 1, gap: 4 },
  battleName: { fontSize: 16, fontWeight: "700" },
  battleType: { fontSize: 12 },
  hpBar: { height: 10, borderRadius: 5, overflow: "hidden" },
  hpFill: { height: "100%", borderRadius: 5 },
  hpText: { fontSize: 11 },
  vsText: { fontSize: 24, fontWeight: "900", textAlign: "center" },
  flashOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24 },
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
  mapBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  mapBtnText: { fontSize: 13, fontWeight: "600" },
});
