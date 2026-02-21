import { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { useAuth } from "@/hooks/use-auth";
import { markProfileCompleted, useProfileGate } from "@/components/auth-gate";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_DATA_KEY = "@fitmonster_profile_data";

export default function ProfileSetupScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { setProfileDone } = useProfileGate();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Load existing profile data if user already completed setup
  useEffect(() => {
    if (!user) return;
    const loadExisting = async () => {
      try {
        const key = `${PROFILE_DATA_KEY}_${user.openId || user.id}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.age) setAge(String(data.age));
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
    const ageNum = parseInt(age);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (!age || isNaN(ageNum) || ageNum < 18) {
      newErrors.age = t.ageMustBe18;
    } else if (ageNum > 99) {
      newErrors.age = t.ageMustBeUnder100;
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

    const ageNum = parseInt(age);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    const bmr = calculateBMR(gender!, weightNum, heightNum, ageNum);
    const dailyCalorieGoal = Math.round(bmr * 1.2);

    try {
      // Save to local storage (works for both local and OAuth users)
      const userKey = user ? (user.openId || String(user.id)) : "unknown";
      const profileData = {
        age: ageNum,
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

      // Mark profile as completed in auth gate (persist to AsyncStorage)
      await markProfileCompleted(userKey);
      // Signal AuthGate immediately so it won't redirect back
      setProfileDone();

      Alert.alert(
        t.profileCompleted,
        `${t.bmrResult} ${bmr} ${t.kcalPerDay}\n${t.dailyCalorieNeed}: ${dailyCalorieGoal} ${t.kcalPerDay}`,
        [{ text: t.ok, onPress: () => router.replace("/(tabs)") }]
      );
    } catch (error) {
      Alert.alert(t.error, String(error));
    } finally {
      setSaving(false);
    }
  };

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
            {/* Age */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t.age}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.foreground,
                    borderColor: errors.age ? colors.error : colors.border,
                  },
                ]}
                value={age}
                onChangeText={(v) => {
                  setAge(v.replace(/[^0-9]/g, ""));
                  setErrors((e) => ({ ...e, age: "" }));
                }}
                placeholder="25"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
              />
              {errors.age ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.age}
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
