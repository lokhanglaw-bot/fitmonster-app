/**
 * HealthService — Unified abstraction for health data from
 * Apple HealthKit (iOS) and Health Connect (Android).
 *
 * Native modules are now installed:
 * - react-native-health (iOS HealthKit)
 * - react-native-health-connect (Android Health Connect)
 *
 * On iOS/Android native builds (via EAS Build), the service will use real
 * HealthKit/Health Connect data. On web or Expo Go (where native modules
 * are unavailable), the service returns empty data — no simulated/mock data.
 *
 * IMPORTANT: Native health modules require a development build (EAS Build).
 * They will NOT work in Expo Go or web preview. The code uses try/catch
 * to gracefully handle the case where modules are not available.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ──────────────────────────────────────────────────────────────────

export type HealthPlatform = "apple_healthkit" | "health_connect" | "simulation" | "none";

export type HealthPermissionStatus = "granted" | "denied" | "not_determined" | "unavailable";

export interface HealthStepData {
  date: string;       // YYYY-MM-DD
  steps: number;
  caloriesBurned: number; // steps * 0.04
  distance: number;   // meters
  source: string;     // e.g. "Apple Watch", "Health Connect"
}

export interface HealthWorkoutSession {
  id: string;
  type: WorkoutType;
  startTime: string;  // ISO 8601
  endTime: string;
  duration: number;   // minutes
  caloriesBurned: number;
  distance?: number;  // meters
  avgHeartRate?: number;
  maxHeartRate?: number;
  source: string;
  expEarned: number;  // calculated EXP for monster
}

export type WorkoutType =
  | "running"
  | "walking"
  | "cycling"
  | "swimming"
  | "weight_training"
  | "yoga"
  | "hiit"
  | "basketball"
  | "other";

export interface HealthSyncResult {
  steps: HealthStepData[];
  workouts: HealthWorkoutSession[];
  syncedAt: string;   // ISO 8601
  platform: HealthPlatform;
}

export interface HealthSyncPreferences {
  enabled: boolean;
  platform: HealthPlatform;
  permissionStatus: HealthPermissionStatus;
  lastSyncTime: string | null;
  autoSyncOnLaunch: boolean;
  syncIntervalHours: number;
}

const PREFS_KEY_PREFIX = "@fitmonster_health_prefs_";

function getPrefsKey(userId: string): string {
  return `${PREFS_KEY_PREFIX}${userId}`;
}

const defaultPreferences: HealthSyncPreferences = {
  enabled: false,
  platform: "none",
  permissionStatus: "not_determined",
  lastSyncTime: null,
  autoSyncOnLaunch: true,
  syncIntervalHours: 24,
};

// ── Utility: Workout EXP calculation ───────────────────────────────────────

const WORKOUT_MET: Record<WorkoutType, number> = {
  running: 9.8,
  walking: 3.5,
  cycling: 7.5,
  swimming: 8.0,
  weight_training: 6.0,
  yoga: 3.0,
  hiit: 10.0,
  basketball: 8.0,
  other: 5.0,
};

export function calculateWorkoutExp(type: WorkoutType, durationMinutes: number, caloriesBurned: number): number {
  const met = WORKOUT_MET[type] || 5.0;
  return Math.round(durationMinutes * met * 0.5 + caloriesBurned * 0.1);
}

export function stepsToCalories(steps: number): number {
  return Math.round(steps * 0.04);
}

export function stepsToExp(steps: number): number {
  return Math.round(steps / 100);
}

// ── Preferences Persistence ────────────────────────────────────────────────

export async function loadHealthPreferences(userId: string): Promise<HealthSyncPreferences> {
  try {
    const raw = await AsyncStorage.getItem(getPrefsKey(userId));
    if (raw) {
      return { ...defaultPreferences, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.log("Failed to load health prefs:", e);
  }
  return { ...defaultPreferences };
}

export async function saveHealthPreferences(userId: string, prefs: HealthSyncPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(getPrefsKey(userId), JSON.stringify(prefs));
  } catch (e) {
    console.log("Failed to save health prefs:", e);
  }
}

// ── Platform Detection ─────────────────────────────────────────────────────

export function detectHealthPlatform(): HealthPlatform {
  if (Platform.OS === "ios") return "apple_healthkit";
  if (Platform.OS === "android") return "health_connect";
  return "none";
}

// ── Native Module Helpers ──────────────────────────────────────────────────

/**
 * Attempt to load native health modules at runtime.
 * Returns null if the module is not available (e.g., in Expo Go or web).
 */
function getAppleHealthKit(): any | null {
  if (Platform.OS !== "ios") return null;
  try {
    // Dynamic require — will fail in Expo Go / web but work in EAS builds
    return require("react-native-health").default;
  } catch {
    console.log("[HealthService] react-native-health not available (expected in Expo Go/web)");
    return null;
  }
}

function getHealthConnect(): any | null {
  if (Platform.OS !== "android") return null;
  try {
    return require("react-native-health-connect");
  } catch {
    console.log("[HealthService] react-native-health-connect not available (expected in Expo Go/web)");
    return null;
  }
}

