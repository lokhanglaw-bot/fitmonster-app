import { useState, useEffect, useCallback, useRef } from "react";
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
  AppState,
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

const REFRESH_INTERVAL_MS = 15_000; // Refresh nearby list every 15 seconds
const LOCATION_UPDATE_INTERVAL_MS = 30_000; // Update own location every 30 seconds

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
  const [refreshing, setRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const sharingRef = useRef(false);

  // tRPC mutations & queries
  const locationUpdateMutation = trpc.location.update.useMutation();
  const sendFriendRequestMutation = trpc.friends.sendRequest.useMutation();
  const nearbyQuery = trpc.location.nearby.useQuery(
    { latitude: userLocation?.lat ?? 0, longitude: userLocation?.lng ?? 0, radiusKm: 10 },
    { enabled: !!userLocation && sharingLocation, refetchInterval: REFRESH_INTERVAL_MS }
  );

  // Keep refs in sync
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { sharingRef.current = sharingLocation; }, [sharingLocation]);

  // Update nearby users when query data changes
  useEffect(() => {
    if (nearbyQuery.data) {
      setNearbyUsers(nearbyQuery.data as NearbyUser[]);
      setLastError(null);
    }
    if (nearbyQuery.isError) {
      setLastError("Failed to fetch nearby trainers");
    }
  }, [nearbyQuery.data, nearbyQuery.isError]);

  // On mount: request location, auto-share, and start periodic updates
  useEffect(() => {
    initLocationAndShare();
    return () => {
      // Cleanup timers on unmount
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (locationTimerRef.current) clearInterval(locationTimerRef.current);
    };
  }, []);

  // Periodically update own location to server while sharing
  useEffect(() => {
    if (sharingLocation && userLocation) {
      // Start periodic location update
      locationTimerRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const newLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLocation(newLoc);
          await locationUpdateMutation.mutateAsync({
            latitude: newLoc.lat,
            longitude: newLoc.lng,
            isSharing: true,
          });
        } catch {
          // Silently continue
        }
      }, LOCATION_UPDATE_INTERVAL_MS);

      return () => {
        if (locationTimerRef.current) clearInterval(locationTimerRef.current);
      };
    }
  }, [sharingLocation, !!userLocation]);

  // When app comes to foreground, refresh
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && sharingRef.current && userLocationRef.current) {
        nearbyQuery.refetch();
      }
    });
    return () => sub.remove();
  }, []);

  const initLocationAndShare = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(coords);

        // Auto-share location on open
        setSharingLocation(true);
        try {
          await locationUpdateMutation.mutateAsync({
            latitude: coords.lat,
            longitude: coords.lng,
            isSharing: true,
          });
          setLastError(null);
        } catch (err: any) {
          console.warn("Failed to share location:", err);
          setLastError("Failed to share location to server");
        }
      } else {
        // No permission — use default but don't auto-share
        setUserLocation({ lat: 22.3193, lng: 114.1694 });
        Alert.alert(
          t.locationPermissionRequired || "Location Permission Required",
          t.locationPermissionMessage || "Please enable location access in your device settings to share your location with nearby trainers.",
          [{ text: t.ok }]
        );
      }
    } catch (err) {
      setUserLocation({ lat: 22.3193, lng: 114.1694 });
      console.warn("Location error:", err);
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

    if (userLocation) {
      try {
        await locationUpdateMutation.mutateAsync({
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          isSharing: value,
        });
        setLastError(null);
      } catch (err: any) {
        console.warn("Failed to update sharing:", err);
        setLastError("Failed to update sharing status");
        // Revert toggle on failure
        setSharingLocation(!value);
        Alert.alert(
          "Error",
          "Failed to update location sharing. Please try again.",
          [{ text: t.ok }]
        );
        return;
      }
    }

    if (value) {
      // Immediately refresh nearby list
      nearbyQuery.refetch();
    }
  }, [locationGranted, userLocation]);

  const handleManualRefresh = useCallback(async () => {
    if (!userLocation) return;
    setRefreshing(true);

    // Re-fetch current location
    try {
      if (locationGranted) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const newLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(newLoc);

        if (sharingLocation) {
          await locationUpdateMutation.mutateAsync({
            latitude: newLoc.lat,
            longitude: newLoc.lng,
            isSharing: true,
          });
        }
      }
    } catch {
      // Continue with existing location
    }

    await nearbyQuery.refetch();
    setRefreshing(false);
  }, [userLocation, locationGranted, sharingLocation]);

  const handleSendRequest = useCallback(async (user: NearbyUser) => {
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
        "Error",
        "Failed to send friend request. Please try again.",
        [{ text: t.ok }]
      );
    }
  }, []);

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
              // Keep sharing active when leaving - so friends can still find us
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
          {/* Refresh button */}
          <TouchableOpacity
            onPress={handleManualRefresh}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[{ color: colors.muted, marginTop: 12, fontSize: 14 }]}>
              {t.gettingLocation || "Getting your location..."}
            </Text>
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

            {/* Error banner */}
            {lastError && (
              <View style={[styles.errorBanner, { backgroundColor: "#FEE2E2" }]}>
                <Text style={{ color: "#DC2626", fontSize: 13 }}>⚠️ {lastError}</Text>
                <TouchableOpacity onPress={handleManualRefresh}>
                  <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 13 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Auto-refresh indicator */}
            {sharingLocation && nearbyQuery.isFetching && !refreshing && (
              <View style={styles.autoRefreshBar}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[{ color: colors.muted, fontSize: 12, marginLeft: 8 }]}>
                  {t.refreshingNearby || "Refreshing nearby trainers..."}
                </Text>
              </View>
            )}

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
                  {sharingLocation
                    ? (t.nearbyHint || "Make sure your friends also have the app open with location sharing enabled!")
                    : (t.enableSharingHint || "Enable location sharing and invite friends to see them here!")}
                </Text>
                {sharingLocation && (
                  <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleManualRefresh}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      {refreshing ? "Refreshing..." : (t.refreshNow || "Refresh Now")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={nearbyUsers}
                keyExtractor={(item) => item.userId.toString()}
                renderItem={renderNearbyUser}
                contentContainerStyle={styles.listContent}
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
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapContainer: {
    marginHorizontal: 16,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  mapGradient: { flex: 1, position: "relative" },
  gridLineH: { position: "absolute", left: 0, right: 0, height: 1 },
  gridLineV: { position: "absolute", top: 0, bottom: 0, width: 1 },
  mapPin: { position: "absolute", alignItems: "center" },
  myPin: { zIndex: 10 },
  myPinInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinLabel: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  pulseRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(34,197,94,0.3)",
    top: -12,
    left: -12,
  },
  mapUserPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  mapPinName: { fontSize: 9, fontWeight: "600", marginTop: 1 },
  sharingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sharingInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  sharingTitle: { fontSize: 15, fontWeight: "600" },
  sharingDesc: { fontSize: 12, marginTop: 2 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  autoRefreshBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  selectedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedMonster: { width: 32, height: 32 },
  selectedInfo: { flex: 1, marginLeft: 12 },
  selectedName: { fontSize: 16, fontWeight: "700" },
  selectedLevel: { fontSize: 13, marginTop: 2 },
  challengeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  challengeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  listTitle: { fontSize: 15, fontWeight: "600", marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  userMonster: { width: 32, height: 32 },
  userInfo: { flex: 1, marginLeft: 12 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 15, fontWeight: "600" },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  userLevel: { fontSize: 13, marginTop: 2 },
  userDistance: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNearby: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32 },
  emptyNearbyTitle: { fontSize: 17, fontWeight: "700", marginTop: 12 },
  emptyNearbyDesc: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
