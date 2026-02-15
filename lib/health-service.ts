/**
 * HealthService — Unified abstraction for health data from
 * Apple HealthKit (iOS) and Health Connect (Android).
 *
 * In Expo Go / Web preview, a simulation layer provides realistic
 * demo data so the full UI can be tested without native modules.
 *
 * For production builds (expo prebuild), the native implementations
 * are activated via react-native-health (iOS) and
 * react-native-health-connect (Android).
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
  source: string;     // e.g. "Apple Watch", "Pixel Watch", "Simulation"
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
  // Base: duration * MET factor * 0.5 + calories * 0.1
  const met = WORKOUT_MET[type] || 5.0;
  return Math.round(durationMinutes * met * 0.5 + caloriesBurned * 0.1);
}

export function stepsToCalories(steps: number): number {
  return Math.round(steps * 0.04);
}

export function stepsToExp(steps: number): number {
  // 1 EXP per 100 steps
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
  return "simulation"; // Web
}

/**
 * Check if native health modules are available.
 * In Expo Go, native modules won't be present, so we fall back to simulation.
 */
export function isNativeHealthAvailable(): boolean {
  try {
    if (Platform.OS === "ios") {
      // Check if react-native-health is available
      const AppleHealthKit = require("react-native-health").default;
      return !!AppleHealthKit;
    }
    if (Platform.OS === "android") {
      const { initialize } = require("react-native-health-connect");
      return !!initialize;
    }
  } catch {
    // Module not available (Expo Go or not installed)
  }
  return false;
}

// ── Simulation Data Generator ──────────────────────────────────────────────

function generateSimulatedSteps(days: number = 1): HealthStepData[] {
  const result: HealthStepData[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    // Realistic step count: 3000-12000 steps
    const steps = Math.round(3000 + Math.random() * 9000);
    result.push({
      date: dateStr,
      steps,
      caloriesBurned: stepsToCalories(steps),
      distance: Math.round(steps * 0.75), // ~0.75m per step
      source: "Simulation",
    });
  }
  return result;
}

