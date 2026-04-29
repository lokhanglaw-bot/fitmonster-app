import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { MuscleGroupVolume } from "@/types/workout";

const MUSCLE_GROUP_CONFIG: Record<
  string,
  { label: string; emoji: string; row: number; col: number }
> = {
  chest: { label: "胸", emoji: "🫁", row: 0, col: 0 },
  upper_chest: { label: "上胸", emoji: "🫁", row: 0, col: 1 },
  back: { label: "背", emoji: "🔙", row: 0, col: 2 },
  mid_back: { label: "中背", emoji: "🔙", row: 0, col: 3 },
  lats: { label: "闊背", emoji: "🦇", row: 1, col: 0 },
  quads: { label: "股四頭", emoji: "🦵", row: 1, col: 1 },
  hamstrings: { label: "腿後", emoji: "🦵", row: 1, col: 2 },
  glutes: { label: "臀", emoji: "🍑", row: 1, col: 3 },
  front_delt: { label: "前三角", emoji: "💪", row: 2, col: 0 },
  side_delt: { label: "側三角", emoji: "💪", row: 2, col: 1 },
  rear_delt: { label: "後三角", emoji: "💪", row: 2, col: 2 },
  biceps: { label: "二頭", emoji: "💪", row: 2, col: 3 },
  triceps: { label: "三頭", emoji: "💪", row: 3, col: 0 },
  core: { label: "核心", emoji: "🎯", row: 3, col: 1 },
  abs: { label: "腹肌", emoji: "🎯", row: 3, col: 2 },
  calves: { label: "小腿", emoji: "🦶", row: 3, col: 3 },
  cardio: { label: "有氧", emoji: "❤️", row: 4, col: 0 },
  traps: { label: "斜方", emoji: "🔺", row: 4, col: 1 },
  obliques: { label: "側腹", emoji: "🎯", row: 4, col: 2 },
  lower_chest: { label: "下胸", emoji: "🫁", row: 4, col: 3 },
};

function getHeatColor(intensity: number): string {
  if (intensity <= 0) return "#F3F4F6";
  if (intensity < 0.25) return "#DCFCE7";
  if (intensity < 0.5) return "#86EFAC";
  if (intensity < 0.75) return "#22C55E";
  return "#15803D";
}

interface MuscleHeatmapProps {
  data: MuscleGroupVolume[];
}

export function MuscleHeatmap({ data }: MuscleHeatmapProps) {
  const colors = useColors();

  // Build lookup
  const volumeMap = new Map(data.map((d) => [d.muscleGroup, d]));

  // Get all muscle groups sorted by row/col
  const groups = Object.entries(MUSCLE_GROUP_CONFIG).sort(
    (a, b) => a[1].row * 10 + a[1].col - (b[1].row * 10 + b[1].col)
  );

  // Group by rows
  const rows: [string, typeof MUSCLE_GROUP_CONFIG[string]][][] = [];
  let currentRow = -1;
  for (const entry of groups) {
    if (entry[1].row !== currentRow) {
      rows.push([]);
      currentRow = entry[1].row;
    }
    rows[rows.length - 1].push(entry);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        🗺️ 肌群訓練量
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        過去 7 天
      </Text>

      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map(([key, config]) => {
              const vol = volumeMap.get(key);
              const intensity = vol?.intensity ?? 0;
              const heatColor = getHeatColor(intensity);
              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    { backgroundColor: heatColor },
                  ]}
                >
                  <Text style={styles.cellEmoji}>{config.emoji}</Text>
                  <Text
                    style={[
                      styles.cellLabel,
                      { color: intensity > 0.5 ? "#fff" : colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {config.label}
                  </Text>
                  {vol && vol.totalSets > 0 && (
                    <Text
                      style={[
                        styles.cellSets,
                        { color: intensity > 0.5 ? "#fff" : colors.muted },
                      ]}
                    >
                      {vol.totalSets}組
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: colors.muted }]}>少</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <View
            key={v}
            style={[styles.legendBox, { backgroundColor: getHeatColor(v) }]}
          />
        ))}
        <Text style={[styles.legendLabel, { color: colors.muted }]}>多</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
  },
  grid: {
    gap: 4,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    gap: 4,
  },
  cell: {
    flex: 1,
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
  },
  cellEmoji: {
    fontSize: 14,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  cellSets: {
    fontSize: 9,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
  },
  legendBox: {
    width: 20,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 10,
  },
});
