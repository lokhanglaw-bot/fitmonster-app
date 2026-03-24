import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n-context";
import { getApiBaseUrl } from "@/constants/oauth";

/**
 * Deep link screen for password reset.
 * Opened via: {scheme}://reset-password?token=xxxx
 * Or via web: https://fitmonster.app/reset-password?token=xxxx
 *
 * The user arrives here after tapping the "Reset Password" link in their email.
 * They enter a new password, which is submitted along with the token.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(params.token ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (params.token) {
      setToken(params.token);
    }
  }, [params.token]);

  const handleReset = async () => {
    if (!token.trim()) {
      Alert.alert(t.error || "Error", "Missing reset token. Please use the link from your email.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(t.error || "Error", t.passwordTooShort || "Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t.error || "Error", t.passwordsDoNotMatch || "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/trpc/auth.resetPassword?batch=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "0": { json: { token: token.trim(), newPassword } } }),
      });
      const data = await res.json();
      const result = data?.[0]?.result?.data?.json;
      if (result?.success) {
        setSuccess(true);
      } else {
        const errMsg = data?.[0]?.error?.json?.message || "";
        if (errMsg.includes("INVALID_OR_EXPIRED_TOKEN")) {
          Alert.alert(
            t.error || "Error",
            t.invalidToken || "Invalid or expired reset code. Please request a new one."
          );
        } else {
          Alert.alert(t.error || "Error", t.authFailed || "Something went wrong.");
        }
      }
    } catch (err) {
      Alert.alert(t.error || "Error", t.authFailed || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.replace("/auth");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {success ? (
          <View style={styles.successContainer}>
            <View style={[styles.successCircle, { backgroundColor: "#DCFCE7" }]}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground, marginTop: 16 }]}>
              {t.passwordResetSuccess || "Password Reset!"}
            </Text>
            <Text style={[styles.desc, { color: colors.muted, textAlign: "center" }]}>
              {t.passwordResetSuccessDesc || "Your password has been updated successfully. You can now sign in with your new password."}
            </Text>
            <TouchableOpacity onPress={goToLogin} activeOpacity={0.8} style={{ width: "100%", marginTop: 24 }}>
              <LinearGradient
                colors={["#22C55E", "#16A34A"] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                <Text style={styles.submitText}>{t.backToSignIn || "Back to Sign In"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerIcon}>🔒</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {t.setNewPassword || "Set New Password"}
              </Text>
              <Text style={[styles.desc, { color: colors.muted }]}>
                Enter your new password below.
              </Text>
            </View>

            {/* Token field (pre-filled from deep link, but editable as fallback) */}
            {!params.token && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Reset Token</Text>
                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="Paste your reset token"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t.newPasswordLabel || "New Password"}
              </Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                {t.confirmNewPasswordLabel || "Confirm New Password"}
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleReset}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              />
            </View>

            <TouchableOpacity onPress={handleReset} activeOpacity={0.8} disabled={loading}>
              <LinearGradient
                colors={["#22C55E", "#16A34A"] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t.resetPassword || "Reset Password"}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={goToLogin} style={styles.backBtn}>
              <Text style={[styles.backText, { color: colors.primary }]}>
                {t.backToSignIn || "Back to Sign In"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  desc: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  submitBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    fontSize: 40,
  },
});
