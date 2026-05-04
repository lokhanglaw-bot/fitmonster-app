import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { useActivity } from "@/lib/activity-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { trpc } from "@/lib/trpc";

interface NearbyPlayer {
  id: string;
  name: string;
  monsterName: string;
  monsterType: string;
  monsterLevel: number;
  bodyType: string;
  distance: string;
  isOnline: boolean;
  lastActive: string;
  winRate: number;
}

const MONSTER_EMOJIS: Record<string, string> = {
  powerlifter2: "🐻",
  bodybuilder2: "🐉",
  physique2: "🦊",
  athlete: "🦁",
  colossus: "🐺",
  powerlifter: "🐻",
  bodybuilder: "🐉",
  physique: "🦊",
};

const BODY_TYPE_DISPLAY: Record<string, { en: string; zh: string; color: string }> = {
  peak: { en: "Peak", zh: "巔峰", color: "#FFD700" },
  lean: { en: "Lean", zh: "精實", color: "#22C55E" },
  standard: { en: "Standard", zh: "標準", color: "#3B82F6" },
  skinny: { en: "Skinny", zh: "偏瘦", color: "#94A3B8" },
  overweight: { en: "Overweight", zh: "偏胖", color: "#F59E0B" },
  fat: { en: "Overweight", zh: "偏胖", color: "#F59E0B" },
  obese: { en: "Obese", zh: "肥胖", color: "#EF4444" },
};

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function getTimeAgo(lastUpdated: Date | string): { text: string; isOnline: boolean } {
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const diffMs = now - updated;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 5) return { text: "剛剛", isOnline: true };
  if (diffMin < 60) return { text: `${diffMin}分鐘前`, isOnline: false };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `${diffHours}小時前`, isOnline: false };
  return { text: `${Math.floor(diffHours / 24)}天前`, isOnline: false };
}

