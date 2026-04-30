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

// Simulated nearby players (in production, this would use location + server matching)
interface NearbyPlayer {
  id: string;
  name: string;
  monsterName: string;
  monsterType: string;
  monsterLevel: number;
  bodyType: string;
  distance: string; // e.g. "50m", "200m"
  isOnline: boolean;
  lastActive: string;
  winRate: number;
}

const MOCK_NEARBY: NearbyPlayer[] = [
  { id: "1", name: "健身達人A", monsterName: "鐵拳熊", monsterType: "powerlifter2", monsterLevel: 12, bodyType: "lean", distance: "50m", isOnline: true, lastActive: "剛剛", winRate: 0.65 },
  { id: "2", name: "肌肉狂人B", monsterName: "火龍", monsterType: "bodybuilder2", monsterLevel: 18, bodyType: "peak", distance: "120m", isOnline: true, lastActive: "2分鐘前", winRate: 0.72 },
  { id: "3", name: "瑜珈女神C", monsterName: "玉狐", monsterType: "physique2", monsterLevel: 9, bodyType: "standard", distance: "300m", isOnline: false, lastActive: "15分鐘前", winRate: 0.55 },
  { id: "4", name: "跑步王D", monsterName: "雷獅", monsterType: "athlete", monsterLevel: 14, bodyType: "lean", distance: "500m", isOnline: true, lastActive: "剛剛", winRate: 0.60 },
  { id: "5", name: "新手E", monsterName: "冰企鵝", monsterType: "colossus", monsterLevel: 3, bodyType: "overweight", distance: "800m", isOnline: false, lastActive: "1小時前", winRate: 0.40 },
];

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

const BODY_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  peak: { label: "巔峰", color: "#FFD700" },
  lean: { label: "精實", color: "#22C55E" },
  standard: { label: "標準", color: "#3B82F6" },
  skinny: { label: "偏瘦", color: "#94A3B8" },
  overweight: { label: "偏胖", color: "#F59E0B" },
  obese: { label: "肥胖", color: "#EF4444" },
};

export default function NearbyPlayersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const { state: activity } = useActivity();
  const [isScanning, setIsScanning] = useState(false);
  const [players, setPlayers] = useState<NearbyPlayer[]>([]);
  const [hasPermission, setHasPermission] = useState(false);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    // Simulate location permission request
    setTimeout(() => {
      setHasPermission(true);
      setPlayers(MOCK_NEARBY);
      setIsScanning(false);
    }, 2000);
  }, []);

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
    const bodyInfo = BODY_TYPE_LABELS[item.bodyType] || BODY_TYPE_LABELS.standard;
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
              {item.monsterName} Lv.{item.monsterLevel} • 勝率 {Math.round(item.winRate * 100)}%
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
              <Text style={[styles.statValue, { color: "#F59E0B" }]}>1km</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>範圍</Text>
            </View>
          </LinearGradient>

          {/* Player list */}
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
});
