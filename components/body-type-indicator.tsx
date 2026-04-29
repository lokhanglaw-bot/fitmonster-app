import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { BodyType } from "@/types/game";
import { BODY_TYPE_LABELS, BODY_TYPE_ATTACK_MOD } from "@/types/game";

const BODY_TYPE_COLORS: Record<BodyType, string> = {
  peak: "#22C55E",
  lean: "#3B82F6",
  standard: "#6B7280",
  skinny: "#F59E0B",
  fat: "#F97316",
  obese: "#EF4444",
};

const BODY_TYPE_EMOJIS: Record<BodyType, string> = {
  peak: "💎",
  lean: "🔥",
  standard: "⚖️",
  skinny: "🦴",
  fat: "🍔",
  obese: "⚠️",
};

interface BodyTypeIndicatorProps {
  bodyType: BodyType;
  muscleScore: number;
  fatScore: number;
  compact?: boolean;
}

export function BodyTypeIndicator({
  bodyType,
  muscleScore,
  fatScore,
  compact = false,
}: BodyTypeIndicatorProps) {
  const colors = useColors();
  const btColor = BODY_TYPE_COLORS[bodyType] ?? "#6B7280";
  const btLabel = BODY_TYPE_LABELS[bodyType]?.zh ?? bodyType;
  const btEmoji = BODY_TYPE_EMOJIS[bodyType] ?? "⚖️";
  const atkMod = BODY_TYPE_ATTACK_MOD[bodyType] ?? 1.0;

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: btColor + "20", borderColor: btColor }]}>
        <Text style={{ fontSize: 12 }}>{btEmoji}</Text>
        <Text style={[styles.compactText, { color: btColor }]}>{btLabel}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={{ fontSize: 18 }}>{btEmoji}</Text>
        <Text style={[styles.title, { color: btColor }]}>{btLabel}</Text>
        {atkMod !== 1.0 && (
          <View style={[styles.modBadge, { backgroundColor: atkMod > 1 ? "#DCFCE7" : "#FEE2E2" }]}>
            <Text style={[styles.modText, { color: atkMod > 1 ? "#166534" : "#991B1B" }]}>
              ATK {atkMod > 1 ? "+" : ""}{Math.round((atkMod - 1) * 100)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.barsRow}>
        <View style={styles.barGroup}>
          <Text style={[styles.barLabel, { color: colors.muted }]}>💪 肌肉</Text>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(muscleScore, 100)}%`, backgroundColor: "#3B82F6" },
              ]}
            />
          </View>
          <Text style={[styles.barValue, { color: colors.foreground }]}>{Math.round(muscleScore)}</Text>
        </View>
        <View style={styles.barGroup}>
          <Text style={[styles.barLabel, { color: colors.muted }]}>🔥 脂肪</Text>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(fatScore, 100)}%`,
                  backgroundColor: fatScore > 30 ? "#EF4444" : fatScore > 20 ? "#F59E0B" : "#22C55E",
                },
              ]}
            />
          </View>
          <Text style={[styles.barValue, { color: colors.foreground }]}>{Math.round(fatScore)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  modBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: "auto",
  },
  modText: {
    fontSize: 11,
    fontWeight: "700",
  },
  barsRow: {
    gap: 6,
  },
  barGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
    width: 56,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: "600",
    width: 28,
    textAlign: "right",
  },
  compactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  compactText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
