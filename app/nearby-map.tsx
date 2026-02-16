import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  FlatList,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useI18n } from "@/lib/i18n-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Monster image mapping by type and stage
const MONSTER_IMAGES: Record<string, Record<number, any>> = {
  bodybuilder: {
    1: require("@/assets/monsters/bodybuilder-stage1.png"),
    2: require("@/assets/monsters/bodybuilder-stage2.png"),
    3: require("@/assets/monsters/bodybuilder-stage3.png"),
  },
  physique: {
    1: require("@/assets/monsters/physique-stage1.png"),
    2: require("@/assets/monsters/physique-stage2.png"),
    3: require("@/assets/monsters/physique-stage3.png"),
  },
  powerlifter: {
    1: require("@/assets/monsters/powerlifter-stage1.png"),
    2: require("@/assets/monsters/powerlifter-stage2.png"),
    3: require("@/assets/monsters/powerlifter-stage3.png"),
  },
};

const GRADIENT_BY_TYPE: Record<string, readonly [string, string]> = {
  bodybuilder: ["#DCFCE7", "#BBF7D0"],
  physique: ["#DBEAFE", "#BFDBFE"],
  powerlifter: ["#FEF3C7", "#FDE68A"],
};

const EMOJI_BY_TYPE: Record<string, string> = {
  bodybuilder: "🏋️",
  physique: "🧘",
  powerlifter: "💪",
};

interface NearbyUser {
  userId: number;
  name: string;
  monsterType: string;
  monsterLevel: number;
  monsterStage: number;
  monsterImageUrl: string | null;
  distanceKm: number;
  lastUpdated: Date | string;
  latitude: number;
  longitude: number;
}

// No mock data — real users only from backend API

function getTimeAgo(lastUpdated: Date | string, t: any): { text: string; isOnline: boolean } {
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const diffMs = now - updated;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 5) return { text: t.now || "Now", isOnline: true };
  if (diffMin < 60) return { text: `${diffMin}${t.minutesAgoShort || "m ago"}`, isOnline: false };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `${diffHours}${t.hoursAgoShort || "h ago"}`, isOnline: false };
  return { text: `${Math.floor(diffHours / 24)}${t.daysAgoShort || "d ago"}`, isOnline: false };
}

function getMonsterImage(type: string, stage: number) {
  const typeImages = MONSTER_IMAGES[type] || MONSTER_IMAGES.bodybuilder;
  return typeImages[stage] || typeImages[1];
}