function generateSimulatedWorkouts(days: number = 1): HealthWorkoutSession[] {
  const types: WorkoutType[] = ["running", "walking", "cycling", "weight_training", "yoga", "hiit"];
  const result: HealthWorkoutSession[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    // 50% chance of having a workout on any given day
    if (Math.random() < 0.5) continue;
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const type = types[Math.floor(Math.random() * types.length)];
    const duration = Math.round(20 + Math.random() * 40); // 20-60 min
    const met = WORKOUT_MET[type];
    const caloriesBurned = Math.round(duration * met * 1.1); // rough estimate
    const startTime = new Date(date);
    startTime.setHours(7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
    const endTime = new Date(startTime.getTime() + duration * 60000);

    result.push({
      id: `sim-workout-${Date.now()}-${i}`,
      type,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      caloriesBurned,
      distance: type === "running" ? Math.round(duration * 150) : type === "cycling" ? Math.round(duration * 350) : undefined,
      avgHeartRate: Math.round(100 + Math.random() * 60),
      maxHeartRate: Math.round(140 + Math.random() * 40),
      source: "Simulation",
      expEarned: calculateWorkoutExp(type, duration, caloriesBurned),
    });
  }
  return result;
}

// ── Core Health Service ────────────────────────────────────────────────────

export class HealthService {
  private platform: HealthPlatform;
  private nativeAvailable: boolean;

  constructor() {
    this.platform = detectHealthPlatform();
    this.nativeAvailable = isNativeHealthAvailable();
    if (!this.nativeAvailable) {
      this.platform = "simulation";
    }
  }

  getPlatform(): HealthPlatform {
    return this.platform;
  }

  isSimulation(): boolean {
    return this.platform === "simulation";
  }

  /**
   * Request health data permissions from the user.
   * Returns the permission status after the request.
   */
  async requestPermissions(): Promise<HealthPermissionStatus> {
    if (this.platform === "simulation") {
      // Simulate a permission grant after a short delay
      await new Promise((r) => setTimeout(r, 800));
      return "granted";
    }

    if (this.platform === "apple_healthkit") {
      return this.requestHealthKitPermissions();
    }

    if (this.platform === "health_connect") {
      return this.requestHealthConnectPermissions();
    }

    return "unavailable";
  }

  /**
   * Sync health data for the last N hours.
   */
  async syncData(hoursBack: number = 24): Promise<HealthSyncResult> {
    const days = Math.ceil(hoursBack / 24);

    if (this.platform === "simulation") {
      await new Promise((r) => setTimeout(r, 1200)); // Simulate network delay
      return {
        steps: generateSimulatedSteps(days),
        workouts: generateSimulatedWorkouts(days),
        syncedAt: new Date().toISOString(),
        platform: "simulation",
      };
    }

    if (this.platform === "apple_healthkit") {
      return this.syncHealthKitData(hoursBack);
    }

    if (this.platform === "health_connect") {
      return this.syncHealthConnectData(hoursBack);
    }

    return {
      steps: [],
      workouts: [],
      syncedAt: new Date().toISOString(),
      platform: "none",
    };
  }

  /**
   * Check if health data is available on this device.
   */
  async checkAvailability(): Promise<boolean> {
    if (this.platform === "simulation") return true;

    if (this.platform === "apple_healthkit") {
      try {
        const AppleHealthKit = require("react-native-health").default;
        return new Promise((resolve) => {
          AppleHealthKit.isAvailable((err: any, available: boolean) => {
            resolve(!err && available);
          });
        });
      } catch {
        return false;
      }
    }

    if (this.platform === "health_connect") {
      try {
        const { getSdkStatus } = require("react-native-health-connect");
        const status = await getSdkStatus();
        return status === 3; // SDK_AVAILABLE
      } catch {
        return false;
      }
    }

    return false;
  }

  // ── iOS HealthKit Implementation ─────────────────────────────────────────

  private async requestHealthKitPermissions(): Promise<HealthPermissionStatus> {
    try {
      const AppleHealthKit = require("react-native-health").default;
      const { HealthKitPermissions } = require("react-native-health");

      const permissions: typeof HealthKitPermissions = {
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

      return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(permissions, (err: string) => {
          if (err) {
            console.log("HealthKit permission error:", err);
            resolve("denied");
          } else {
            resolve("granted");
          }
        });
      });
    } catch (e) {
      console.log("HealthKit not available:", e);
      return "unavailable";
    }
  }

  private async syncHealthKitData(hoursBack: number): Promise<HealthSyncResult> {
    try {
      const AppleHealthKit = require("react-native-health").default;
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
              results.map((w: any) => {
                const type = mapHealthKitWorkoutType(w.activityName || "");
                const duration = Math.round((w.duration || 0) / 60);
                const calories = Math.round(w.calories || 0);
                return {
                  id: w.id || `hk-${Date.now()}-${Math.random()}`,
                  type,
                  startTime: w.start || w.startDate || "",
                  endTime: w.end || w.endDate || "",
                  duration,
                  caloriesBurned: calories,
                  distance: w.distance ? Math.round(w.distance * 1000) : undefined,
                  avgHeartRate: undefined,
                  maxHeartRate: undefined,
                  source: w.sourceName || "Apple Health",
                  expEarned: calculateWorkoutExp(type, duration, calories),
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
    } catch (e) {
      console.log("HealthKit sync error:", e);
      return { steps: [], workouts: [], syncedAt: new Date().toISOString(), platform: "apple_healthkit" };
    }
  }

  // ── Android Health Connect Implementation ────────────────────────────────

  private async requestHealthConnectPermissions(): Promise<HealthPermissionStatus> {
    try {
      const { initialize, requestPermission } = require("react-native-health-connect");
      await initialize();

      const granted = await requestPermission([
        { accessType: "read", recordType: "Steps" },
        { accessType: "read", recordType: "ExerciseSession" },
        { accessType: "read", recordType: "TotalCaloriesBurned" },
        { accessType: "read", recordType: "HeartRate" },
        { accessType: "read", recordType: "Distance" },
      ]);

      return granted?.length > 0 ? "granted" : "denied";
    } catch (e) {
      console.log("Health Connect permission error:", e);
      return "unavailable";
    }
  }

  private async syncHealthConnectData(hoursBack: number): Promise<HealthSyncResult> {
    try {
      const { readRecords } = require("react-native-health-connect");
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      const timeRangeFilter = { operator: "between" as const, startTime, endTime };

      // Fetch steps
      const stepsResult = await readRecords("Steps", { timeRangeFilter });
      const stepsByDate: Record<string, number> = {};
      for (const record of stepsResult?.records || []) {
        const date = (record.startTime || "").split("T")[0];
        if (date) {
          stepsByDate[date] = (stepsByDate[date] || 0) + (record.count || 0);
        }
      }
      const steps: HealthStepData[] = Object.entries(stepsByDate).map(([date, count]) => ({
        date,
        steps: count,
        caloriesBurned: stepsToCalories(count),
        distance: Math.round(count * 0.75),
        source: "Health Connect",
      }));

      // Fetch exercise sessions
      const exerciseResult = await readRecords("ExerciseSession", { timeRangeFilter });
      const workouts: HealthWorkoutSession[] = (exerciseResult?.records || []).map((s: any) => {
        const type = mapHealthConnectExerciseType(s.exerciseType || 0);
        const start = new Date(s.startTime || Date.now());
        const end = new Date(s.endTime || Date.now());
        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
        const calories = Math.round(s.energy?.inKilocalories || duration * 7);
        return {
          id: s.metadata?.id || `hc-${Date.now()}-${Math.random()}`,
          type,
          startTime: s.startTime || "",
          endTime: s.endTime || "",
          duration,
          caloriesBurned: calories,
          distance: s.distance?.inMeters ? Math.round(s.distance.inMeters) : undefined,
          avgHeartRate: undefined,
          maxHeartRate: undefined,
          source: s.metadata?.dataOrigin || "Health Connect",
          expEarned: calculateWorkoutExp(type, duration, calories),
        };
      });

      return {
        steps,
        workouts,
        syncedAt: new Date().toISOString(),
        platform: "health_connect",
      };
    } catch (e) {
      console.log("Health Connect sync error:", e);
      return { steps: [], workouts: [], syncedAt: new Date().toISOString(), platform: "health_connect" };
    }
  }
}

// ── Workout Type Mapping ───────────────────────────────────────────────────

function mapHealthKitWorkoutType(activityName: string): WorkoutType {
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

function mapHealthConnectExerciseType(exerciseType: number): WorkoutType {
  // Health Connect exercise type constants
  const mapping: Record<number, WorkoutType> = {
    56: "running",    // EXERCISE_TYPE_RUNNING
    79: "walking",    // EXERCISE_TYPE_WALKING
    8: "cycling",     // EXERCISE_TYPE_BIKING
    74: "swimming",   // EXERCISE_TYPE_SWIMMING_POOL
    80: "weight_training", // EXERCISE_TYPE_WEIGHTLIFTING
    84: "yoga",       // EXERCISE_TYPE_YOGA
    35: "hiit",       // EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING
    4: "basketball",  // EXERCISE_TYPE_BASKETBALL
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
