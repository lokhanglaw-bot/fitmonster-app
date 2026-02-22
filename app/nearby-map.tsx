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
import MapView, { Marker, Region } from "react-native-maps";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

interface FriendLocation {
  userId: number;
  name: string;
  monsterType: string;
  monsterLevel: number;
  monsterStage: number;
  monsterImageUrl: string | null;
  latitude: number;
  longitude: number;
  lastUpdated: Date | string;
  monsterName: string | null;
}

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

const REFRESH_INTERVAL_MS = 15_000;
const LOCATION_UPDATE_INTERVAL_MS = 30_000;

export default function NearbyMapScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t, tr } = useI18n();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [selectedUser, setSelectedUser] = useState<FriendLocation | NearbyUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const sharingRef = useRef(false);

  // tRPC mutations & queries
  const locationUpdateMutation = trpc.location.update.useMutation();
  const sendFriendRequestMutation = trpc.friends.sendRequest.useMutation();

  // Query nearby users (non-friends)
  const nearbyQuery = trpc.location.nearby.useQuery(
    { latitude: userLocation?.lat ?? 0, longitude: userLocation?.lng ?? 0, radiusKm: 50 },
    { enabled: !!userLocation && sharingLocation, refetchInterval: REFRESH_INTERVAL_MS }
  );

  // Query friends' locations
  const friendsLocQuery = trpc.friends.locations.useQuery(undefined, {
    enabled: sharingLocation,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  // Keep refs in sync
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { sharingRef.current = sharingLocation; }, [sharingLocation]);

  // Update nearby users when query data changes
  useEffect(() => {
    if (nearbyQuery.data) {
      setNearbyUsers(nearbyQuery.data as NearbyUser[]);
    }
  }, [nearbyQuery.data]);

  // Update friend locations when query data changes
  useEffect(() => {
    if (friendsLocQuery.data) {
      setFriendLocations(friendsLocQuery.data as FriendLocation[]);
      setLastError(null);
    }
  }, [friendsLocQuery.data]);

  // On mount: request location
  useEffect(() => {
    initLocation();
    return () => {
      if (locationTimerRef.current) clearInterval(locationTimerRef.current);
    };
  }, []);

  // Periodically update own location to server while sharing
  useEffect(() => {
    if (sharingLocation && userLocation) {
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
          // Silently continue - don't block the user
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
      if (state === "active" && sharingRef.current) {
        friendsLocQuery.refetch();
        if (userLocationRef.current) nearbyQuery.refetch();
      }
    });
    return () => sub.remove();
  }, []);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(coords);
      } else {
        // Default to Hong Kong area
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

  const shareLocationToServer = async (lat: number, lng: number, sharing: boolean): Promise<boolean> => {
    try {
      await locationUpdateMutation.mutateAsync({
        latitude: lat,
        longitude: lng,
        isSharing: sharing,
      });
      setLastError(null);
      setRetryCount(0);
      return true;
    } catch (err: any) {
      console.warn("Failed to update location sharing:", err?.message || err);
      return false;
    }
  };

  const handleToggleSharing = useCallback(async (value: boolean) => {
    if (value && !locationGranted) {
      Alert.alert(
        t.locationPermissionRequired || "Location Permission Required",
        t.locationPermissionMessage || "Please enable location access in your device settings.",
        [{ text: t.ok }]
      );
      return;
    }

    // Optimistically set the toggle
    setSharingLocation(value);

    if (userLocation) {
      const success = await shareLocationToServer(userLocation.lat, userLocation.lng, value);
      if (!success) {
        // Retry once
        const retrySuccess = await shareLocationToServer(userLocation.lat, userLocation.lng, value);
        if (!retrySuccess) {
          // Still keep sharing on locally - don't revert the toggle
          // The periodic update will retry later
          setLastError(t.locationShareRetry || "Location sharing may be delayed. Will retry automatically.");
          setRetryCount(prev => prev + 1);
        }
      }
    }

    if (value) {
      friendsLocQuery.refetch();
      nearbyQuery.refetch();
    }
  }, [locationGranted, userLocation]);

  const handleManualRefresh = useCallback(async () => {
    if (!userLocation) return;
    setRefreshing(true);

    try {
      if (locationGranted) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const newLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(newLoc);

        if (sharingLocation) {
          await shareLocationToServer(newLoc.lat, newLoc.lng, true);
        }
      }
    } catch {
      // Continue with existing location
    }

    await Promise.all([
      friendsLocQuery.refetch(),
      nearbyQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [userLocation, locationGranted, sharingLocation]);

  const handleSendRequest = useCallback(async (user: NearbyUser | FriendLocation) => {
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

  const centerOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  }, [userLocation]);

  const initialRegion: Region | undefined = userLocation ? {
    latitude: userLocation.lat,
    longitude: userLocation.lng,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  } : undefined;

  // Combine friends and nearby for the list
  const allPeople = [
    ...friendLocations.map(f => ({ ...f, isFriend: true, distanceKm: 0 })),
    ...nearbyUsers.filter(n => !friendLocations.some(f => f.userId === n.userId)).map(n => ({ ...n, isFriend: false })),
  ];

  return (
    <ScreenContainer edges={["bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              if (router.canDismiss()) router.dismiss();
              else router.back();
            }}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.nearbyTrainers}</Text>
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
            {/* Real Map */}
            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              {initialRegion ? (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={initialRegion}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  showsCompass={false}
                >
                  {/* Friend markers */}
                  {friendLocations.map((friend) => {
                    const emoji = EMOJI_BY_TYPE[friend.monsterType] || "🏋️";
                    const timeInfo = getTimeAgo(friend.lastUpdated, t);
                    return (
                      <Marker
                        key={`friend-${friend.userId}`}
                        coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
                        title={`${friend.name} (${t.friend || "Friend"})`}
                        description={`${tr(`monsterType_${friend.monsterType}`) || friend.monsterType} Lv.${friend.monsterLevel} · ${timeInfo.text}`}
                        pinColor="#22C55E"
                      />
                    );
                  })}

                  {/* Nearby non-friend markers */}
                  {nearbyUsers
                    .filter(n => !friendLocations.some(f => f.userId === n.userId))
                    .map((user) => {
                      const timeInfo = getTimeAgo(user.lastUpdated, t);
                      return (
                        <Marker
                          key={`nearby-${user.userId}`}
                          coordinate={{ latitude: user.latitude, longitude: user.longitude }}
                          title={user.name}
                          description={`${tr(`monsterType_${user.monsterType}`) || user.monsterType} Lv.${user.monsterLevel} · ${user.distanceKm}km · ${timeInfo.text}`}
                          pinColor="#3B82F6"
                        />
                      );
                    })}
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Text style={{ color: colors.muted }}>Loading map...</Text>
                </View>
              )}

              {/* Center on me button */}
              <TouchableOpacity
                style={[styles.centerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={centerOnUser}
                activeOpacity={0.7}
              >
                <IconSymbol name="location.fill" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Location sharing toggle */}
            <View style={[styles.sharingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sharingInfo}>
                <IconSymbol name="location.fill" size={20} color={sharingLocation ? colors.primary : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sharingTitle, { color: colors.foreground }]}>{t.shareLocation}</Text>
                  <Text style={[styles.sharingDesc, { color: colors.muted }]}>
                    {sharingLocation
                      ? (t.visibleToNearby || "Visible to nearby trainers & friends")
                      : (t.notVisibleOnMap || "Others can't see you on the map")}
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

            {/* Status banner */}
            {lastError && (
              <View style={[styles.errorBanner, { backgroundColor: "#FEF3C7" }]}>
                <Text style={{ color: "#92400E", fontSize: 13, flex: 1 }}>⚠️ {lastError}</Text>
                <TouchableOpacity onPress={handleManualRefresh}>
                  <Text style={{ color: "#92400E", fontWeight: "700", fontSize: 13 }}>{t.refreshNow || "Retry"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Auto-refresh indicator */}
            {sharingLocation && (friendsLocQuery.isFetching || nearbyQuery.isFetching) && !refreshing && (
              <View style={styles.autoRefreshBar}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[{ color: colors.muted, fontSize: 12, marginLeft: 8 }]}>
                  {t.refreshingNearby || "Refreshing..."}
                </Text>
              </View>
            )}

            {/* People list */}
            <View style={styles.listHeader}>
              {friendLocations.length > 0 && (
                <Text style={[styles.listTitle, { color: colors.primary }]}>
                  👥 {friendLocations.length} {t.friendsOnMap || "friends on map"}
                </Text>
              )}
              {nearbyUsers.filter(n => !friendLocations.some(f => f.userId === n.userId)).length > 0 && (
                <Text style={[styles.listTitle, { color: colors.foreground }]}>
                  🏃 {nearbyUsers.filter(n => !friendLocations.some(f => f.userId === n.userId)).length} {t.trainersActiveNearby || "trainers nearby"}
                </Text>
              )}
            </View>

            {!sharingLocation ? (
              <View style={styles.emptyNearby}>
                <Text style={{ fontSize: 40 }}>📍</Text>
                <Text style={[styles.emptyNearbyTitle, { color: colors.foreground }]}>
                  {t.enableSharingTitle || "Enable Location Sharing"}
                </Text>
                <Text style={[styles.emptyNearbyDesc, { color: colors.muted }]}>
                  {t.enableSharingHint || "Turn on location sharing to see friends on the map and discover nearby trainers!"}
                </Text>
              </View>
            ) : allPeople.length === 0 ? (
              <View style={styles.emptyNearby}>
                <Text style={{ fontSize: 40 }}>🔍</Text>
                <Text style={[styles.emptyNearbyTitle, { color: colors.foreground }]}>
                  {t.noNearbyTrainers || "No trainers nearby yet"}
                </Text>
                <Text style={[styles.emptyNearbyDesc, { color: colors.muted }]}>
                  {t.nearbyHint || "Make sure your friends also have the app open with location sharing enabled!"}
                </Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                  onPress={handleManualRefresh}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    {refreshing ? "..." : (t.refreshNow || "Refresh Now")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={allPeople}
                keyExtractor={(item) => `${item.userId}`}
                renderItem={({ item }) => {
                  const timeInfo = getTimeAgo(item.lastUpdated, t);
                  const gradient = GRADIENT_BY_TYPE[item.monsterType] || GRADIENT_BY_TYPE.bodybuilder;
                  const monsterImage = getMonsterImage(item.monsterType, item.monsterStage);
                  const isFriend = "isFriend" in item && item.isFriend;

                  return (
                    <TouchableOpacity
                      style={[styles.userCard, {
                        backgroundColor: colors.surface,
                        borderColor: isFriend ? colors.primary : colors.border,
                        borderWidth: isFriend ? 1.5 : 1,
                      }]}
                      onPress={() => {
                        // Center map on this user
                        if (mapRef.current && item.latitude && item.longitude) {
                          mapRef.current.animateToRegion({
                            latitude: item.latitude,
                            longitude: item.longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                          }, 500);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <LinearGradient colors={[gradient[0], gradient[1]]} style={styles.userAvatar}>
                        <Image source={monsterImage} style={styles.userMonster} contentFit="contain" />
                      </LinearGradient>
                      <View style={styles.userInfo}>
                        <View style={styles.userNameRow}>
                          <Text style={[styles.userName, { color: colors.foreground }]}>{item.name}</Text>
                          {isFriend && (
                            <View style={[styles.friendBadge, { backgroundColor: colors.primary + "20" }]}>
                              <Text style={[styles.friendBadgeText, { color: colors.primary }]}>
                                {t.friend || "Friend"}
                              </Text>
                            </View>
                          )}
                          {timeInfo.isOnline && <View style={styles.onlineDot} />}
                        </View>
                        <Text style={[styles.userLevel, { color: colors.muted }]}>
                          {tr(`monsterType_${item.monsterType}`) || item.monsterType} Lv.{item.monsterLevel}
                        </Text>
                        <Text style={[styles.userDistance, { color: colors.primary }]}>
                          📍 {"distanceKm" in item && item.distanceKm > 0 ? `${item.distanceKm} km · ` : ""}{timeInfo.text}
                        </Text>
                      </View>
                      {!isFriend && (
                        <TouchableOpacity
                          style={[styles.addBtn, { backgroundColor: colors.primary }]}
                          onPress={() => handleSendRequest(item)}
                        >
                          <IconSymbol name="person.badge.plus" size={18} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                }}
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
    height: SCREEN_HEIGHT * 0.35,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  centerBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
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
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 12,
  },
  listTitle: { fontSize: 14, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
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
  friendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  friendBadgeText: { fontSize: 10, fontWeight: "700" },
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
  emptyNearby: { alignItems: "center", paddingTop: 30, paddingHorizontal: 32 },
  emptyNearbyTitle: { fontSize: 17, fontWeight: "700", marginTop: 12 },
  emptyNearbyDesc: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