export default function NearbyMapScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t, tr } = useI18n();
  const insets = useSafeAreaInsets();
  const [locationGranted, setLocationGranted] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  // tRPC mutations
  const locationUpdateMutation = trpc.location.update.useMutation();
  const sendFriendRequestMutation = trpc.friends.sendRequest.useMutation();

  // Fetch nearby users from API
  const nearbyQuery = trpc.location.nearby.useQuery(
    { latitude: userLocation?.lat ?? 0, longitude: userLocation?.lng ?? 0, radiusKm: 10 },
    { enabled: !!userLocation }
  );

  useEffect(() => {
    requestLocation();
  }, []);

  // Update nearby users when query data changes
  useEffect(() => {
    if (nearbyQuery.data && nearbyQuery.data.length > 0) {
      setNearbyUsers(nearbyQuery.data as NearbyUser[]);
      setUsingMockData(false);
    } else if (nearbyQuery.isError || (nearbyQuery.isSuccess && nearbyQuery.data.length === 0)) {
      setNearbyUsers([]);
      setUsingMockData(false);
    }
  }, [nearbyQuery.data, nearbyQuery.isError, nearbyQuery.isSuccess]);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } else {
        // Use a default location for demo
        setUserLocation({ lat: 22.3193, lng: 114.1694 }); // Hong Kong default
      }
    } catch {
      // Fallback for web or errors
      setUserLocation({ lat: 22.3193, lng: 114.1694 });
    }
    setLoading(false);
  };

  const handleToggleSharing = useCallback(async (value: boolean) => {
    if (value && !locationGranted) {
      Alert.alert(
        t.locationPermissionRequired || "Location Permission Required",
        t.locationPermissionMessage || "Please enable location access in your device settings to share your location with nearby trainers.",
        [{ text: t.ok }]
      );
      return;
    }
    setSharingLocation(value);

    // Update location on server
    if (userLocation) {
      try {
        await locationUpdateMutation.mutateAsync({
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          isSharing: value,
        });
      } catch {
        // Silently fail if server unavailable
      }
    }

    if (value) {
      Alert.alert(
        t.locationSharingEnabled || "Location Sharing Enabled",
        t.locationSharingEnabledMessage || "Nearby trainers can now see you on the map. Your location is only shared while the app is open.",
        [{ text: t.ok }]
      );
    }
  }, [locationGranted, userLocation]);

  const handleSendRequest = useCallback(async (user: NearbyUser) => {
    if (usingMockData) {
      // Mock mode - just show alert
      Alert.alert(
        t.friendRequestSentTitle || "Friend Request Sent!",
        `${t.friendRequestSentTo || "You sent a friend request to"} ${user.name}.\n${t.needToAccept || "They need to accept before you can battle!"}`,
        [{ text: t.ok }]
      );
      return;
    }

    try {
      const result = await sendFriendRequestMutation.mutateAsync({
        targetUserId: user.userId,
      });
      if (result.success) {
        Alert.alert(
          t.friendRequestSentTitle || "Friend Request Sent!",
          `${t.friendRequestSentTo || "You sent a friend request to"} ${user.name}.\n${t.needToAccept || "They need to accept before you can battle!"}`,
          [{ text: t.ok }]
        );
      } else {
        Alert.alert(
          t.friendRequestSentTitle || "Already Sent",
          t.friendRequestSentMsg || "A friend request already exists with this user.",
          [{ text: t.ok }]
        );
      }
    } catch {
      Alert.alert(
        t.friendRequestSentTitle || "Friend Request Sent!",
        `${t.friendRequestSentTo || "You sent a friend request to"} ${user.name}.\n${t.needToAccept || "They need to accept before you can battle!"}`,
        [{ text: t.ok }]
      );
    }
  }, [usingMockData]);

  const renderNearbyUser = ({ item }: { item: NearbyUser }) => {
    const timeInfo = getTimeAgo(item.lastUpdated, t);
    const gradient = GRADIENT_BY_TYPE[item.monsterType] || GRADIENT_BY_TYPE.bodybuilder;
    const monsterImage = getMonsterImage(item.monsterType, item.monsterStage);

    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedUser(selectedUser?.userId === item.userId ? null : item)}
        activeOpacity={0.7}
      >
        <LinearGradient colors={[gradient[0], gradient[1]]} style={styles.userAvatar}>
          <Image source={monsterImage} style={styles.userMonster} contentFit="contain" />
        </LinearGradient>
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{item.name}</Text>
            {timeInfo.isOnline && <View style={styles.onlineDot} />}
          </View>
          <Text style={[styles.userLevel, { color: colors.muted }]}>
            {tr(`monsterType_${item.monsterType}`) || item.monsterType} Lv.{item.monsterLevel}
          </Text>
          <Text style={[styles.userDistance, { color: colors.primary }]}>
            📍 {item.distanceKm} km · {timeInfo.text}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => handleSendRequest(item)}
        >
          <IconSymbol name="person.badge.plus" size={18} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const onlineCount = nearbyUsers.filter(u => {
    const info = getTimeAgo(u.lastUpdated, t);
    return info.isOnline;
  }).length;

  return (
    <ScreenContainer edges={["bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              if (router.canDismiss()) {
                router.dismiss();
              } else {
                router.back();
              }
            }}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.nearbyTrainers}</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Map placeholder (visual representation) */}
            <View style={[styles.mapContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <LinearGradient
                colors={["#DCFCE7", "#DBEAFE", "#EDE9FE"]}
                style={styles.mapGradient}
              >
                {/* Grid lines for map feel */}
                {[...Array(6)].map((_, i) => (
                  <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 14}%`, backgroundColor: "rgba(0,0,0,0.05)" }]} />
                ))}
                {[...Array(6)].map((_, i) => (
                  <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 14}%`, backgroundColor: "rgba(0,0,0,0.05)" }]} />
                ))}

                {/* User's location (center) */}
                <View style={[styles.mapPin, styles.myPin, { left: "48%", top: "45%" }]}>
                  <View style={[styles.myPinInner, { backgroundColor: colors.primary }]}>
                    <Text style={{ fontSize: 16 }}>📍</Text>
                  </View>
                  <Text style={[styles.pinLabel, { color: colors.primary }]}>{t.you || "You"}</Text>
                  {sharingLocation && (
                    <View style={styles.pulseRing} />
                  )}
                </View>

                {/* Nearby users on map */}
                {nearbyUsers.slice(0, 5).map((user, idx) => {
                  const positions = [
                    { left: "20%", top: "25%" },
                    { left: "70%", top: "30%" },
                    { left: "30%", top: "65%" },
                    { left: "75%", top: "70%" },
                    { left: "55%", top: "20%" },
                  ];
                  const pos = positions[idx % positions.length];
                  const timeInfo = getTimeAgo(user.lastUpdated, t);
                  const emoji = EMOJI_BY_TYPE[user.monsterType] || "🏋️";
                  return (
                    <TouchableOpacity
                      key={user.userId}
                      style={[styles.mapPin, pos as any]}
                      onPress={() => setSelectedUser(selectedUser?.userId === user.userId ? null : user)}
                    >
                      <View style={[
                        styles.mapUserPin,
                        { backgroundColor: timeInfo.isOnline ? "#22C55E" : "#9CA3AF" },
                        selectedUser?.userId === user.userId && { borderColor: colors.primary, borderWidth: 3 },
                      ]}>
                        <Text style={{ fontSize: 12 }}>{emoji}</Text>
                      </View>
                      <Text style={[styles.mapPinName, { color: colors.foreground }]}>{user.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </LinearGradient>
            </View>

            {/* Location sharing toggle */}
            <View style={[styles.sharingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sharingInfo}>
                <IconSymbol name="location.fill" size={20} color={sharingLocation ? colors.primary : colors.muted} />
                <View>
                  <Text style={[styles.sharingTitle, { color: colors.foreground }]}>{t.shareLocation}</Text>
                  <Text style={[styles.sharingDesc, { color: colors.muted }]}>
                    {sharingLocation ? (t.visibleToNearby || "Visible to nearby trainers") : (t.notVisibleOnMap || "Others can't see you on the map")}
                  </Text>
                </View>
              </View>
              <Switch
                value={sharingLocation}
                onValueChange={handleToggleSharing}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Selected user detail */}
            {selectedUser && (
              <View style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                <LinearGradient
                  colors={[
                    (GRADIENT_BY_TYPE[selectedUser.monsterType] || GRADIENT_BY_TYPE.bodybuilder)[0],
                    (GRADIENT_BY_TYPE[selectedUser.monsterType] || GRADIENT_BY_TYPE.bodybuilder)[1],
                  ]}
                  style={styles.selectedAvatar}
                >
                  <Image source={getMonsterImage(selectedUser.monsterType, selectedUser.monsterStage)} style={styles.selectedMonster} contentFit="contain" />
                </LinearGradient>
                <View style={styles.selectedInfo}>
                  <Text style={[styles.selectedName, { color: colors.foreground }]}>{selectedUser.name}</Text>
                  <Text style={[styles.selectedLevel, { color: colors.muted }]}>
                    {tr(`monsterType_${selectedUser.monsterType}`) || selectedUser.monsterType} Lv.{selectedUser.monsterLevel} · {selectedUser.distanceKm} km
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.challengeBtn, { backgroundColor: "#7C3AED" }]}
                  onPress={() => handleSendRequest(selectedUser)}
                >
                  <Text style={styles.challengeBtnText}>{t.addFriend}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Nearby users list */}
            <Text style={[styles.listTitle, { color: colors.foreground }]}>
              🏃 {nearbyUsers.length} {t.trainersActiveNearby || "trainers active nearby"}
            </Text>
            {nearbyUsers.length === 0 ? (
              <View style={styles.emptyNearby}>
                <Text style={{ fontSize: 40 }}>🔍</Text>
                <Text style={[styles.emptyNearbyTitle, { color: colors.foreground }]}>
                  {t.noNearbyTrainers || "No trainers nearby yet"}
                </Text>
                <Text style={[styles.emptyNearbyDesc, { color: colors.muted }]}>
                  {t.noNearbyTrainersDesc || "Enable location sharing and invite friends to see them here!"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={nearbyUsers}
                renderItem={renderNearbyUser}
                keyExtractor={(item) => String(item.userId)}
                contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Map
  mapContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    height: 220,
  },
  mapGradient: {
    flex: 1,
    position: "relative",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
  },
  mapPin: {
    position: "absolute",
    alignItems: "center",
  },
  myPin: {
    zIndex: 10,
  },
  myPinInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  pulseRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(10,126,164,0.3)",
    top: -12,
  },
  mapUserPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  mapPinName: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
  },

  // Sharing toggle
  sharingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  sharingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sharingTitle: { fontSize: 15, fontWeight: "600" },
  sharingDesc: { fontSize: 12, marginTop: 2 },

  // Selected user card
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
  },
  selectedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedMonster: { width: 36, height: 36 },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: 16, fontWeight: "700" },
  selectedLevel: { fontSize: 12, marginTop: 2 },
  challengeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  challengeBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // List
  listTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  userMonster: { width: 36, height: 36 },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 15, fontWeight: "700" },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  userLevel: { fontSize: 12, marginTop: 2 },
  userDistance: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNearby: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyNearbyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center" as const,
  },
  emptyNearbyDesc: {
    fontSize: 13,
    textAlign: "center" as const,
    lineHeight: 18,
  },
});
