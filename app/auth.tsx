import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/lib/auth-helpers";
import { Image } from "expo-image";
import { useColors } from "@/hooks/use-colors";

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [trainerName, setTrainerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colors = useColors();

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (isSignUp && !trainerName) {
      Alert.alert("Error", "Please enter your trainer name");
      return;
    }
    setLoading(true);
    try {
      Alert.alert("Coming Soon", "Email authentication will be available soon. Please use Google or Apple sign-in for now.");
    } catch (error) {
      Alert.alert("Error", "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      await startOAuthLogin();
    } catch (error) {
      Alert.alert("Error", `${provider} login failed`);
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>FitMonster</Text>
            <Text style={[styles.tagline, { color: colors.muted }]}>Raise your fitness monster</Text>
          </View>

          {/* Auth Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>

            {/* Social Login */}
            <TouchableOpacity
              onPress={() => handleSocialLogin("google")}
              disabled={loading}
              style={[styles.socialBtn, { backgroundColor: "#fff", opacity: loading ? 0.5 : 1 }]}
              activeOpacity={0.8}
            >
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSocialLogin("apple")}
              disabled={loading}
              style={[styles.socialBtn, { backgroundColor: "#000", opacity: loading ? 0.5 : 1 }]}
              activeOpacity={0.8}
            >
              <Text style={styles.appleText}>Continue with Apple</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>Or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Trainer Name (Sign Up only) */}
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Trainer Name</Text>
                <TextInput
                  value={trainerName}
                  onChangeText={setTrainerName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  editable={!loading}
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
                {!isSignUp && (
                  <TouchableOpacity>
                    <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                editable={!loading}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleEmailAuth}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.5 : 1 }]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitText}>{isSignUp ? "Sign Up" : "Sign In"}</Text>
              )}
            </TouchableOpacity>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: colors.muted }]}>
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} disabled={loading}>
                <Text style={[styles.toggleLink, { color: colors.primary }]}>
                  {isSignUp ? "Sign in" : "Sign up now"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.terms, { color: colors.muted }]}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
  },
  tagline: {
    fontSize: 15,
    marginTop: 4,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  socialBtn: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  googleText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
  },
  appleText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  toggleText: {
    fontSize: 14,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  terms: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 16,
  },
});
