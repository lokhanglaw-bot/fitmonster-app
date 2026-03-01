import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Modal,
  Linking,
  Platform,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/lib/auth-helpers";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, type Language } from "@/lib/i18n-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
// Share uses react-native Share API for native, Web Share API for web

type AuthMode = "signin" | "signup" | "forgot";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [trainerName, setTrainerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const { localLogin, localSignup } = useAuth({ autoFetch: false });
  const { t, language, setLanguage } = useI18n();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en");
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert(t.error || "Error", t.pleaseFillAllFields || "Please fill in all fields");
      return;
    }
    if (mode === "signup") {
      if (!trainerName.trim()) {
        Alert.alert(t.error || "Error", t.pleaseEnterTrainerName || "Please enter your trainer name");
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t.error || "Error", t.passwordsDoNotMatch || "Passwords do not match");
        return;
      }
      if (password.length < 6) {
        Alert.alert(t.error || "Error", t.passwordTooShort || "Password must be at least 6 characters");
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await localSignup(trainerName.trim(), email.trim(), password);
      } else {
        await localLogin(email.trim(), password);
      }
      // Auth state is now set, AuthGate will redirect to home
      router.replace("/(tabs)");
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("INVALID_CREDENTIALS")) {
        Alert.alert(
          t.error || "Error",
          t.invalidCredentials || "Incorrect email or password. Please try again."
        );
      } else if (msg.includes("EMAIL_EXISTS")) {
        Alert.alert(
          t.error || "Error",
          t.emailAlreadyExists || "This email is already registered. Please sign in instead."
        );
      } else {
        Alert.alert(t.error || "Error", t.authFailed || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      await startOAuthLogin();
    } catch (error) {
      Alert.alert(t.error || "Error", `${provider} ${t.loginFailed || "login failed. Please try again."}`);
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!forgotEmail.trim()) {
      Alert.alert(t.error || "Error", t.pleaseEnterEmail || "Please enter your email address");
      return;
    }
    // Simulate sending reset email
    setForgotSent(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail("");
    setForgotSent(false);
  };

  const isSignUp = mode === "signup";

  const SHARE_MESSAGE = t.shareMessage || "Join me on FitMonster! Raise your fitness monster and get healthy together \uD83D\uDCAA\uD83D\uDC7E";
  const APP_URL = "https://fitmonster.app";

  const handleShareGeneric = async () => {
    try {
      if (Platform.OS === "web") {
        // Use Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: "FitMonster",
            text: SHARE_MESSAGE,
            url: APP_URL,
          });
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(`${SHARE_MESSAGE} ${APP_URL}`);
          Alert.alert(t.copied || "Copied!", t.shareLinkCopied || "Share link copied to clipboard");
        }
      } else {
        await Share.share({
          message: `${SHARE_MESSAGE} ${APP_URL}`,
          title: "FitMonster",
          url: APP_URL,
        });
      }
    } catch (error) {
      // User cancelled or share failed silently
    }
  };

  const handleShareToTwitter = () => {
    const text = encodeURIComponent(SHARE_MESSAGE);
    const url = encodeURIComponent(APP_URL);
    Linking.openURL(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
  };

  const handleShareToFacebook = () => {
    const url = encodeURIComponent(APP_URL);
    Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
  };

  const handleShareToWhatsApp = () => {
    const text = encodeURIComponent(`${SHARE_MESSAGE} ${APP_URL}`);
    Linking.openURL(`https://wa.me/?text=${text}`);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Language Toggle */}
          <TouchableOpacity
            onPress={toggleLanguage}
            style={styles.langToggle}
            activeOpacity={0.7}
          >
            <MaterialIcons name="language" size={18} color="#687076" />
            <Text style={styles.langToggleText}>
              {language === "en" ? "中文" : "EN"}
            </Text>
          </TouchableOpacity>

          {/* Logo & Branding */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
            <Text style={[styles.appName, { color: colors.primary }]}>FitMonster</Text>
            <Text style={[styles.tagline, { color: colors.muted }]}>
              {t.raiseYourMonster}
            </Text>
          </View>

          {/* Auth Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Card Title */}
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitleIcon}>✨</Text>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {isSignUp ? t.signUp : t.signIn}
              </Text>
            </View>

            {/* Social Login Buttons */}
            <TouchableOpacity
              onPress={() => handleSocialLogin("google")}
              disabled={loading}
              style={[styles.socialBtn, { borderColor: colors.border, opacity: loading ? 0.5 : 1 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={[styles.socialBtnText, { color: colors.foreground }]}>
                {t.continueWithGoogle}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSocialLogin("apple")}
              disabled={loading}
              style={[styles.socialBtn, { borderColor: colors.border, opacity: loading ? 0.5 : 1 }]}
              activeOpacity={0.7}
            >
              <FontAwesome name="apple" size={20} color="#000" />
              <Text style={[styles.socialBtnText, { color: colors.foreground }]}>
                {t.continueWithApple}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>{t.orContinueWith}</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Trainer Name (Sign Up only) */}
            {isSignUp && (
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelIcon}>👤</Text>
                  <Text style={[styles.label, { color: colors.foreground }]}>{t.trainerName}</Text>
                </View>
                <TextInput
                  value={trainerName}
                  onChangeText={setTrainerName}
                  placeholder={t.enterTrainerName || "Enter your trainer name"}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  editable={!loading}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelIcon}>✉️</Text>
                <Text style={[styles.label, { color: colors.foreground }]}>{t.email}</Text>
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t.emailPlaceholder || "your@email.com"}
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelIcon}>🔒</Text>
                  <Text style={[styles.label, { color: colors.foreground }]}>{t.password}</Text>
                </View>
                {!isSignUp && (
                  <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                    <Text style={[styles.forgotText, { color: colors.primary }]}>{t.forgotPassword}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t.enterPassword || "Enter password"}
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                editable={!loading}
              />
            </View>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelIcon}>🔒</Text>
                  <Text style={[styles.label, { color: colors.foreground }]}>{t.confirmPassword}</Text>
                </View>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t.confirmYourPassword || "Confirm your password"}
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  editable={!loading}
                />
              </View>
            )}

            {/* Submit Button - Gradient */}
            <TouchableOpacity
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.8}
              style={{ opacity: loading ? 0.6 : 1, marginTop: 8 }}
            >
              <LinearGradient
                colors={["#22C55E", "#16A34A"] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitText}>{isSignUp ? t.signUp : t.signIn}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Toggle Sign In / Sign Up */}
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: colors.muted }]}>
                {isSignUp ? t.alreadyHaveAccount : t.dontHaveAccount}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setMode(isSignUp ? "signin" : "signup");
                  setPassword("");
                  setConfirmPassword("");
                }}
                disabled={loading}
              >
                <Text style={[styles.toggleLink, { color: colors.primary }]}>
                  {isSignUp ? t.signIn : t.signUpNow}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Social Sharing Section */}
          <View style={styles.shareSection}>
            <Text style={[styles.shareTitle, { color: colors.muted }]}>{t.shareFitMonster}</Text>
            <View style={styles.shareRow}>
              <TouchableOpacity
                onPress={handleShareToTwitter}
                style={[styles.shareBtn, { backgroundColor: "#1DA1F2" }]}
                activeOpacity={0.7}
              >
                <Text style={styles.shareBtnIcon}>𝕏</Text>
                <Text style={styles.shareBtnLabel}>{t.twitter || "Twitter"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareToFacebook}
                style={[styles.shareBtn, { backgroundColor: "#1877F2" }]}
                activeOpacity={0.7}
              >
                <Text style={styles.shareBtnIcon}>f</Text>
                <Text style={styles.shareBtnLabel}>{t.facebook || "Facebook"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareToWhatsApp}
                style={[styles.shareBtn, { backgroundColor: "#25D366" }]}
                activeOpacity={0.7}
              >
                <Text style={styles.shareBtnIcon}>💬</Text>
                <Text style={styles.shareBtnLabel}>{t.whatsapp || "WhatsApp"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareGeneric}
                style={[styles.shareBtn, { backgroundColor: colors.muted }]}
                activeOpacity={0.7}
              >
                <Text style={styles.shareBtnIcon}>↗</Text>
                <Text style={styles.shareBtnLabel}>{t.more || "More"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms */}
          <Text style={[styles.terms, { color: colors.muted }]}>
            {t.termsPrefix}{" "}
            <Text style={{ fontWeight: "600" }}>{t.termsOfService}</Text> {t.and}{" "}
            <Text style={{ fontWeight: "600" }}>{t.privacyPolicy}</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {!forgotSent ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>🔑</Text>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.resetPassword}</Text>
                </View>
                <Text style={[styles.modalDesc, { color: colors.muted }]}>
                  {t.resetPasswordDesc}
                </Text>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.labelIcon}>✉️</Text>
                    <Text style={[styles.label, { color: colors.foreground }]}>{t.emailAddress}</Text>
                  </View>
                  <TextInput
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  />
                </View>

                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#22C55E", "#16A34A"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    <Text style={styles.submitText}>{t.sendResetLink}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={closeForgotModal}
                >
                  <Text style={[styles.cancelText, { color: colors.muted }]}>{t.cancel}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successContainer}>
                  <View style={[styles.successCircle, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={styles.successIcon}>✅</Text>
                  </View>
                  <Text style={[styles.modalTitle, { color: colors.foreground, marginTop: 16 }]}>
                    {t.checkYourEmail}
                  </Text>
                  <Text style={[styles.modalDesc, { color: colors.muted, textAlign: "center" }]}>
                    {t.resetLinkSent}{"\n"}
                    <Text style={{ fontWeight: "700", color: colors.foreground }}>{forgotEmail}</Text>
                    {"\n\n"}{t.checkInboxInstructions}
                  </Text>
                </View>

                <TouchableOpacity onPress={closeForgotModal} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#22C55E", "#16A34A"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    <Text style={styles.submitText}>{t.backToSignIn}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingVertical: 40,
  },

  // Logo
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    marginTop: 6,
  },

  // Card
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  cardTitleIcon: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
  },

  // Social buttons
  socialBtn: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4285F4",
  },
  appleIcon: {
    fontSize: 20,
    color: "#000",
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  labelIcon: {
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
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
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Submit
  submitBtn: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Share section
  shareSection: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    marginTop: 28,
  },
  shareTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 14,
  },
  shareRow: {
    flexDirection: "row",
    gap: 10,
  },
  shareBtn: {
    width: 72,
    height: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  shareBtnIcon: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "800",
  },
  shareBtnLabel: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },

  // Terms
  terms: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
    maxWidth: 340,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    gap: 16,
  },
  modalHeader: {
    alignItems: "center",
    gap: 10,
  },
  modalIcon: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 22,
  },
  cancelBtn: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Success state
  successContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    fontSize: 36,
  },

  // Language toggle
  langToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginBottom: 8,
  },
  langToggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#687076",
  },
});
