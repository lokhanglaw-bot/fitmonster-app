import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { REST_TIMER_PRESETS } from "@/types/workout";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface RestTimerSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onTimerComplete?: () => void;
  defaultSeconds?: number;
}

export function RestTimerSheet({
  visible,
  onDismiss,
  onTimerComplete,
  defaultSeconds = 90,
}: RestTimerSheetProps) {
  const colors = useColors();
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setTotalSeconds(defaultSeconds);
      setRemaining(defaultSeconds);
      setIsRunning(true);
    } else {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [visible, defaultSeconds]);

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }
            onTimerComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, remaining, onTimerComplete]);

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;

  const handlePreset = useCallback(
    (seconds: number) => {
      setTotalSeconds(seconds);
      setRemaining(seconds);
      setIsRunning(true);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    []
  );

  const handleAddTime = useCallback((delta: number) => {
    setRemaining((prev) => Math.max(0, prev + delta));
    setTotalSeconds((prev) => Math.max(0, prev + delta));
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            ⏱️ 休息計時器
          </Text>

          {/* Timer display */}
          <View style={styles.timerContainer}>
            <View
              style={[
                styles.timerCircle,
                { borderColor: remaining === 0 ? "#22C55E" : colors.primary },
              ]}
            >
              {/* Progress ring (simplified with border) */}
              <Text
                style={[
                  styles.timerText,
                  {
                    color:
                      remaining === 0 ? "#22C55E" : remaining <= 5 ? "#EF4444" : colors.foreground,
                  },
                ]}
              >
                {remaining === 0 ? "GO!" : formatTime(remaining)}
              </Text>
              {remaining > 0 && (
                <Text style={[styles.timerSubtext, { color: colors.muted }]}>
                  {Math.round(progress * 100)}%
                </Text>
              )}
            </View>
          </View>

          {/* +/- buttons */}
          <View style={styles.adjustRow}>
            <TouchableOpacity
              onPress={() => handleAddTime(-15)}
              style={[styles.adjustBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.adjustBtnText, { color: colors.foreground }]}>-15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (isRunning) {
                  setIsRunning(false);
                } else if (remaining > 0) {
                  setIsRunning(true);
                }
              }}
              style={[
                styles.pauseBtn,
                { backgroundColor: isRunning ? "#FEF3C7" : "#DCFCE7" },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 20,
                  color: isRunning ? "#92400E" : "#166534",
                }}
              >
                {isRunning ? "⏸" : "▶️"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAddTime(15)}
              style={[styles.adjustBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.adjustBtnText, { color: colors.foreground }]}>+15s</Text>
            </TouchableOpacity>
          </View>

          {/* Presets */}
          <View style={styles.presetsRow}>
            {Object.entries(REST_TIMER_PRESETS)
              .filter(([k]) => k !== "custom")
              .map(([key, preset]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => handlePreset(preset.seconds)}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor:
                        totalSeconds === preset.seconds
                          ? colors.primary + "20"
                          : colors.surface,
                      borderColor:
                        totalSeconds === preset.seconds
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetText,
                      {
                        color:
                          totalSeconds === preset.seconds
                            ? colors.primary
                            : colors.foreground,
                      },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Skip button */}
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.skipBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipBtnText, { color: colors.muted }]}>
              跳過休息
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  timerContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  timerCircle: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.2,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 36,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  timerSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  adjustRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  adjustBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  adjustBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pauseBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  presetsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: "600",
  },
  skipBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
