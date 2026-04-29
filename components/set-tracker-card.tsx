import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import type { SetType, WorkoutSetData } from "@/types/workout";
import { SET_TYPE_LABELS } from "@/types/workout";

interface SetTrackerCardProps {
  exerciseName: string;
  setNumber: number;
  lastSessionSet?: WorkoutSetData;
  onComplete: (data: WorkoutSetData) => void;
  onRemove?: () => void;
}

export function SetTrackerCard({
  exerciseName,
  setNumber,
  lastSessionSet,
  onComplete,
  onRemove,
}: SetTrackerCardProps) {
  const colors = useColors();
  const [weight, setWeight] = useState(
    lastSessionSet?.weight?.toString() ?? ""
  );
  const [reps, setReps] = useState(lastSessionSet?.reps?.toString() ?? "");
  const [setType, setSetType] = useState<SetType>(
    lastSessionSet?.setType ?? "working"
  );
  const [rpe, setRpe] = useState("");
  const [completed, setCompleted] = useState(false);

  const handleComplete = useCallback(() => {
    if (!weight && !reps) return;
    const data: WorkoutSetData = {
      setNumber,
      setType,
      weight: weight ? parseFloat(weight) : undefined,
      reps: reps ? parseInt(reps, 10) : undefined,
      rpe: rpe ? parseFloat(rpe) : undefined,
      isPR: false,
    };
    setCompleted(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onComplete(data);
  }, [weight, reps, setType, rpe, setNumber, onComplete]);

  const typeColor = SET_TYPE_LABELS[setType]?.color ?? colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: completed ? colors.surface : colors.background,
          borderColor: completed ? "#22C55E" : colors.border,
          opacity: completed ? 0.8 : 1,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.setNumberBadge, { backgroundColor: typeColor + "20" }]}>
          <Text style={[styles.setNumberText, { color: typeColor }]}>
            {setNumber}
          </Text>
        </View>

        {/* Set type selector */}
        <View style={styles.typeRow}>
          {(Object.keys(SET_TYPE_LABELS) as SetType[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                if (!completed) setSetType(t);
              }}
              style={[
                styles.typePill,
                {
                  backgroundColor:
                    setType === t
                      ? SET_TYPE_LABELS[t].color + "20"
                      : "transparent",
                  borderColor:
                    setType === t ? SET_TYPE_LABELS[t].color : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typePillText,
                  {
                    color:
                      setType === t ? SET_TYPE_LABELS[t].color : colors.muted,
                  },
                ]}
              >
                {SET_TYPE_LABELS[t].zh}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {onRemove && !completed && (
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
            <Text style={{ color: "#EF4444", fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Input row */}
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.muted }]}>
            重量 (kg)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={lastSessionSet?.weight?.toString() ?? "0"}
            placeholderTextColor={colors.muted}
            editable={!completed}
            returnKeyType="done"
          />
        </View>

        <Text style={[styles.separator, { color: colors.muted }]}>×</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.muted }]}>次數</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder={lastSessionSet?.reps?.toString() ?? "0"}
            placeholderTextColor={colors.muted}
            editable={!completed}
            returnKeyType="done"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.muted }]}>RPE</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            value={rpe}
            onChangeText={setRpe}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={colors.muted}
            editable={!completed}
            returnKeyType="done"
          />
        </View>

        {!completed ? (
          <TouchableOpacity
            onPress={handleComplete}
            style={[styles.completeBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <Text style={styles.completeBtnText}>✓</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.completedIcon]}>
            <Text style={{ fontSize: 20, color: "#22C55E" }}>✓</Text>
          </View>
        )}
      </View>

      {/* Last session hint */}
      {lastSessionSet && !completed && (
        <Text style={[styles.lastHint, { color: colors.muted }]}>
          上次: {lastSessionSet.weight ?? 0}kg × {lastSessionSet.reps ?? 0}
        </Text>
      )}
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
    gap: 8,
  },
  setNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: "700",
  },
  typeRow: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
    flexWrap: "wrap",
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  removeBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputGroup: {
    flex: 1,
    gap: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  input: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  separator: {
    fontSize: 18,
    fontWeight: "600",
    paddingBottom: 8,
  },
  completeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  completedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
  },
  lastHint: {
    fontSize: 11,
    fontStyle: "italic",
  },
});
