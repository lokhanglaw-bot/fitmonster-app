import { useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Share,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import type { NutritionInfo, FoodLabel } from "@/types/nutrition";
import { getFoodLabels } from "@/types/nutrition";

const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
  green: { bg: "#DCFCE7", text: "#166534" },
  yellow: { bg: "#FEF3C7", text: "#92400E" },
  red: { bg: "#FEE2E2", text: "#991B1B" },
};

interface ShareCardProps {
  type: "food" | "workout";
  title: string;
  subtitle?: string;
  // Food-specific
  nutrition?: NutritionInfo;
  healthScore?: number;
  imageUrl?: string;
  // Workout-specific
  duration?: number;
  calories?: number;
  exercises?: string[];
  prCount?: number;
  // Common
  monsterName?: string;
  monsterEmoji?: string;
  date?: string;
}

export function ShareCard({
  type,
  title,
  subtitle,
  nutrition,
  healthScore,
  duration,
  calories,
  exercises,
  prCount,
  monsterName,
  monsterEmoji,
  date,
}: ShareCardProps) {
  const colors = useColors();
  const foodLabels = nutrition ? getFoodLabels(nutrition) : [];
  const dateStr = date ?? new Date().toLocaleDateString("zh-TW");

  const handleShare = useCallback(async () => {
    let message = "";
    if (type === "food") {
      message = `🍽️ ${title}\n`;
      if (nutrition) {
        message += `🔥 ${nutrition.calories} kcal | 🥩 ${nutrition.protein}g 蛋白質\n`;
        if (nutrition.addedSugar !== undefined) {
          message += `🍬 添加糖 ${nutrition.addedSugar}g\n`;
        }
      }
      if (healthScore) {
        message += `💚 健康分數: ${healthScore}/10\n`;
      }
    } else {
      message = `💪 ${title}\n`;
      if (duration) message += `⏱️ ${duration} 分鐘\n`;
      if (calories) message += `🔥 ${calories} kcal\n`;
      if (prCount && prCount > 0) message += `🏆 ${prCount} 個新 PR!\n`;
    }
    if (monsterName) {
      message += `\n${monsterEmoji ?? "🐾"} ${monsterName} 的訓練師\n`;
    }
    message += `📅 ${dateStr}\n\n#FitMonster #健身怪獸`;

    try {
      await Share.share({ message });
    } catch {
      // User cancelled
    }
  }, [type, title, nutrition, healthScore, duration, calories, prCount, monsterName, monsterEmoji, dateStr]);

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <LinearGradient
        colors={type === "food" ? ["#FEF3C7", "#FDE68A"] : ["#DBEAFE", "#BFDBFE"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>
            {type === "food" ? "🍽️" : "💪"}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle && (
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            )}
          </View>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        {/* Food content */}
        {type === "food" && nutrition && (
          <View style={styles.nutritionGrid}>
            <View style={[styles.nutritionItem, { backgroundColor: "rgba(255,255,255,0.7)" }]}>
              <Text style={styles.nutritionValue}>{nutrition.calories}</Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: "rgba(255,255,255,0.7)" }]}>
              <Text style={styles.nutritionValue}>{nutrition.protein}g</Text>
              <Text style={styles.nutritionLabel}>蛋白質</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: "rgba(255,255,255,0.7)" }]}>
              <Text style={styles.nutritionValue}>{nutrition.carbs}g</Text>
              <Text style={styles.nutritionLabel}>碳水</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: "rgba(255,255,255,0.7)" }]}>
              <Text style={styles.nutritionValue}>{nutrition.fat}g</Text>
              <Text style={styles.nutritionLabel}>脂肪</Text>
            </View>
          </View>
        )}

        {/* Food labels (traffic light) */}
        {foodLabels.length > 0 && (
          <View style={styles.labelsRow}>
            {foodLabels.map((label, i) => {
              const lc = LABEL_COLORS[label.color] ?? LABEL_COLORS.green;
              return (
                <View
                  key={i}
                  style={[styles.labelBadge, { backgroundColor: lc.bg }]}
                >
                  <Text style={[styles.labelText, { color: lc.text }]}>
                    {label.label} {label.value}{label.unit}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Workout content */}
        {type === "workout" && (
          <View style={styles.workoutStats}>
            {duration !== undefined && (
              <View style={[styles.nutritionItem, { backgroundColor: "rgba(255,255,255,0.7)" }]}>
                <Text style={styles.nutritionValue}>{duration}</Text>
                <Text style={styles.nutritionLabel}>分鐘</Text>
              </View>
            )}
            {calories !== undefined && (
              <View style={[styles.nutritionItem, { backgroundColor: "rgba(255,255,255,0.7)" }]}>
                <Text style={styles.nutritionValue}>{calories}</Text>
                <Text style={styles.nutritionLabel}>kcal</Text>
              </View>
            )}
            {prCount !== undefined && prCount > 0 && (
              <View style={[styles.nutritionItem, { backgroundColor: "rgba(255,255,255,0.7)" }]}>
                <Text style={styles.nutritionValue}>🏆 {prCount}</Text>
                <Text style={styles.nutritionLabel}>新 PR</Text>
              </View>
            )}
          </View>
        )}

        {/* Health score */}
        {healthScore !== undefined && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>健康分數</Text>
            <View style={styles.scoreBar}>
              <View
                style={[
                  styles.scoreFill,
                  {
                    width: `${healthScore * 10}%`,
                    backgroundColor:
                      healthScore >= 7
                        ? "#22C55E"
                        : healthScore >= 4
                        ? "#F59E0B"
                        : "#EF4444",
                  },
                ]}
              />
            </View>
            <Text style={styles.scoreValue}>{healthScore}/10</Text>
          </View>
        )}

        {/* Monster footer */}
        {monsterName && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {monsterEmoji ?? "🐾"} {monsterName} 的訓練師
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Share button */}
      <TouchableOpacity
        onPress={handleShare}
        style={styles.shareBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.shareBtnText}>📤 分享</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  gradient: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  dateText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  nutritionGrid: {
    flexDirection: "row",
    gap: 6,
  },
  nutritionItem: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  nutritionLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  labelsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  labelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "600",
  },
  workoutStats: {
    flexDirection: "row",
    gap: 6,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  scoreBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  footer: {
    alignItems: "center",
    paddingTop: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  shareBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    alignItems: "center",
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
});
