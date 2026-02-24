import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { trpc } from "@/lib/trpc";
import { useActivity } from "@/lib/activity-context";
import { useAuthContext } from "@/lib/auth-context";
import * as Location from "expo-location";

// Opponent type used for battle system
type Opponent = {
  id: number;
  name: string;
  distance: string;
  online: boolean;
  level: number;
  monsterType: string;
  monsterImage: any;
  streakKey: string;
  matchPercent: number;
  todayExp: number;
  strength: number;
  defense: number;
  agility: number;
  hp: number;
  gradient: readonly [string, string];
  gender?: "male" | "female";
};

function buildOpponentFromNearby(user: any): Opponent {
  const type = (user.monsterType || "bodybuilder").toLowerCase();
  const stage = user.monsterStage || 1;
  // Use monster name for privacy, fallback to type name
  const monsterDisplayName = user.monsterName || (type.charAt(0).toUpperCase() + type.slice(1));
  return {
    id: user.userId,
    name: monsterDisplayName,
    distance: user.distanceKm ? `${user.distanceKm}km` : "?",
    online: true,
    level: user.monsterLevel || 1,
    monsterType: type.charAt(0).toUpperCase() + type.slice(1),
    monsterImage: getMonsterImage(type, stage),
    streakKey: "streakBeastMode",
    matchPercent: Math.round(50 + Math.random() * 40),
    todayExp: (user.totalExp || 0) % 1000,
    strength: 10 + (user.monsterLevel || 1) * 2,
    defense: 8 + (user.monsterLevel || 1) * 2,
    agility: 8 + (user.monsterLevel || 1) * 2,
    hp: 100 + (user.monsterLevel || 1) * 10,
    gradient: getGradientForType(type),
    gender: user.gender || undefined,
  };
}

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
  gender?: "male" | "female";
  hideLocation?: boolean;
};

// Helper to get monster image by type and stage
function getMonsterImage(type: string, stage: number) {
  const images: Record<string, any[]> = {
    bodybuilder: [
      require("@/assets/monsters/bodybuilder-stage1.png"),
      require("@/assets/monsters/bodybuilder-stage2.png"),
      require("@/assets/monsters/bodybuilder-stage3.png"),
    ],
    physique: [
      require("@/assets/monsters/physique-stage1.png"),
      require("@/assets/monsters/physique-stage2.png"),
      require("@/assets/monsters/physique-stage3.png"),
    ],
    powerlifter: [
      require("@/assets/monsters/powerlifter-stage1.png"),
      require("@/assets/monsters/powerlifter-stage2.png"),
      require("@/assets/monsters/powerlifter-stage3.png"),
    ],
  };
  const typeImages = images[type.toLowerCase()] || images.bodybuilder;
  return typeImages[Math.min(stage - 1, 2)] || typeImages[0];
}

