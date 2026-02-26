import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { useCaring } from "@/lib/caring-context";
import { useI18n } from "@/lib/i18n-context";

// ── Status Bar Component ─────────────────────────────────────────────────

function StatusBar({
  label,
  value,
  maxValue,
  color,
  icon,
  statusText,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  icon: string;
  statusText: string;
}) {
  const colors = useColors();
  const percent = Math.min((value / maxValue) * 100, 100);

  // Animate bar width
  const barWidth = useSharedValue(0);
  useEffect(() => {
    barWidth.value = withTiming(percent, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%` as any,
  }));

  return (
    <View style={caringStyles.statusBarContainer}>
      <View style={caringStyles.statusBarHeader}>
        <Text style={caringStyles.statusBarIcon}>{icon}</Text>
        <Text style={[caringStyles.statusBarLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[caringStyles.statusBarStatus, { color }]}>{statusText}</Text>
        <Text style={[caringStyles.statusBarValue, { color: colors.muted }]}>{value}/{maxValue}</Text>
      </View>
      <View style={[caringStyles.statusBarTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={[caringStyles.statusBarFill, { backgroundColor: color }, barStyle]} />
      </View>
    </View>
  );
}

// ── Dialogue Bubble ──────────────────────────────────────────────────────

function DialogueBubble({ text, monsterName }: { text: string; monsterName: string }) {
  const colors = useColors();
  const { tr } = useI18n();

  // Subtle breathing animation
  const breathe = useSharedValue(1);
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.01, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  if (!text) return null;

  return (
    <Animated.View style={[caringStyles.dialogueBubble, { backgroundColor: colors.surface, borderColor: colors.border }, animStyle]}>
      <Text style={[caringStyles.dialogueText, { color: colors.foreground }]}>{text}</Text>
    </Animated.View>
  );
}

// ── Main Caring Panel ────────────────────────────────────────────────────

interface MonsterCaringPanelProps {
  monsterName: string;
}

export function MonsterCaringPanel({ monsterName }: MonsterCaringPanelProps) {
  const colors = useColors();
  const { state, getAdvice, refresh } = useCaring();
  const { language, t, tr } = useI18n();
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [dialogue, setDialogue] = useState("");
  const hasLoadedQuickRef = useRef(false);

  // Get fullness status label
  const getFullnessLabel = useCallback((status: string) => {
    switch (status) {
      case "satisfied": return t.caringSatisfied;
      case "hungry": return t.caringHungry;
      case "very_hungry": return t.caringVeryHungry;
      case "starving": return t.caringStarving;
      default: return t.caringNormal;
    }
  }, [t]);

  // Get energy status label
  const getEnergyLabel = useCallback((status: string) => {
    switch (status) {
      case "energetic": return t.caringEnergetic;
      case "lazy": return t.caringLazy;
      case "exhausted": return t.caringExhausted;
      default: return t.caringNormal;
    }
  }, [t]);

  // Get mood status label
  const getMoodLabel = useCallback((status: string) => {
    switch (status) {
      case "happy": return t.caringHappy;
      case "sad": return t.caringSad;
      case "depressed": return t.caringDepressed;
      default: return t.caringNormal;
    }
  }, [t]);

  // Get overall status label and color
  const getOverallInfo = useCallback((status: string): { label: string; color: string } => {
    switch (status) {
      case "peak": return { label: t.caringPeakState, color: "#F59E0B" };
      case "optimal": return { label: t.caringOptimal, color: "#22C55E" };
      case "good": return { label: t.caringGood, color: "#22C55E" };
      case "fair": return { label: t.caringFair, color: "#F59E0B" };
      case "poor": return { label: t.caringPoor, color: "#EF4444" };
      default: return { label: t.caringNormal, color: colors.muted };
    }
  }, [t, colors]);

  // Fullness bar color
  const getFullnessColor = (value: number) => {
    if (value >= 70) return "#22C55E";
    if (value >= 40) return "#F59E0B";
    return "#EF4444";
  };

  // Energy bar color
  const getEnergyColor = (value: number) => {
    if (value >= 70) return "#3B82F6";
    if (value >= 40) return "#8B5CF6";
    return "#6B7280";
  };

  // Mood bar color
  const getMoodColor = (value: number) => {
    if (value >= 70) return "#EC4899";
    if (value >= 40) return "#F59E0B";
    return "#6B7280";
  };

  // Load quick dialogue on mount
  useEffect(() => {
    if (!hasLoadedQuickRef.current && state.dialogue) {
      setDialogue(state.dialogue);
      hasLoadedQuickRef.current = true;
    }
  }, [state.dialogue]);

  const handleAskAdvice = useCallback(async () => {
    if (isLoadingAdvice) return;
    setIsLoadingAdvice(true);
    // Haptic feedback on press
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const advice = await getAdvice(language as "en" | "zh");
      if (advice) {
        setDialogue(advice);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // If no advice returned, show a fallback message
        setDialogue(language === "zh" ? "我現在感覺還不錯！繼續保持健康飲食和運動吧！💪" : "I'm feeling good right now! Keep up the healthy eating and exercise! 💪");
      }
    } catch (err) {
      console.log("[CaringPanel] Advice error:", err);
      // Show fallback dialogue on error
      setDialogue(language === "zh" ? "嗯...我想想...繼續餵我吃健康的食物吧！🍎" : "Hmm... let me think... Keep feeding me healthy food! 🍎");
    } finally {
      setIsLoadingAdvice(false);
    }
  }, [getAdvice, language, isLoadingAdvice]);

  const overallInfo = getOverallInfo(state.overallStatus);

  // Battle modifier display
  const battleModText = state.battleModifiers.overallModifier > 1
    ? `+${Math.round((state.battleModifiers.overallModifier - 1) * 100)}%`
    : state.battleModifiers.overallModifier < 1
    ? `${Math.round((state.battleModifiers.overallModifier - 1) * 100)}%`
    : "";

  return (
    <View style={[caringStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={caringStyles.header}>
        <Text style={[caringStyles.headerTitle, { color: colors.foreground }]}>
          {t.caringStatus}
        </Text>
        <View style={[caringStyles.overallBadge, { backgroundColor: overallInfo.color + "20", borderColor: overallInfo.color }]}>
          <Text style={[caringStyles.overallBadgeText, { color: overallInfo.color }]}>
            {overallInfo.label}
          </Text>
        </View>
      </View>

      {/* Status Bars */}
      <StatusBar
        label={t.caringFullness}
        value={state.fullness}
        maxValue={100}
        color={getFullnessColor(state.fullness)}
        icon="🍖"
        statusText={getFullnessLabel(state.fullnessStatus)}
      />
      <StatusBar
        label={t.caringEnergy}
        value={state.energy}
        maxValue={100}
        color={getEnergyColor(state.energy)}
        icon="⚡"
        statusText={getEnergyLabel(state.energyStatus)}
      />
      <StatusBar
        label={t.caringMood}
        value={state.mood}
        maxValue={100}
        color={getMoodColor(state.mood)}
        icon="😊"
        statusText={getMoodLabel(state.moodStatus)}
      />

      {/* Battle Modifier Indicator */}
      {state.peakStateBuff && (
        <View style={[caringStyles.buffBanner, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
          <Text style={caringStyles.buffText}>🔥 {t.caringPeakBuff}</Text>
        </View>
      )}
      {!state.peakStateBuff && state.battleModifiers.overallModifier > 1 && (
        <View style={[caringStyles.buffBanner, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}>
          <Text style={[caringStyles.buffText, { color: "#16A34A" }]}>✨ {t.caringOptimalBuff}</Text>
        </View>
      )}
      {!state.battleModifiers.canBattle && (
        <View style={[caringStyles.buffBanner, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
          <Text style={[caringStyles.buffText, { color: "#EF4444" }]}>⚠️ {t.caringCantBattle}</Text>
        </View>
      )}

      {/* HP Effect Warning */}
      {state.hpEffect.hpChange < 0 && (
        <View style={[caringStyles.warningBanner, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
          <Text style={[caringStyles.warningText, { color: "#EF4444" }]}>
            ❤️‍🩹 {t.caringHpWarning} ({state.hpEffect.hpChange} HP)
          </Text>
        </View>
      )}
      {state.hpEffect.hpChange > 0 && (
        <View style={[caringStyles.warningBanner, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
          <Text style={[caringStyles.warningText, { color: "#22C55E" }]}>
            💚 {t.caringHpRecovery} (+{state.hpEffect.hpChange} HP)
          </Text>
        </View>
      )}

      {/* Streaks */}
      {(state.consecutiveBalancedDays > 0 || state.consecutiveExerciseDays > 0) && (
        <View style={caringStyles.streakRow}>
          {state.consecutiveBalancedDays > 0 && (
            <View style={[caringStyles.streakBadge, { backgroundColor: "#DCFCE7" }]}>
              <Text style={[caringStyles.streakText, { color: "#16A34A" }]}>
                🥗 {tr("caringStreak", { days: String(state.consecutiveBalancedDays) })}
              </Text>
            </View>
          )}
          {state.consecutiveExerciseDays > 0 && (
            <View style={[caringStyles.streakBadge, { backgroundColor: "#DBEAFE" }]}>
              <Text style={[caringStyles.streakText, { color: "#2563EB" }]}>
                🏋️ {tr("caringStreak", { days: String(state.consecutiveExerciseDays) })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Monster Dialogue */}
      {dialogue ? (
        <DialogueBubble text={dialogue} monsterName={monsterName} />
      ) : null}

      {/* Ask Advice Button */}
      <TouchableOpacity
        style={[caringStyles.adviceBtn, { backgroundColor: isLoadingAdvice ? colors.muted : "#8B5CF6" }]}
        onPress={handleAskAdvice}
        disabled={isLoadingAdvice}
      >
        {isLoadingAdvice ? (
          <View style={caringStyles.adviceBtnInner}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={caringStyles.adviceBtnText}>{t.caringNutritionAdvice}...</Text>
          </View>
        ) : (
          <View style={caringStyles.adviceBtnInner}>
            <Text style={caringStyles.adviceBtnIcon}>💬</Text>
            <Text style={caringStyles.adviceBtnText}>{t.caringAskAdvice}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const caringStyles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  overallBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  overallBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Status Bars
  statusBarContainer: {
    gap: 4,
  },
  statusBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBarIcon: {
    fontSize: 14,
  },
  statusBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  statusBarStatus: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBarValue: {
    fontSize: 11,
  },
  statusBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  statusBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Buff banners
  buffBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  buffText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },

  // Warning banners
  warningBanner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  warningText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Streaks
  streakRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  streakBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Dialogue
  dialogueBubble: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  dialogueText: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Advice button
  adviceBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  adviceBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adviceBtnIcon: {
    fontSize: 16,
  },
  adviceBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
