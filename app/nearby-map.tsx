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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Simulated nearby users with relative positions
const NEARBY_USERS = [
  {
    id: 1, name: "FitChamp", level: 18, monsterType: "Powerlifter",
    monsterImage: require("@/assets/monsters/powerlifter-stage2.png"),
    distance: "0.3 km", online: true, lastActive: "Now",
    latOffset: 0.002, lngOffset: 0.003,
    gradient: ["#FEF3C7", "#FDE68A"] as readonly [string, string],
  },
  {
    id: 2, name: "GymRat", level: 14, monsterType: "Bodybuilder",
    monsterImage: require("@/assets/monsters/bodybuilder-stage2.png"),
    distance: "0.8 km", online: true, lastActive: "Now",
    latOffset: -0.004, lngOffset: 0.005,
    gradient: ["#DCFCE7", "#BBF7D0"] as readonly [string, string],
  },
  {
    id: 3, name: "YogaMaster", level: 12, monsterType: "Physique",
    monsterImage: require("@/assets/monsters/physique-stage2.png"),
    distance: "1.2 km", online: false, lastActive: "15m ago",
    latOffset: 0.006, lngOffset: -0.003,
    gradient: ["#DBEAFE", "#BFDBFE"] as readonly [string, string],
  },
  {
    id: 4, name: "IronWill", level: 22, monsterType: "Powerlifter",
    monsterImage: require("@/assets/monsters/powerlifter-stage3.png"),
    distance: "2.1 km", online: true, lastActive: "Now",
    latOffset: -0.008, lngOffset: -0.006,
    gradient: ["#FEF3C7", "#FDE68A"] as readonly [string, string],
  },
  {
    id: 5, name: "CardioKing", level: 16, monsterType: "Bodybuilder",
    monsterImage: require("@/assets/monsters/bodybuilder-stage3.png"),
    distance: "1.5 km", online: false, lastActive: "1h ago",
    latOffset: 0.005, lngOffset: 0.008,
    gradient: ["#DCFCE7", "#BBF7D0"] as readonly [string, string],
  },
];

export default function NearbyMapScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t, tr } = useI18n();
  const insets = useSafeAreaInsets();
  const [locationGranted, setLocationGranted] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<typeof NEARBY_USERS[0] | null>(null);

  useEffect(() => {
    requestLocation();
  }, []);

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

  const handleToggleSharing = useCallback((value: boolean) => {
    if (value && !locationGranted) {
      Alert.alert(
        t.locationPermissionRequired || "Location Permission Required",
        t.locationPermissionMessage || "Please enable location access in your device settings to share your location with nearby trainers.",
        [{ text: t.ok }]
      );
      return;
    }
    setSharingLocation(value);
    if (value) {
      Alert.alert(
        t.locationSharingEnabled || "Location Sharing Enabled",
        t.locationSharingEnabledMessage || "Nearby trainers can now see you on the map. Your location is only shared while the app is open.",
        [{ text: t.ok }]
      );
    }
  }, [locationGranted]);

  const handleSendRequest = useCallback((user: typeof NEARBY_USERS[0]) => {
    Alert.alert(
      t.friendRequestSentTitle || "Friend Request Sent!",
      `${t.friendRequestSentTo || "You sent a friend request to"} ${user.name}.\n${t.needToAccept || "They need to accept before you can battle!"}`,
      [{ text: t.ok }]
    );
  }, []);

  const renderNearbyUser = ({ item }: { item: typeof NEARBY_USERS[0] }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => setSelectedUser(selectedUser?.id === item.id ? null : item)}
      activeOpacity={0.7}
    >
      <LinearGradient colors={[item.gradient[0], item.gradient[1]]} style={styles.userAvatar}>
        <Image source={item.monsterImage} style={styles.userMonster} contentFit="contain" />
      </LinearGradient>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={[styles.userName, { color: colors.foreground }]}>{item.name}</Text>
          {item.online && <View style={styles.onlineDot} />}
        </View>
        <Text style={[styles.userLevel, { color: colors.muted }]}>
          {item.monsterType} Lv.{item.level}
        </Text>
        <Text style={[styles.userDistance, { color: colors.primary }]}>
          📍 {item.distance} · {item.lastActive}
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
            {NEARBY_USERS.map((user, idx) => {
              const positions = [
                { left: "20%", top: "25%" },
                { left: "70%", top: "30%" },
                { left: "30%", top: "65%" },
                { left: "75%", top: "70%" },
                { left: "55%", top: "20%" },
              ];
              const pos = positions[idx % positions.length];
              return (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.mapPin, pos as any]}
                  onPress={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                >
                  <View style={[
                    styles.mapUserPin,
                    { backgroundColor: user.online ? "#22C55E" : "#9CA3AF" },
                    selectedUser?.id === user.id && { borderColor: colors.primary, borderWidth: 3 },
                  ]}>
                    <Text style={{ fontSize: 12 }}>{user.monsterType === "Powerlifter" ? "💪" : user.monsterType === "Bodybuilder" ? "🏋️" : "🧘"}</Text>
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
            <LinearGradient colors={[selectedUser.gradient[0], selectedUser.gradient[1]]} style={styles.selectedAvatar}>
              <Image source={selectedUser.monsterImage} style={styles.selectedMonster} contentFit="contain" />
            </LinearGradient>
            <View style={styles.selectedInfo}>
              <Text style={[styles.selectedName, { color: colors.foreground }]}>{selectedUser.name}</Text>
              <Text style={[styles.selectedLevel, { color: colors.muted }]}>
                {selectedUser.monsterType} Lv.{selectedUser.level} · {selectedUser.distance}
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
          🏃 {NEARBY_USERS.filter((u) => u.online).length} {t.trainersActiveNearby || "trainers active nearby"}
        </Text>
        <FlatList
          data={NEARBY_USERS}
          renderItem={renderNearbyUser}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
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
});
