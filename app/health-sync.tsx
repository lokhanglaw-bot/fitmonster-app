import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useI18n } from "@/lib/i18n-context";
import { useActivity } from "@/lib/activity-context";
import { useAuthContext } from "@/lib/auth-context";
import {
  getHealthService,
  loadHealthPreferences,
  saveHealthPreferences,
  stepsToExp,
  stepsToCalories,
  type HealthSyncPreferences,
  type HealthSyncResult,
  type HealthWorkoutSession,
  type WorkoutType,
} from "@/lib/health-service";

const WORKOUT_ICONS: Record<WorkoutType, string> = {
  running: "🏃",
  walking: "🚶",
  cycling: "🚴",
  swimming: "🏊",
  weight_training: "🏋️",
  yoga: "🧘",
  hiit: "⚡",
  basketball: "🏀",
  other: "💪",
};

const WORKOUT_LABELS: Record<WorkoutType, string> = {
  running: "Running",
  walking: "Walking",
  cycling: "Cycling",
  swimming: "Swimming",
  weight_training: "Weight Training",
  yoga: "Yoga",
  hiit: "HIIT",
  basketball: "Basketball",
  other: "Other",
};

export default function HealthSyncScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tr } = useI18n();
  const { user } = useAuthContext();
  const { syncHealthData } = useActivity();

  const healthService = useRef(getHealthService()).current;
  const userId = user ? String(user.id) : "guest";

  const [prefs, setPrefs] = useState<HealthSyncPreferences>({
    enabled: false,
    platform: healthService.getPlatform(),
    permissionStatus: "not_determined",
    lastSyncTime: null,
    autoSyncOnLaunch: true,
    syncIntervalHours: 24,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<HealthSyncResult | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<HealthWorkoutSession[]>([]);

  // Load preferences
  useEffect(() => {
    loadHealthPreferences(userId).then((loaded) => {
      setPrefs((prev) => ({ ...prev, ...loaded, platform: healthService.getPlatform() }));
    });
  }, [userId]);

  const savePrefs = useCallback(
    async (updated: HealthSyncPreferences) => {
      setPrefs(updated);
      await saveHealthPreferences(userId, updated);
    },
    [userId]
  );

  const getPlatformLabel = () => {
    switch (prefs.platform) {
      case "apple_healthkit": return t.healthPlatformApple;
      case "health_connect": return t.healthPlatformGoogle;
      case "simulation": return t.healthPlatformSimulation;
      default: return t.healthDisconnected;
    }
  };

  const getPlatformIcon = () => {
    switch (prefs.platform) {
      case "apple_healthkit": return "❤️";
      case "health_connect": return "💚";
      case "simulation": return "🔬";
      default: return "📱";
    }
  };

  // ── Connect / Authorize ──────────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Show permission modal first
    setShowPermissionModal(true);
  }, []);

  const handlePermissionAllow = useCallback(async () => {
    setShowPermissionModal(false);
    setIsSyncing(true);

    try {
      const status = await healthService.requestPermissions();
      const updated: HealthSyncPreferences = {
        ...prefs,
        enabled: status === "granted",
        permissionStatus: status,
        platform: healthService.getPlatform(),
      };

      if (status === "granted") {
        // Immediately sync after granting permission
        const result = await healthService.syncData(24);
        updated.lastSyncTime = result.syncedAt;
        setLastSyncResult(result);
        setRecentWorkouts(result.workouts);

        // Apply synced data to activity context
        applyHealthData(result);

        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const totalSteps = result.steps.reduce((sum, s) => sum + s.steps, 0);
        const totalExp = stepsToExp(totalSteps) + result.workouts.reduce((sum, w) => sum + w.expEarned, 0);

        Alert.alert(
          t.healthSyncSuccess,
          tr("healthSyncSuccessDesc", {
            steps: String(totalSteps),
            workouts: String(result.workouts.length),
            exp: String(totalExp),
          })
        );
      } else if (status === "denied") {
        Alert.alert(t.healthPermissionDenied, t.healthPermissionDeniedDesc);
      }

      await savePrefs(updated);
    } catch (e) {
      console.log("Health connect error:", e);
      Alert.alert(t.error, String(e));
    } finally {
      setIsSyncing(false);
    }
  }, [prefs, healthService, savePrefs, t, tr]);

  const handleDisconnect = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const updated: HealthSyncPreferences = {
      ...prefs,
      enabled: false,
      permissionStatus: "not_determined",
      lastSyncTime: null,
    };
    await savePrefs(updated);
    setLastSyncResult(null);
    setRecentWorkouts([]);
  }, [prefs, savePrefs]);

  // ── Sync ─────────────────────────────────────────────────────────────────

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsSyncing(true);

    try {
      const result = await healthService.syncData(24);
      const updated = { ...prefs, lastSyncTime: result.syncedAt };
      await savePrefs(updated);
      setLastSyncResult(result);
      setRecentWorkouts(result.workouts);

      // Apply synced data
      applyHealthData(result);

      const totalSteps = result.steps.reduce((sum, s) => sum + s.steps, 0);
      const totalExp = stepsToExp(totalSteps) + result.workouts.reduce((sum, w) => sum + w.expEarned, 0);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        t.healthSyncSuccess,
        tr("healthSyncSuccessDesc", {
          steps: String(totalSteps),
          workouts: String(result.workouts.length),
          exp: String(totalExp),
        })
      );
    } catch (e) {
      console.log("Sync error:", e);
      Alert.alert(t.error, String(e));
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, healthService, prefs, savePrefs, t, tr]);

  // ── Apply Health Data to Activity Context ────────────────────────────────

  const applyHealthData = useCallback(
    (result: HealthSyncResult) => {
      const todayStr = new Date().toISOString().split("T")[0];
      const todaySteps = result.steps
        .filter((s) => s.date === todayStr)
        .reduce((sum, s) => sum + s.steps, 0);
      const todayWorkouts = result.workouts.filter((w) => w.startTime.startsWith(todayStr));
      const totalCalories = stepsToCalories(todaySteps) + todayWorkouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
      const totalMinutes = todayWorkouts.reduce((sum, w) => sum + w.duration, 0);
      const stepExp = stepsToExp(todaySteps);

      syncHealthData({
        steps: todaySteps,
        caloriesBurned: totalCalories,
        workoutMinutes: totalMinutes,
        workoutLogs: todayWorkouts.map((w) => ({
          exercise: WORKOUT_LABELS[w.type] || w.type,
          duration: w.duration,
          expEarned: w.expEarned,
        })),
        stepsExp: stepExp,
      });
    },
    [syncHealthData]
  );

  // ── Auto-sync on mount if enabled ────────────────────────────────────────

  useEffect(() => {
    if (prefs.enabled && prefs.autoSyncOnLaunch && prefs.permissionStatus === "granted") {
      // Check if we need to sync (based on interval)
      if (prefs.lastSyncTime) {
        const lastSync = new Date(prefs.lastSyncTime).getTime();
        const intervalMs = prefs.syncIntervalHours * 60 * 60 * 1000;
        if (Date.now() - lastSync < intervalMs) return;
      }
      handleSync();
    }
  }, []);

  // ── Format helpers ───────────────────────────────────────────────────────

  const formatLastSync = () => {
    if (!prefs.lastSyncTime) return t.neverSynced;
    const d = new Date(prefs.lastSyncTime);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return tr("lastSynced", { time: "just now" });
    if (diffMin < 60) return tr("lastSynced", { time: `${diffMin}m ago` });
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return tr("lastSynced", { time: `${diffHr}h ago` });
    return tr("lastSynced", { time: d.toLocaleDateString() });
  };

  const todaySteps = lastSyncResult?.steps
    .filter((s) => s.date === new Date().toISOString().split("T")[0])
    .reduce((sum, s) => sum + s.steps, 0) || 0;

  const todayCalories = stepsToCalories(todaySteps) +
    (lastSyncResult?.workouts
      .filter((w) => w.startTime.startsWith(new Date().toISOString().split("T")[0]))
      .reduce((sum, w) => sum + w.caloriesBurned, 0) || 0);

  const todayActiveMin = lastSyncResult?.workouts
    .filter((w) => w.startTime.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((sum, w) => sum + w.duration, 0) || 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
          >
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.healthSync}</Text>
          <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
            <IconSymbol name="shield.fill" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Connection Status Card */}
        <LinearGradient
          colors={prefs.enabled ? ["#22C55E", "#16A34A"] : ["#6B7280", "#4B5563"]}
          style={styles.statusCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>{getPlatformIcon()}</Text>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>{getPlatformLabel()}</Text>
              <Text style={styles.statusValue}>
                {prefs.enabled ? t.healthConnected : t.healthDisconnected}
              </Text>
            </View>
            {prefs.enabled && (
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.statusSubtext}>{formatLastSync()}</Text>
        </LinearGradient>

        {/* Connect / Sync Buttons */}
        {!prefs.enabled ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleConnect}
          >
            <Text style={styles.primaryBtnIcon}>🔗</Text>
            <Text style={styles.primaryBtnText}>{t.connectDevice}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 2 }]}
              onPress={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionBtnIcon}>🔄</Text>
              )}
              <Text style={styles.actionBtnText}>{isSyncing ? t.syncing : t.syncNow}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.error, flex: 1 }]}
              onPress={handleDisconnect}
            >
              <Text style={styles.actionBtnText}>{t.disconnectDevice}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Health Stats */}
        {prefs.enabled && (
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.healthStepsToday}</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.statIcon}>👣</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {todaySteps.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{t.healthStepsToday}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {todayCalories.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{t.healthCaloriesBurned}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.statIcon}>⏱️</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{todayActiveMin}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{t.healthActiveMinutes}</Text>
              </View>
            </View>

            {/* Step Bonus Card */}
            {todaySteps > 0 && (
              <View style={[styles.bonusCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                <Text style={styles.bonusIcon}>⭐</Text>
                <View style={styles.bonusInfo}>
                  <Text style={[styles.bonusTitle, { color: "#92400E" }]}>{t.healthStepBonus}</Text>
                  <Text style={[styles.bonusDesc, { color: "#B45309" }]}>
                    {tr("healthStepBonusDesc", {
                      steps: String(todaySteps),
                      exp: String(stepsToExp(todaySteps)),
                    })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent Workouts */}
        {prefs.enabled && (
          <View style={styles.workoutsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.healthRecentWorkouts}</Text>
            {recentWorkouts.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.emptyIcon}>🏋️</Text>
                <Text style={[styles.emptyText, { color: colors.muted }]}>{t.healthNoWorkouts}</Text>
              </View>
            ) : (
              recentWorkouts.map((w, i) => (
                <View
                  key={w.id || i}
                  style={[styles.workoutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={styles.workoutIcon}>{WORKOUT_ICONS[w.type] || "💪"}</Text>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: colors.foreground }]}>
                      {WORKOUT_LABELS[w.type] || w.type}
                    </Text>
                    <Text style={[styles.workoutMeta, { color: colors.muted }]}>
                      {w.duration} min · {w.caloriesBurned} kcal
                      {w.avgHeartRate ? ` · ❤️ ${w.avgHeartRate} bpm` : ""}
                    </Text>
                  </View>
                  <View style={styles.workoutExp}>
                    <Text style={styles.workoutExpText}>{tr("healthExpEarned", { exp: String(w.expEarned) })}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Sync Settings */}
        {prefs.enabled && (
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.healthSyncSettings}</Text>
            <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t.healthAutoSync}</Text>
                <Switch
                  value={prefs.autoSyncOnLaunch}
                  onValueChange={(val) => savePrefs({ ...prefs, autoSyncOnLaunch: val })}
                  trackColor={{ false: colors.border, true: "#22C55E" }}
                />
              </View>
              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t.healthSyncInterval}</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>{t.healthEvery24h}</Text>
              </View>
              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t.healthDataSource}</Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>{getPlatformLabel()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* No Device Prompt (when not connected) */}
        {!prefs.enabled && (
          <View style={[styles.noDeviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.noDeviceIcon}>⌚</Text>
            <Text style={[styles.noDeviceTitle, { color: colors.foreground }]}>{t.healthNoDevice}</Text>
            <Text style={[styles.noDeviceDesc, { color: colors.muted }]}>{t.healthNoDeviceDesc}</Text>
            <TouchableOpacity
              style={[styles.manualBtn, { borderColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.manualBtnText, { color: colors.primary }]}>{t.healthManualFallback}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Permission Request Modal */}
      <Modal visible={showPermissionModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={styles.permissionIcon}>🔒</Text>
            <Text style={[styles.permissionTitle, { color: colors.foreground }]}>{t.healthPermissionTitle}</Text>
            <Text style={[styles.permissionDesc, { color: colors.muted }]}>{t.healthPermissionDesc}</Text>

            <View style={styles.permissionFeatures}>
              <View style={styles.permissionFeature}>
                <Text style={styles.permissionFeatureIcon}>👣</Text>
                <Text style={[styles.permissionFeatureText, { color: colors.foreground }]}>
                  {t.healthStepsToday}
                </Text>
              </View>
              <View style={styles.permissionFeature}>
                <Text style={styles.permissionFeatureIcon}>🏋️</Text>
                <Text style={[styles.permissionFeatureText, { color: colors.foreground }]}>
                  {t.healthRecentWorkouts}
                </Text>
              </View>
              <View style={styles.permissionFeature}>
                <Text style={styles.permissionFeatureIcon}>🔥</Text>
                <Text style={[styles.permissionFeatureText, { color: colors.foreground }]}>
                  {t.healthCaloriesBurned}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.permissionAllowBtn, { backgroundColor: colors.primary }]}
              onPress={handlePermissionAllow}
            >
              {isSyncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.permissionAllowText}>{t.healthPermissionAllow}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.permissionDenyBtn}
              onPress={() => setShowPermissionModal(false)}
            >
              <Text style={[styles.permissionDenyText, { color: colors.muted }]}>{t.healthPermissionDeny}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacyModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={styles.privacyIcon}>🛡️</Text>
            <Text style={[styles.privacyTitle, { color: colors.foreground }]}>{t.healthPrivacyTitle}</Text>
            <Text style={[styles.privacyBody, { color: colors.muted }]}>{t.healthPrivacyBody}</Text>
            <TouchableOpacity
              style={[styles.permissionAllowBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.permissionAllowText}>{t.ok}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },

  // Status card
  statusCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusIcon: { fontSize: 36 },
  statusInfo: { flex: 1 },
  statusLabel: { color: "#fff", fontSize: 18, fontWeight: "700" },
  statusValue: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "500", marginTop: 2 },
  statusSubtext: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 12 },
  connectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  connectedBadgeText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Buttons
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  primaryBtnIcon: { fontSize: 20 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnIcon: { fontSize: 18 },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Stats
  statsSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  statsGrid: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" as const },

  // Bonus card
  bonusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  bonusIcon: { fontSize: 28 },
  bonusInfo: { flex: 1 },
  bonusTitle: { fontSize: 14, fontWeight: "700" },
  bonusDesc: { fontSize: 12, marginTop: 2 },

  // Workouts
  workoutsSection: { marginBottom: 24 },
  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  workoutIcon: { fontSize: 28 },
  workoutInfo: { flex: 1 },
  workoutName: { fontSize: 15, fontWeight: "700" },
  workoutMeta: { fontSize: 12, marginTop: 2 },
  workoutExp: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  workoutExpText: { color: "#16A34A", fontSize: 12, fontWeight: "700" },

  // Empty state
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, fontWeight: "500" },

  // Settings
  settingsSection: { marginBottom: 24 },
  settingCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: { fontSize: 15, fontWeight: "600" },
  settingValue: { fontSize: 14 },
  settingDivider: { height: 1, marginHorizontal: 16 },

  // No device
  noDeviceCard: {
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  noDeviceIcon: { fontSize: 48 },
  noDeviceTitle: { fontSize: 18, fontWeight: "800" },
  noDeviceDesc: { fontSize: 14, textAlign: "center" as const, lineHeight: 20 },
  manualBtn: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  manualBtnText: { fontSize: 15, fontWeight: "700" },

  // Modals
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
    alignItems: "center",
  },
  permissionIcon: { fontSize: 48, marginBottom: 12 },
  permissionTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" as const, marginBottom: 8 },
  permissionDesc: { fontSize: 14, textAlign: "center" as const, lineHeight: 20, marginBottom: 20 },
  permissionFeatures: { width: "100%", gap: 10, marginBottom: 24 },
  permissionFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 12,
  },
  permissionFeatureIcon: { fontSize: 20 },
  permissionFeatureText: { fontSize: 14, fontWeight: "600" },
  permissionAllowBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  permissionAllowText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  permissionDenyBtn: { paddingVertical: 12 },
  permissionDenyText: { fontSize: 15, fontWeight: "600" },

  // Privacy modal
  privacyIcon: { fontSize: 48, marginBottom: 12 },
  privacyTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" as const, marginBottom: 12 },
  privacyBody: { fontSize: 14, textAlign: "center" as const, lineHeight: 22, marginBottom: 24 },
});
