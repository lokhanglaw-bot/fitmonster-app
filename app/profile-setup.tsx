import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { useAuth } from "@/hooks/use-auth";
import { markProfileCompleted, useProfileGate } from "@/components/auth-gate";
import { PROFILE_DATA_KEY, calculateAgeFromBirthday } from "@/hooks/use-profile-data";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";
import * as AuthModule from "@/lib/_core/auth";

/**
 * Simple date picker using 3 scroll wheels (year, month, day).
 * Works on both iOS and Android without native DateTimePicker dependency.
 */
function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDate,
  colors,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  initialDate?: string;
  colors: any;
  t: any;
}) {
  const now = new Date();
  const minYear = now.getFullYear() - 99;
  const maxYear = now.getFullYear() - 18;

  const [year, setYear] = useState(() => {
    if (initialDate) return parseInt(initialDate.split("-")[0]);
    return maxYear - 7; // default ~25 years old
  });
  const [month, setMonth] = useState(() => {
    if (initialDate) return parseInt(initialDate.split("-")[1]);
    return 1;
  });
  const [day, setDay] = useState(() => {
    if (initialDate) return parseInt(initialDate.split("-")[2]);
    return 1;
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const effectiveDay = Math.min(day, daysInMonth);

  const handleConfirm = () => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(effectiveDay).padStart(2, "0")}`;
    onSelect(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pickerStyles.overlay}>
        <View style={[pickerStyles.container, { backgroundColor: colors.surface }]}>
          <View style={pickerStyles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={[pickerStyles.headerBtn, { color: colors.muted }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <Text style={[pickerStyles.headerTitle, { color: colors.foreground }]}>{t.birthday}</Text>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
              <Text style={[pickerStyles.headerBtn, { color: colors.primary }]}>{t.confirm}</Text>
            </TouchableOpacity>
          </View>

          <View style={pickerStyles.wheelRow}>
            {/* Year */}
            <View style={pickerStyles.wheelCol}>
              <Text style={[pickerStyles.wheelLabel, { color: colors.muted }]}>{t.year}</Text>
              <ScrollView style={pickerStyles.wheel} showsVerticalScrollIndicator={false}>
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[pickerStyles.wheelItem, y === year && { backgroundColor: colors.primary + "20" }]}
                    onPress={() => setYear(y)}
                    activeOpacity={0.7}
                  >
                    <Text style={[pickerStyles.wheelText, { color: y === year ? colors.primary : colors.foreground }]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month */}
            <View style={pickerStyles.wheelCol}>
              <Text style={[pickerStyles.wheelLabel, { color: colors.muted }]}>{t.month}</Text>
              <ScrollView style={pickerStyles.wheel} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[pickerStyles.wheelItem, m === month && { backgroundColor: colors.primary + "20" }]}
                    onPress={() => setMonth(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[pickerStyles.wheelText, { color: m === month ? colors.primary : colors.foreground }]}>
                      {String(m).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day */}
            <View style={pickerStyles.wheelCol}>
              <Text style={[pickerStyles.wheelLabel, { color: colors.muted }]}>{t.day}</Text>
              <ScrollView style={pickerStyles.wheel} showsVerticalScrollIndicator={false}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[pickerStyles.wheelItem, d === effectiveDay && { backgroundColor: colors.primary + "20" }]}
                    onPress={() => setDay(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[pickerStyles.wheelText, { color: d === effectiveDay ? colors.primary : colors.foreground }]}>
                      {String(d).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={[pickerStyles.preview, { backgroundColor: colors.background }]}>
            <Text style={[pickerStyles.previewText, { color: colors.foreground }]}>
              {year}-{String(month).padStart(2, "0")}-{String(effectiveDay).padStart(2, "0")}
            </Text>
            <Text style={[pickerStyles.previewAge, { color: colors.muted }]}>
              {t.age}: {calculateAgeFromBirthday(`${year}-${String(month).padStart(2, "0")}-${String(effectiveDay).padStart(2, "0")}`)}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileSetupScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { setProfileDone } = useProfileGate();

  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load existing profile data if user already completed setup
  useEffect(() => {
    if (!user) return;
    const loadExisting = async () => {
      try {
        const key = `${PROFILE_DATA_KEY}_${user.openId || user.id}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.birthday) setBirthday(data.birthday);
          if (data.gender) setGender(data.gender);
          if (data.height) setHeight(String(data.height));
          if (data.weight) setWeight(String(data.weight));
        }
      } catch {
        // ignore
      }
    };
    loadExisting();
  }, [user]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (!birthday) {
      newErrors.birthday = t.pleaseSelectBirthday;
    } else {
      const age = calculateAgeFromBirthday(birthday);
      if (age < 18) {
        newErrors.birthday = t.ageMustBe18;
      } else if (age > 99) {
        newErrors.birthday = t.ageMustBeUnder100;
      }
    }

    if (!gender) {
      newErrors.gender = t.pleaseSelectGender;
    }

    if (!height || isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      newErrors.height = t.heightMustBe100;
    }

    if (!weight || isNaN(weightNum) || weightNum < 30 || weightNum > 200) {
      newErrors.weight = t.weightMustBe30;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateBMR = (
    g: "male" | "female",
    w: number,
    h: number,
    a: number
  ): number => {
    if (g === "male") {
      return Math.round(88.362 + 13.397 * w + 4.799 * h - 5.677 * a);
    } else {
      return Math.round(447.593 + 9.247 * w + 3.098 * h - 4.33 * a);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const age = calculateAgeFromBirthday(birthday);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    const bmr = calculateBMR(gender!, weightNum, heightNum, age);
    const dailyCalorieGoal = Math.round(bmr * 1.2);

    try {
      // Save to local storage (works for both local and OAuth users)
      const userKey = user ? (user.openId || String(user.id)) : "unknown";
      const profileData = {
        age,
        birthday,
        gender: gender!,
        height: heightNum,
        weight: weightNum,
        bmr,
        dailyCalorieGoal,
        profileCompleted: true,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        `${PROFILE_DATA_KEY}_${userKey}`,
        JSON.stringify(profileData)
      );

      // Sync profile to backend DB (for social features)
      try {
        const apiBase = getApiBaseUrl();
        if (apiBase) {
          const hdrs: Record<string, string> = { "Content-Type": "application/json" };
          if (Platform.OS !== "web") {
            const tok = await AuthModule.getSessionToken();
            if (tok) hdrs["Authorization"] = `Bearer ${tok}`;
          }
          await fetch(`${apiBase}/api/trpc/profile.setupProfile?batch=1`, {
            method: "POST",
            headers: hdrs,
            credentials: "include",
            body: JSON.stringify({
              "0": {
                json: {
                  birthday,
                  gender: gender!,
                  height: heightNum,
                  weight: weightNum,
                },
              },
            }),
          });
          console.log("[ProfileSetup] Profile synced to backend");
        }
      } catch (syncErr) {
        console.log("[ProfileSetup] Backend sync failed (non-critical):", syncErr);
      }

      // Mark profile as completed in auth gate (persist to AsyncStorage)
      await markProfileCompleted(userKey);
      // Signal AuthGate immediately so it won't redirect back
      setProfileDone();

      Alert.alert(
        t.profileCompleted,
        `${t.bmrResult} ${bmr} ${t.kcalPerDay}\n${t.dailyCalorieNeed}: ${dailyCalorieGoal} ${t.kcalPerDay}`,
        [{
          text: t.ok,
          onPress: () => {
            // Use dismissAll first to close any modal stack, then navigate
            try {
              if (router.canDismiss()) {
                router.dismissAll();
              }
            } catch {
              // ignore dismiss errors
            }
            // Small delay to let modal dismiss complete, then navigate
            setTimeout(() => {
              router.replace("/(tabs)");
            }, 100);
          },
        }]
      );
    } catch (error) {
      Alert.alert(t.error, String(error));
    } finally {
      setSaving(false);
    }
  };

  const displayAge = birthday ? calculateAgeFromBirthday(birthday) : null;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Monster illustration */}
          <View style={styles.illustrationContainer}>
            <Text style={styles.monsterEmoji}>🐾</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t.profileSetup}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {t.profileSetupSubtitle}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Birthday */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t.birthday}
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dateInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: errors.birthday ? colors.error : colors.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateText,
                    { color: birthday ? colors.foreground : colors.muted },
                  ]}
                >
                  {birthday || t.selectBirthday}
                </Text>
                {displayAge !== null && (
                  <View style={[styles.ageBadge, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.ageBadgeText, { color: colors.primary }]}>
                      {displayAge} {t.yearsOld}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {errors.birthday ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.birthday}
                </Text>
              ) : null}
            </View>

            {/* Gender */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t.gender}
              </Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    {
                      backgroundColor:
                        gender === "male" ? colors.primary : colors.surface,
                      borderColor:
                        gender === "male"
                          ? colors.primary
                          : errors.gender
                          ? colors.error
                          : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setGender("male");
                    setErrors((e) => ({ ...e, gender: "" }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.genderIcon}>♂</Text>
                  <Text
                    style={[
                      styles.genderText,
                      {
                        color:
                          gender === "male" ? "#fff" : colors.foreground,
                      },
                    ]}
                  >
                    {t.male}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    {
                      backgroundColor:
                        gender === "female" ? "#E91E63" : colors.surface,
                      borderColor:
                        gender === "female"
                          ? "#E91E63"
                          : errors.gender
                          ? colors.error
                          : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setGender("female");
                    setErrors((e) => ({ ...e, gender: "" }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.genderIcon}>♀</Text>
                  <Text
                    style={[
                      styles.genderText,
                      {
                        color:
                          gender === "female" ? "#fff" : colors.foreground,
                      },
                    ]}
                  >
                    {t.female}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.gender ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.gender}
                </Text>
              ) : null}
            </View>

            {/* Height */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t.height}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: errors.height ? colors.error : colors.border,
                  },
                ]}
                value={height}
                onChangeText={(v) => {
                  setHeight(v.replace(/[^0-9.]/g, ""));
                  setErrors((e) => ({ ...e, height: "" }));
                }}
                placeholder="170"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                maxLength={5}
                returnKeyType="done"
              />
              {errors.height ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.height}
                </Text>
              ) : null}
            </View>

            {/* Weight */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t.weight}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: errors.weight ? colors.error : colors.border,
                  },
                ]}
                value={weight}
                onChangeText={(v) => {
                  setWeight(v.replace(/[^0-9.]/g, ""));
                  setErrors((e) => ({ ...e, weight: "" }));
                }}
                placeholder="65"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                maxLength={5}
                returnKeyType="done"
              />
              {errors.weight ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.weight}
                </Text>
              ) : null}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {t.calculateAndSave}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => {
          setBirthday(date);
          setErrors((e) => ({ ...e, birthday: "" }));
        }}
        initialDate={birthday || undefined}
        colors={colors}
        t={t}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  illustrationContainer: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },
  monsterEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formContainer: {
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 17,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 17,
  },
  ageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ageBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  genderIcon: {
    fontSize: 22,
  },
  genderText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerBtn: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  wheelRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  wheelCol: {
    flex: 1,
    alignItems: "center",
  },
  wheelLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  wheel: {
    height: 180,
  },
  wheelItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 1,
    alignItems: "center",
  },
  wheelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  preview: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewText: {
    fontSize: 18,
    fontWeight: "700",
  },
  previewAge: {
    fontSize: 15,
  },
});