// ── Core Health Service ────────────────────────────────────────────────────

export class HealthService {
  private platform: HealthPlatform;
  private nativeAvailable: boolean = false;

  constructor() {
    this.platform = detectHealthPlatform();
    // Check if native modules are actually available
    if (this.platform === "apple_healthkit") {
      this.nativeAvailable = getAppleHealthKit() !== null;
    } else if (this.platform === "health_connect") {
      this.nativeAvailable = getHealthConnect() !== null;
    }
  }

  getPlatform(): HealthPlatform {
    return this.platform;
  }

  isNativeAvailable(): boolean {
    return this.nativeAvailable;
  }

  isSimulation(): boolean {
    return !this.nativeAvailable;
  }

  /**
   * Request health data permissions from the user.
   * On native builds, triggers the OS permission dialog.
   * On web/Expo Go, returns "unavailable".
   */
  async requestPermissions(): Promise<HealthPermissionStatus> {
    if (this.platform === "apple_healthkit" && this.nativeAvailable) {
      return this._requestHealthKitPermissions();
    }
    if (this.platform === "health_connect" && this.nativeAvailable) {
      return this._requestHealthConnectPermissions();
    }
    // No native module available
    return "unavailable";
  }

  /**
   * Sync health data for the last N hours.
   * On native builds, reads from HealthKit / Health Connect.
   * On web/Expo Go, returns empty data.
   */
  async syncData(hoursBack: number = 24): Promise<HealthSyncResult> {
    if (this.platform === "apple_healthkit" && this.nativeAvailable) {
      return this._syncHealthKitData(hoursBack);
    }
    if (this.platform === "health_connect" && this.nativeAvailable) {
      return this._syncHealthConnectData(hoursBack);
    }
    // No native module — return empty result (no mock data)
    return {
      steps: [],
      workouts: [],
      syncedAt: new Date().toISOString(),
      platform: this.platform,
    };
  }

  /**
   * Check if health data is available on this device.
   */
  async checkAvailability(): Promise<boolean> {
    if (this.platform === "apple_healthkit") {
      const hk = getAppleHealthKit();
      if (!hk) return false;
      return new Promise((resolve) => {
        try {
          hk.isAvailable((err: any, available: boolean) => {
            resolve(!err && available);
          });
        } catch {
          resolve(false);
        }
      });
    }
    if (this.platform === "health_connect") {
      const hc = getHealthConnect();
      if (!hc) return false;
      try {
        const status = await hc.getSdkStatus();
        return status === hc.SdkAvailabilityStatus?.SDK_AVAILABLE;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ── iOS HealthKit Implementation ─────────────────────────────────────────

  private async _requestHealthKitPermissions(): Promise<HealthPermissionStatus> {
    const AppleHealthKit = getAppleHealthKit();
    if (!AppleHealthKit) return "unavailable";

    return new Promise((resolve) => {
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.StepCount,
            AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.Workout,
          ],
          write: [],
        },
      };

      AppleHealthKit.initHealthKit(permissions, (err: any) => {
        if (err) {
          console.log("[HealthKit] Permission denied:", err);
          resolve("denied");
        } else {
          resolve("granted");
        }
      });
    });
  }

  private async _syncHealthKitData(hoursBack: number): Promise<HealthSyncResult> {
    const AppleHealthKit = getAppleHealthKit();
    if (!AppleHealthKit) {
      return { steps: [], workouts: [], syncedAt: new Date().toISOString(), platform: "apple_healthkit" };
    }

    const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    // Fetch steps
    const steps = await new Promise<HealthStepData[]>((resolve) => {
      AppleHealthKit.getDailyStepCountSamples(
        { startDate, endDate },
        (err: any, results: any[]) => {
          if (err || !results) {
            resolve([]);
            return;
          }
          resolve(
            results.map((r: any) => ({
              date: r.startDate?.split("T")[0] || new Date().toISOString().split("T")[0],
              steps: Math.round(r.value || 0),
              caloriesBurned: stepsToCalories(Math.round(r.value || 0)),
              distance: 0,
              source: r.sourceName || "Apple Health",
            }))
          );
        }
      );
    });

    // Fetch workouts
    const workouts = await new Promise<HealthWorkoutSession[]>((resolve) => {
      AppleHealthKit.getSamples(
        {
          startDate,
          endDate,
          type: "Workout",
        },
        (err: any, results: any[]) => {
          if (err || !results) {
            resolve([]);
            return;
          }
          resolve(
            results.map((r: any, i: number) => {
              const wType = mapHealthKitWorkoutType(r.activityName || "other");
              const duration = Math.round((r.duration || 0) / 60);
              const calories = Math.round(r.calories || duration * 7.5);
              return {
                id: `hk-${Date.now()}-${i}`,
                type: wType,
                startTime: r.startDate || startDate,
                endTime: r.endDate || endDate,
                duration,
                caloriesBurned: calories,
                distance: r.distance ? Math.round(r.distance) : undefined,
                avgHeartRate: undefined,
                maxHeartRate: undefined,
                source: r.sourceName || "Apple Health",
                expEarned: calculateWorkoutExp(wType, duration, calories),
              };
            })
          );
        }
      );
    });

    return {
      steps,
      workouts,
      syncedAt: new Date().toISOString(),
      platform: "apple_healthkit",
    };
  }