export default function NearbyPlayersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, language } = useI18n();
  const { state: activity } = useActivity();
  const [isScanning, setIsScanning] = useState(false);
  const [players, setPlayers] = useState<NearbyPlayer[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // tRPC: update own location + query nearby
  const locationUpdateMutation = trpc.location.update.useMutation();

  const startScan = useCallback(async () => {
    setIsScanning(true);
    try {
      // Request real location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("位置權限", "需要位置權限才能掃描附近玩家。請在設定中開啟位置存取。");
        setIsScanning(false);
        return;
      }

      // Get real device location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);

      // Update own location to server
      try {
        await locationUpdateMutation.mutateAsync({
          latitude: coords.lat,
          longitude: coords.lng,
          isSharing: true,
        });
      } catch (err) {
        console.warn("[NearbyPlayers] Failed to update location:", err);
      }

      setHasPermission(true);
      setIsScanning(false);
    } catch (err) {
      console.warn("[NearbyPlayers] Location error:", err);
      Alert.alert("定位失敗", "無法取得您的位置，請確認已開啟定位服務。");
      setIsScanning(false);
    }
  }, [locationUpdateMutation]);

  // Query nearby users from server when we have location
  const nearbyQuery = trpc.location.nearby.useQuery(
    {
      latitude: userLocation?.lat ?? 0,
      longitude: userLocation?.lng ?? 0,
      radiusKm: 5,
      includeFriends: false,
      genderFilter: "all",
    },
    {
      enabled: !!userLocation && hasPermission,
      refetchInterval: 30000, // Refresh every 30s
    }
  );

  // Transform server data to NearbyPlayer format
  useEffect(() => {
    if (nearbyQuery.data && Array.isArray(nearbyQuery.data)) {
      const transformed: NearbyPlayer[] = (nearbyQuery.data as any[]).map((user: any) => {
        const timeInfo = getTimeAgo(user.lastUpdated);
        return {
          id: String(user.userId),
          name: user.name || "訓練師",
          monsterName: user.monsterName || "怪獸",
          monsterType: user.monsterType || "bodybuilder",
          monsterLevel: user.monsterLevel || 1,
          bodyType: user.bodyType || "standard",
          distance: formatDistance(user.distanceKm || 0),
          isOnline: timeInfo.isOnline,
          lastActive: timeInfo.text,
          winRate: user.winRate || 0.5,
        };
      });
      setPlayers(transformed);
    }
  }, [nearbyQuery.data]);

  const handleChallenge = useCallback((player: NearbyPlayer) => {
    if (!player.isOnline) {
      Alert.alert("玩家離線", `${player.name} 目前不在線上，無法發起挑戰。`);
      return;
    }
    Alert.alert(
      "發起對戰",
      `確定要向 ${player.name} (Lv.${player.monsterLevel} ${player.monsterName}) 發起對戰嗎？`,
      [
        { text: "取消", style: "cancel" },
        { text: "開戰！", onPress: () => router.push("/(tabs)/battle") },
      ]
    );
  }, [router]);

  const renderPlayer = useCallback(({ item }: { item: NearbyPlayer }) => {
    const emoji = MONSTER_EMOJIS[item.monsterType] || "🐾";
    const bodyDisplay = BODY_TYPE_DISPLAY[item.bodyType] || BODY_TYPE_DISPLAY.standard;
    const bodyInfo = { label: (bodyDisplay as any)[language] as string, color: bodyDisplay.color };
    return (
      <TouchableOpacity
        style={[styles.playerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleChallenge(item)}
        activeOpacity={0.7}
      >
        <View style={styles.playerLeft}>
          <View style={styles.monsterAvatar}>
            <Text style={styles.monsterEmoji}>{emoji}</Text>
            {item.isOnline && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.playerInfo}>
            <View style={styles.playerNameRow}>
              <Text style={[styles.playerName, { color: colors.foreground }]}>{item.name}</Text>
              <View style={[styles.bodyBadge, { backgroundColor: bodyInfo.color + "20" }]}>
                <Text style={[styles.bodyBadgeText, { color: bodyInfo.color }]}>{bodyInfo.label}</Text>
              </View>
            </View>
            <Text style={[styles.monsterInfo, { color: colors.muted }]}>
              {item.monsterName} Lv.{item.monsterLevel} • {language === "zh" ? "勝率" : "Win"} {Math.round(item.winRate * 100)}%
            </Text>
            <Text style={[styles.distanceText, { color: colors.muted }]}>
              📍 {item.distance} • {item.lastActive}
            </Text>
          </View>
        </View>
        <View style={[styles.challengeBtn, { backgroundColor: item.isOnline ? colors.primary : colors.border }]}>
          <Text style={[styles.challengeBtnText, { color: item.isOnline ? "#fff" : colors.muted }]}>
            {item.isOnline ? "⚔️" : "💤"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, handleChallenge]);

  return (
    <ScreenContainer className="p-4">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>附近玩家</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>尋找附近的訓練夥伴和對手</Text>
      </View>

      {!hasPermission ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>探索附近玩家</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            開啟位置權限後，可以發現附近正在健身的玩家，發起即時對戰！
          </Text>
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.primary }]}
            onPress={startScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.scanBtnText}>🔍 開始掃描</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Stats bar */}
          <LinearGradient
            colors={[colors.primary + "15", colors.primary + "05"]}
            style={[styles.statsBar, { borderColor: colors.border }]}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{players.filter(p => p.isOnline).length}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>在線</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{players.length}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>附近</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#F59E0B" }]}>5km</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>範圍</Text>
            </View>
          </LinearGradient>

          {/* Loading state */}
          {nearbyQuery.isLoading && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>搜尋附近玩家中...</Text>
            </View>
          )}

          {/* Empty state when no players found */}
          {!nearbyQuery.isLoading && players.length === 0 && (
            <View style={styles.noPlayersState}>
              <Text style={styles.noPlayersEmoji}>🏜️</Text>
              <Text style={[styles.noPlayersTitle, { color: colors.foreground }]}>附近暫無玩家</Text>
              <Text style={[styles.noPlayersDesc, { color: colors.muted }]}>
                目前 5km 範圍內沒有其他正在分享位置的玩家。試試稍後再掃描！
              </Text>
            </View>
          )}

          {/* Player list */}
          {players.length > 0 && (
            <FlatList
              data={players}
              renderItem={renderPlayer}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                <TouchableOpacity style={[styles.refreshBtn, { borderColor: colors.border }]} onPress={startScan}>
                  <Text style={[styles.refreshText, { color: colors.primary }]}>🔄 重新掃描</Text>
                </TouchableOpacity>
              }
            />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 16, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 4 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  scanBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  statsBar: { flexDirection: "row", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  listContent: { paddingBottom: 40 },
  playerCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  playerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  monsterAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginRight: 12 },
  monsterEmoji: { fontSize: 24 },
  onlineDot: { position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#fff" },
  playerInfo: { flex: 1 },
  playerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  playerName: { fontSize: 15, fontWeight: "700" },
  bodyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bodyBadgeText: { fontSize: 10, fontWeight: "600" },
  monsterInfo: { fontSize: 12, marginTop: 2 },
  distanceText: { fontSize: 11, marginTop: 2 },
  challengeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  challengeBtnText: { fontSize: 18 },
  refreshBtn: { alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  refreshText: { fontSize: 14, fontWeight: "600" },
  loadingState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  noPlayersState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  noPlayersEmoji: { fontSize: 48, marginBottom: 12 },
  noPlayersTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  noPlayersDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