function getGradientForType(type: string): readonly [string, string] {
  const gradients: Record<string, readonly [string, string]> = {
    bodybuilder: ["#DCFCE7", "#BBF7D0"],
    physique: ["#DBEAFE", "#BFDBFE"],
    powerlifter: ["#FEF3C7", "#FDE68A"],
  };
  return gradients[type.toLowerCase()] || gradients.bodybuilder;
}

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
  const { state: activityState } = useActivity();
  const { user } = useAuthContext();
  const myId = user?.id || 0;
  const [activeTab, setActiveTab] = useState<"match" | "requests" | "friends">("match");
  const [swipesLeft, setSwipesLeft] = useState(50);
  const [currentOpponent, setCurrentOpponent] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showBattle, setShowBattle] = useState(false);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [locationTooltip, setLocationTooltip] = useState<{ friendId: number; text: string } | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real backend queries
  const friendsQuery = trpc.friends.list.useQuery(undefined, { retry: 1 });
  const pendingQuery = trpc.friends.pendingRequests.useQuery(undefined, { retry: 1 });
  const sentQuery = trpc.friends.sentRequests.useQuery(undefined, { retry: 1 });
  const acceptMutation = trpc.friends.acceptRequest.useMutation();
  const rejectMutation = trpc.friends.rejectRequest.useMutation();
  const sendRequestMutation = trpc.friends.sendRequest.useMutation();
  const hideLocationMutation = trpc.friends.toggleHideLocation.useMutation();
  const conversationsQuery = trpc.chat.conversations.useQuery(undefined, { retry: 1, refetchInterval: 15000 });


  // Sync real friends data from backend
  useEffect(() => {
    if (friendsQuery.data && friendsQuery.data.length > 0) {
      const realFriends: Friend[] = friendsQuery.data.map((f: any) => {
        const mType = (f.activeMonster?.monsterType || f.monsterType || 'bodybuilder').toLowerCase();
        const mName = f.activeMonster?.name || f.monsterName || (mType.charAt(0).toUpperCase() + mType.slice(1));
        return {
        id: f.user?.id || f.friendId || f.id,
        name: mName,
        level: f.activeMonster?.level || f.monsterLevel || 1,
        monsterType: f.activeMonster?.monsterType || f.monsterType || 'bodybuilder',
        monsterImage: getMonsterImage(f.activeMonster?.monsterType || f.monsterType || 'bodybuilder', f.activeMonster?.evolutionStage || f.monsterStage || 1),
        online: f.isOnline || false,
        gradient: getGradientForType(f.activeMonster?.monsterType || f.monsterType || 'bodybuilder'),
        addedAt: new Date(f.createdAt || Date.now()),
        gender: f.profile?.gender || f.gender || undefined,
        hideLocation: f.hideLocation || false,
      };
      });
      setFriends(realFriends);
    }
  }, [friendsQuery.data]);

  // Sync sent requests from backend (persisted across app restarts)
  useEffect(() => {
    if (sentQuery.data) {
      const sentReqs: FriendRequest[] = sentQuery.data.map((r: any) => {
        const mType = (r.monsterType || 'bodybuilder').toLowerCase();
        const mName = r.monsterName || (mType.charAt(0).toUpperCase() + mType.slice(1));
        return {
          id: r.friendshipId,
          from: {
            id: r.userId,
            name: mName,
            distance: '?',
            online: true,
            level: r.monsterLevel || 1,
            monsterType: r.monsterType || 'Bodybuilder',
            monsterImage: getMonsterImage(r.monsterType || 'bodybuilder', 1),
            streakKey: 'streakBeastMode' as const,
            matchPercent: 75,
            todayExp: 0,
            strength: 20,
            defense: 15,
            agility: 15,
            hp: 200,
            gradient: getGradientForType(r.monsterType || 'bodybuilder'),
          },
          status: 'pending' as const,
          sentByMe: true,
          timestamp: new Date(r.createdAt || Date.now()),
        };
      });
      setFriendRequests(prev => {
        const incoming = prev.filter(p => !p.sentByMe);
        return [...incoming, ...sentReqs];
      });
    }
  }, [sentQuery.data]);

  // Sync real pending requests from backend
  useEffect(() => {
    if (pendingQuery.data && pendingQuery.data.length > 0) {
      const realRequests: FriendRequest[] = pendingQuery.data.map((r: any) => {
        const mType = (r.monsterType || 'bodybuilder').toLowerCase();
        const mName = r.monsterName || (mType.charAt(0).toUpperCase() + mType.slice(1));
        return {
        id: r.friendshipId,
        from: {
          id: r.userId,
          name: mName,
          distance: '?',
          online: true,
          level: r.monsterLevel || 1,
          monsterType: r.monsterType || 'Bodybuilder',
          monsterImage: getMonsterImage(r.monsterType || 'bodybuilder', 1),
          streakKey: 'streakBeastMode' as const,
          matchPercent: 75,
          todayExp: 0,
          strength: 20,
          defense: 15,
          agility: 15,
          hp: 200,
          gradient: getGradientForType(r.monsterType || 'bodybuilder'),
        },
        status: 'pending' as const,
        sentByMe: false,
        timestamp: new Date(r.createdAt || Date.now()),
      };
      });
      setFriendRequests(prev => {
        // Merge: keep sent requests, replace incoming with real ones
        const sentOnly = prev.filter(p => p.sentByMe);
        return [...realRequests, ...sentOnly];
      });
    }
  }, [pendingQuery.data]);

  // Animation refs for battle
  const playerShake = useRef(new RNAnimated.Value(0)).current;
  const enemyShake = useRef(new RNAnimated.Value(0)).current;
  const attackFlash = useRef(new RNAnimated.Value(0)).current;
  const defendFlash = useRef(new RNAnimated.Value(0)).current;
  const specialFlash = useRef(new RNAnimated.Value(0)).current;

  // Get user's real location for nearby query AND auto-share it
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const locationShareMutation = trpc.location.update.useMutation();
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLoc(coords);
          // Auto-share location so other users can find us
          try {
            await locationShareMutation.mutateAsync({
              latitude: coords.lat,
              longitude: coords.lng,
              isSharing: true,
            });
          } catch (err) {
            console.warn("Failed to share location from battle:", err);
          }
        }
      } catch {}
    })();
  }, []);

  // Fetch nearby users from backend for match cards
  const nearbyQuery = trpc.location.nearby.useQuery(
    { latitude: userLoc?.lat ?? 0, longitude: userLoc?.lng ?? 0 },
    { retry: 1, enabled: !!userLoc }
  );
  const nearbyOpponents: Opponent[] = useMemo(() => {
    if (nearbyQuery.data && nearbyQuery.data.length > 0) {
      return nearbyQuery.data.map(buildOpponentFromNearby);
    }
    return [];
  }, [nearbyQuery.data]);

  const opponent = nearbyOpponents.length > 0
    ? nearbyOpponents[currentOpponent % nearbyOpponents.length]
    : null;

  // Get player's active monster from activity context
  const activeIdx = activityState.activeMonsterIndex;
  const playerMonster = activityState.monsters.length > 0 ? (activityState.monsters[activeIdx] || activityState.monsters[0]) : null;
  const playerMaxHp = playerMonster ? 100 + (playerMonster.level * 10) : 150;

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
    if (nearbyOpponents.length === 0) return;
    const opp = nearbyOpponents[currentOpponent % nearbyOpponents.length];

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

    // Like = send friend request (needs acceptance)
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

    // Send real friend request to backend
    sendRequestMutation.mutate({ targetUserId: opp.id }, {
      onSuccess: () => {
        friendsQuery.refetch();
        pendingQuery.refetch();
        sentQuery.refetch();
      },
    });

    setCurrentOpponent((prev) => prev + 1);
  }, [currentOpponent, friendRequests, friends, nearbyOpponents]);

  // Accept incoming friend request
  const handleAcceptRequest = useCallback((request: FriendRequest) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Call backend API
    acceptMutation.mutate({ friendshipId: request.id }, {
      onSuccess: () => {
        friendsQuery.refetch();
        pendingQuery.refetch();
        sentQuery.refetch();
      },
    });

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
  }, [acceptMutation, friendsQuery, pendingQuery]);

  // Reject incoming friend request
  const handleRejectRequest = useCallback((request: FriendRequest) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Call backend API
    rejectMutation.mutate({ friendshipId: request.id }, {
      onSuccess: () => {
        pendingQuery.refetch();
        sentQuery.refetch();
      },
    });

    setFriendRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status: "rejected" as const } : r))
    );
  }, [rejectMutation, pendingQuery]);

  const startBattle = useCallback((opp: Opponent) => {
    const hp = playerMonster ? playerMonster.maxHp : 150;
    setBattle({
      phase: "intro", playerHp: hp, playerMaxHp: hp,
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
    if (nearbyOpponents.length > 0) {
      const randomOpp = nearbyOpponents[Math.floor(Math.random() * nearbyOpponents.length)];
      startBattle(randomOpp);
    } else {
      // Create a wild monster opponent — always works even without playerMonster
      const playerLevel = playerMonster?.level || 1;
      const typeIdx = Math.floor(Math.random() * 3);
      const types = ["bodybuilder", "physique", "powerlifter"];
      const typeNames = ["Bodybuilder", "Physique", "Powerlifter"];
      const chosenType = types[typeIdx];
      const stage = 1 + Math.floor(Math.random() * 3);
      const wildOpp: Opponent = {
        id: -1,
        name: t.wildMonster || "Wild Monster",
        distance: "?",
        online: true,
        level: Math.max(1, playerLevel - 2 + Math.floor(Math.random() * 5)),
        monsterType: typeNames[typeIdx],
        monsterImage: getMonsterImage(chosenType, stage),
        streakKey: "streakBeastMode",
        matchPercent: 50,
        todayExp: 0,
        strength: 10 + Math.floor(Math.random() * 20),
        defense: 10 + Math.floor(Math.random() * 15),
        agility: 10 + Math.floor(Math.random() * 15),
        hp: 100 + Math.floor(Math.random() * 200),
        gradient: getGradientForType(chosenType),
      };
      startBattle(wildOpp);
    }
  }, [startBattle, nearbyOpponents, playerMonster]);

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
      const friendOpp: Opponent = {
        id: friend.id,
        name: friend.name,
        distance: "?",
        online: friend.online,
        level: friend.level,
        monsterType: friend.monsterType,
        monsterImage: friend.monsterImage,
        streakKey: "streakBeastMode",
        matchPercent: 75,
        todayExp: 0,
        strength: 10 + friend.level * 2,
        defense: 8 + friend.level * 2,
        agility: 8 + friend.level * 2,
        hp: 100 + friend.level * 10,
        gradient: friend.gradient,
      };
      startBattle(friendOpp);
    } else {
      router.push({ pathname: "/chat" as any, params: { friendId: String(friend.id), friendName: friend.name } });
    }
  }, [startBattle, router]);

  const handleToggleHideLocation = useCallback(async (friend: Friend) => {
    const newValue = !friend.hideLocation;
    // Optimistic update
    setFriends((prev) => prev.map((f) => f.id === friend.id ? { ...f, hideLocation: newValue } : f));
    // Show tooltip feedback
    const toastText = newValue
      ? tr(t.locationHiddenToast, { name: friend.name })
      : tr(t.locationVisibleToast, { name: friend.name });
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setLocationTooltip({ friendId: friend.id, text: toastText });
    tooltipTimerRef.current = setTimeout(() => setLocationTooltip(null), 2500);
    try {
      await hideLocationMutation.mutateAsync({ friendId: friend.id, hide: newValue });
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Revert on error
      setFriends((prev) => prev.map((f) => f.id === friend.id ? { ...f, hideLocation: !newValue } : f));
      setLocationTooltip(null);
    }
  }, [hideLocationMutation, t, tr]);

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
                  <Text style={styles.nearbyText}>{nearbyOpponents.length} {t.nearby}</Text>
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
                    {t.matchInfoSkip}
                  </Text>
                </View>
              </View>

              {/* Opponent Card */}
              {opponent ? (
                <>
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
                        {opponent.gender && <Text style={styles.genderIcon}>{opponent.gender === "male" ? "♂" : "♀"}</Text>}
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
                    <TouchableOpacity style={[styles.swipeBtn, styles.likeBtn, { borderColor: "#22C55E" }]} onPress={() => handleSwipe("right")}>
                      <Text style={styles.heartEmoji}>❤️</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 40 }}>🔍</Text>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    {t.noNearbyTrainers || "No trainers nearby yet"}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                    {t.noNearbyTrainersMatchDesc || "Enable location sharing on the Map to find nearby trainers to battle!"}
                  </Text>
                  <TouchableOpacity
                    style={[styles.mapLinkBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push("/nearby-map" as any)}
                  >
                    <IconSymbol name="map.fill" size={16} color="#fff" />
                    <Text style={styles.mapLinkText}>{t.openMap || "Open Map"}</Text>
                  </TouchableOpacity>
                </View>
              )}

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
                          {friend.gender && <Text style={styles.genderIcon}>{friend.gender === "male" ? "♂" : "♀"}</Text>}
                          {friend.online && <View style={styles.onlineDot} />}
                        </View>
                        <Text style={[styles.friendLevel, { color: colors.muted }]}>{(t as any)[friend.monsterType.toLowerCase()] || friend.monsterType} Lv.{friend.level}</Text>
                        {(() => {
                          const conv = conversationsQuery.data?.find((c: any) => c.partnerId === friend.id);
                          if (conv?.lastMessage) {
                            const msg = conv.lastMessage;
                            const preview = msg.messageType === 'image' ? '📷 Photo'
                              : msg.messageType === 'audio' ? '🎤 Voice'
                              : (msg.message || '').substring(0, 30) + ((msg.message || '').length > 30 ? '...' : '');
                            return (
                              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                                {msg.senderId === myId ? `You: ${preview}` : preview}
                              </Text>
                            );
                          }
                          return null;
                        })()}
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
                          {(() => {
                            const conv = conversationsQuery.data?.find((c: any) => c.partnerId === friend.id);
                            const unread = conv?.unreadCount || 0;
                            if (unread > 0) return (
                              <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                              </View>
                            );
                            return null;
                          })()}
                        </TouchableOpacity>
                        <View>
                          <TouchableOpacity
                            style={[styles.hideLocBtn, { backgroundColor: friend.hideLocation ? colors.error : colors.border }]}
                            onPress={() => handleToggleHideLocation(friend)}
                          >
                            <Text style={{ fontSize: 12, color: friend.hideLocation ? "#fff" : colors.muted }}>
                              {friend.hideLocation ? "📍" : "👁"}
                            </Text>
                          </TouchableOpacity>
                          <Text style={[styles.hideLocLabel, { color: colors.muted }]}>
                            {friend.hideLocation ? t.hideFriendLocation : t.showFriendLocation}
                          </Text>
                        </View>
                      </View>
                      {locationTooltip?.friendId === friend.id && (
                        <View style={[styles.tooltipBubble, { backgroundColor: colors.foreground }]}>
                          <Text style={[styles.tooltipText, { color: colors.background }]}>
                            {locationTooltip.text}
                          </Text>
                        </View>
                      )}
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
                    <LinearGradient colors={playerMonster ? getGradientForType(playerMonster.type) : ["#DCFCE7", "#BBF7D0"]} style={styles.battleGradient}>
                      <Image source={playerMonster ? getMonsterImage(playerMonster.type, playerMonster.stage) : require("@/assets/monsters/bodybuilder-stage1.png")} style={styles.battleMonster} contentFit="contain" />
                    </LinearGradient>
                    <View style={styles.battleInfo}>
                      <Text style={[styles.battleName, { color: colors.foreground }]}>{playerMonster?.name || 'Flexo'}</Text>
                      <Text style={[styles.battleType, { color: colors.muted }]}>{(t as any)[(playerMonster?.type || 'bodybuilder').toLowerCase()] || playerMonster?.type || t.bodybuilder} Lv.{playerMonster?.level || 1}</Text>
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
                    ? `${t.victoryMessage}\n+50 EXP`
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
  hideLocBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 4 },

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
  mapLinkBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  mapLinkText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  genderIcon: { fontSize: 16, marginLeft: 4 },
  unreadBadge: {
    position: "absolute" as const,
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  hideLocLabel: {
    fontSize: 9,
    textAlign: "center" as const,
    marginTop: 2,
    maxWidth: 40,
  },
  tooltipBubble: {
    alignSelf: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
});