  // ── Android Health Connect Implementation ────────────────────────────────

  private async _requestHealthConnectPermissions(): Promise<HealthPermissionStatus> {
    const HC = getHealthConnect();
    if (!HC) return "unavailable";

    try {
      await HC.initialize();
      const granted = await HC.requestPermission([
        { accessType: "read", recordType: "Steps" },
        { accessType: "read", recordType: "ExerciseSession" },
        { accessType: "read", recordType: "TotalCaloriesBurned" },
        { accessType: "read", recordType: "Distance" },
      ]);
      return granted && granted.length > 0 ? "granted" : "denied";
    } catch (e) {
      console.log("[HealthConnect] Permission error:", e);
      return "denied";
    }
  }

  private async _syncHealthConnectData(hoursBack: number): Promise<HealthSyncResult> {
    const HC = getHealthConnect();
    if (!HC) {
      return { steps: [], workouts: [], syncedAt: new Date().toISOString(), platform: "health_connect" };
    }

    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();
    const timeRangeFilter = {
      operator: "between",
      startTime,
      endTime,
    };

    // Fetch steps
    let steps: HealthStepData[] = [];
    try {
      const stepsResult = await HC.readRecords("Steps", { timeRangeFilter });
      if (stepsResult?.records) {
        // Aggregate by date
        const byDate: Record<string, number> = {};
        for (const r of stepsResult.records) {
          const date = (r.startTime || "").split("T")[0];
          if (date) {
            byDate[date] = (byDate[date] || 0) + (r.count || 0);
          }
        }
        steps = Object.entries(byDate).map(([date, count]) => ({
          date,
          steps: count,
          caloriesBurned: stepsToCalories(count),
          distance: 0,
          source: "Health Connect",
        }));
      }
    } catch (e) {
      console.log("[HealthConnect] Steps read error:", e);
    }

    // Fetch workouts
    let workouts: HealthWorkoutSession[] = [];
    try {
      const exerciseResult = await HC.readRecords("ExerciseSession", { timeRangeFilter });
      if (exerciseResult?.records) {
        workouts = exerciseResult.records.map((r: any, i: number) => {
          const wType = mapHealthConnectExerciseType(r.exerciseType || 0);
          const start = new Date(r.startTime || Date.now());
          const end = new Date(r.endTime || Date.now());
          const duration = Math.round((end.getTime() - start.getTime()) / 60000);
          const calories = Math.round(r.energy?.inKilocalories || duration * 7.5);
          return {
            id: `hc-${Date.now()}-${i}`,
            type: wType,
            startTime: r.startTime || startTime,
            endTime: r.endTime || endTime,
            duration,
            caloriesBurned: calories,
            distance: r.distance?.inMeters ? Math.round(r.distance.inMeters) : undefined,
            avgHeartRate: undefined,
            maxHeartRate: undefined,
            source: "Health Connect",
            expEarned: calculateWorkoutExp(wType, duration, calories),
          };
        });
      }
    } catch (e) {
      console.log("[HealthConnect] Exercise read error:", e);
    }

    return {
      steps,
      workouts,
      syncedAt: new Date().toISOString(),
      platform: "health_connect",
    };
  }
}

// ── Workout Type Mapping ──────────────────────────────────────────────────

export function mapHealthKitWorkoutType(activityName: string): WorkoutType {
  const name = activityName.toLowerCase();
  if (name.includes("run")) return "running";
  if (name.includes("walk")) return "walking";
  if (name.includes("cycl") || name.includes("bik")) return "cycling";
  if (name.includes("swim")) return "swimming";
  if (name.includes("yoga")) return "yoga";
  if (name.includes("weight") || name.includes("strength") || name.includes("functional")) return "weight_training";
  if (name.includes("hiit") || name.includes("interval") || name.includes("cross")) return "hiit";
  if (name.includes("basket")) return "basketball";
  return "other";
}

export function mapHealthConnectExerciseType(exerciseType: number): WorkoutType {
  const mapping: Record<number, WorkoutType> = {
    56: "running",
    79: "walking",
    8: "cycling",
    74: "swimming",
    80: "weight_training",
    84: "yoga",
    35: "hiit",
    4: "basketball",
  };
  return mapping[exerciseType] || "other";
}

// ── Singleton ──────────────────────────────────────────────────────────────

let healthServiceInstance: HealthService | null = null;

export function getHealthService(): HealthService {
  if (!healthServiceInstance) {
    healthServiceInstance = new HealthService();
  }
  return healthServiceInstance;
}
