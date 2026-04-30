import { useState, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useActivity } from "@/lib/activity-context";
import { LinearGradient } from "expo-linear-gradient";

interface GymChallenge {
  id: string;
  title: string;
  description: string;
  type: "strength" | "endurance" | "flexibility" | "speed";
  difficulty: "easy" | "medium" | "hard" | "extreme";
  duration: string; // e.g. "7天", "30天"
  participants: number;
  maxParticipants: number;
  reward: { exp: number; badge?: string };
  progress?: number; // 0-100
  joined?: boolean;
  gymName?: string;
}

const CHALLENGES: GymChallenge[] = [
  {
    id: "1",
    title: "深蹲百次挑戰",
    description: "7天內累計完成100次深蹲，每天至少15次",
    type: "strength",
    difficulty: "easy",
    duration: "7天",
    participants: 23,
    maxParticipants: 50,
    reward: { exp: 200, badge: "🏋️" },
    progress: 45,
    joined: true,
    gymName: "World Gym 信義店",
  },
  {
    id: "2",
    title: "臥推PR挑戰",
    description: "在30天內突破你的臥推個人紀錄",
    type: "strength",
    difficulty: "hard",
    duration: "30天",
    participants: 12,
    maxParticipants: 30,
    reward: { exp: 500, badge: "💪" },
    gymName: "World Gym 信義店",
  },
  {
    id: "3",
    title: "有氧燃脂週",
    description: "一週內累計有氧運動300分鐘",
    type: "endurance",
    difficulty: "medium",
    duration: "7天",
    participants: 35,
    maxParticipants: 100,
    reward: { exp: 300, badge: "🔥" },
    progress: 20,
    joined: true,
  },
  {
    id: "4",
    title: "引體向上大師",
    description: "連續14天每天完成10個引體向上",
    type: "strength",
    difficulty: "extreme",
    duration: "14天",
    participants: 5,
    maxParticipants: 20,
    reward: { exp: 800, badge: "🦅" },
  },
  {
    id: "5",
    title: "柔韌性挑戰",
    description: "每天拉伸15分鐘，持續21天",
    type: "flexibility",
    difficulty: "easy",
    duration: "21天",
    participants: 42,
    maxParticipants: 100,
    reward: { exp: 250, badge: "🧘" },
  },
  {
    id: "6",
    title: "HIIT衝刺王",
    description: "完成10次HIIT訓練，每次至少20分鐘",
    type: "speed",
    difficulty: "medium",
    duration: "14天",
    participants: 18,
    maxParticipants: 40,
    reward: { exp: 400, badge: "⚡" },
  },
];

const DIFFICULTY_CONFIG = {
  easy: { label: "簡單", color: "#22C55E", bg: "#DCFCE7" },
  medium: { label: "中等", color: "#F59E0B", bg: "#FEF3C7" },
  hard: { label: "困難", color: "#EF4444", bg: "#FEE2E2" },
  extreme: { label: "極限", color: "#7C3AED", bg: "#EDE9FE" },
};

const TYPE_ICONS: Record<string, string> = {
  strength: "🏋️",
  endurance: "🏃",
  flexibility: "🧘",
  speed: "⚡",
};

export default function GymChallengesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state: activity } = useActivity();
  const [filter, setFilter] = useState<"all" | "joined" | "nearby">("all");
  const [challenges, setChallenges] = useState(CHALLENGES);

  const filteredChallenges = challenges.filter((c) => {
    if (filter === "joined") return c.joined;
    if (filter === "nearby") return !!c.gymName;
    return true;
  });

  const handleJoin = useCallback((challenge: GymChallenge) => {
    if (challenge.participants >= challenge.maxParticipants) {
      Alert.alert("名額已滿", "這個挑戰的參加人數已達上限。");
      return;
    }
    Alert.alert(
      "加入挑戰",
      `確定要加入「${challenge.title}」嗎？\n\n${challenge.description}\n\n獎勵：${challenge.reward.exp} EXP ${challenge.reward.badge || ""}`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "加入！",
          onPress: () => {
            setChallenges((prev) =>
              prev.map((c) =>
                c.id === challenge.id
                  ? { ...c, joined: true, participants: c.participants + 1, progress: 0 }
                  : c
              )
            );
          },
        },
      ]
    );
  }, []);

  const renderChallenge = useCallback(({ item }: { item: GymChallenge }) => {
    const diff = DIFFICULTY_CONFIG[item.difficulty];
    const icon = TYPE_ICONS[item.type] || "🏆";
    return (
      <TouchableOpacity
        style={[styles.challengeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => item.joined ? null : handleJoin(item)}
        activeOpacity={item.joined ? 1 : 0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>{icon}</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
          </View>
          <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
            <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
          </View>
        </View>

        <Text style={[styles.cardDesc, { color: colors.muted }]}>{item.description}</Text>

        <View style={styles.cardMeta}>
          <Text style={[styles.metaText, { color: colors.muted }]}>
            ⏱ {item.duration} • 👥 {item.participants}/{item.maxParticipants}
          </Text>
          {item.gymName && (
            <Text style={[styles.metaText, { color: colors.primary }]}>📍 {item.gymName}</Text>
          )}
        </View>

        {item.joined && item.progress !== undefined && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>進度</Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>{item.progress}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
              <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardBadge}>{item.reward.badge || "🏆"}</Text>
            <Text style={[styles.rewardText, { color: "#F59E0B" }]}>+{item.reward.exp} EXP</Text>
          </View>
          {!item.joined ? (
            <View style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.joinBtnText}>加入</Text>
            </View>
          ) : (
            <View style={[styles.joinBtn, { backgroundColor: "#22C55E" }]}>
              <Text style={styles.joinBtnText}>已加入 ✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [colors, handleJoin]);

  return (
    <ScreenContainer className="p-4">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← 返回</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>實體挑戰</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>加入健身房挑戰，和其他玩家一起變強</Text>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(["all", "joined", "nearby"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.muted }]}>
              {f === "all" ? "全部" : f === "joined" ? "已加入" : "附近"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <LinearGradient
        colors={["#FEF3C7", "#FDE68A"]}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryTitle}>🏆 我的挑戰</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{challenges.filter(c => c.joined).length}</Text>
            <Text style={styles.summaryLabel}>進行中</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>已完成</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>獎章</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Challenge list */}
      <FlatList
        data={filteredChallenges}
        renderItem={renderChallenge}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 16, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 4 },
  filterRow: { flexDirection: "row", borderRadius: 12, padding: 4, borderWidth: 1, marginBottom: 12 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  filterText: { fontSize: 13, fontWeight: "600" },
  summaryCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: "700", color: "#92400E", marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "800", color: "#92400E" },
  summaryLabel: { fontSize: 11, color: "#B45309", marginTop: 2 },
  listContent: { paddingBottom: 40 },
  challengeCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  diffText: { fontSize: 11, fontWeight: "700" },
  cardDesc: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  cardMeta: { marginBottom: 8 },
  metaText: { fontSize: 12, marginBottom: 2 },
  progressSection: { marginBottom: 10 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progressLabel: { fontSize: 12, fontWeight: "600" },
  progressPercent: { fontSize: 12, fontWeight: "700" },
  progressTrack: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rewardBadge: { fontSize: 16 },
  rewardText: { fontSize: 13, fontWeight: "700" },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  joinBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
