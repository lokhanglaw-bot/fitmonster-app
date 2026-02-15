/**
 * HealthService — Unified abstraction for health data from
 * Apple HealthKit (iOS) and Health Connect (Android).
 *
 * IMPORTANT: Native health modules (react-native-health, react-native-health-connect)
 * are NOT bundled in the current build. Metro bundler statically resolves require()
 * calls, so we cannot use try/catch to conditionally load them.
 *
 * Current behavior:
 * - All platforms use simulation mode with realistic demo data
 * - The UI and data flow are fully functional and ready for native integration
 *
 * For production builds with real health data:
 * 1. Install native packages: pnpm add react-native-health react-native-health-connect
 * 2. Uncomment the plugin configs in app.config.ts
 * 3. Replace the simulation implementations in HealthService with native calls
 * 4. Run expo prebuild to generate native projects
 *
 * See the commented-out native implementation patterns at the bottom of this file.
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
  // In the current build, native modules are not available.
  // We report the "intended" platform for UI display, but always use simulation.
  if (Platform.OS === "ios") return "apple_healthkit";
  if (Platform.OS === "android") return "health_connect";
  return "simulation";
}

// ── Simulation Data Generator ──────────────────────────────────────────────

function generateSimulatedSteps(days: number = 1): HealthStepData[] {
  const result: HealthStepData[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const steps = Math.round(3000 + Math.random() * 9000);
    result.push({
      date: dateStr,
      steps,
      caloriesBurned: stepsToCalories(steps),
      distance: Math.round(steps * 0.75),
      source: Platform.OS === "ios" ? "Apple Health (Demo)" : Platform.OS === "android" ? "Health Connect (Demo)" : "Simulation",
    });
  }
  return result;
}

function generateSimulatedWorkouts(days: number = 1): HealthWorkoutSession[] {
  const types: WorkoutType[] = ["running", "walking", "cycling", "weight_training", "yoga", "hiit"];
  const result: HealthWorkoutSession[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    // 60% chance of having a workout on any given day (more likely for demo)
    if (Math.random() < 0.4) continue;
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const type = types[Math.floor(Math.random() * types.length)];
    const duration = Math.round(20 + Math.random() * 40);
    const met = WORKOUT_MET[type];
    const caloriesBurned = Math.round(duration * met * 1.1);
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
      source: Platform.OS === "ios" ? "Apple Watch (Demo)" : Platform.OS === "android" ? "Pixel Watch (Demo)" : "Simulation",
      expEarned: calculateWorkoutExp(type, duration, caloriesBurned),
    });
  }
  return result;
}

// ── Core Health Service ────────────────────────────────────────────────────

export class HealthService {
  private platform: HealthPlatform;

  constructor() {
    this.platform = detectHealthPlatform();
  }

  getPlatform(): HealthPlatform {
    return this.platform;
  }

  isSimulation(): boolean {
    // Currently always true since native modules are not bundled
    return true;
  }

  /**
   * Request health data permissions from the user.
   * In simulation mode, this always grants permission after a short delay.
   * In production with native modules, this would trigger the OS permission dialog.
   */
  async requestPermissions(): Promise<HealthPermissionStatus> {
    // Simulate a permission grant after a short delay
    await new Promise((r) => setTimeout(r, 800));
    return "granted";
  }

  /**
   * Sync health data for the last N hours.
   * In simulation mode, generates realistic demo data.
   * In production with native modules, reads from HealthKit / Health Connect.
   */
  async syncData(hoursBack: number = 24): Promise<HealthSyncResult> {
    const days = Math.ceil(hoursBack / 24);
    await new Promise((r) => setTimeout(r, 1200)); // Simulate sync delay
    return {
      steps: generateSimulatedSteps(days),
      workouts: generateSimulatedWorkouts(days),
      syncedAt: new Date().toISOString(),
      platform: this.platform,
    };
  }

  /**
   * Check if health data is available on this device.
   */
  async checkAvailability(): Promise<boolean> {
    return true; // Simulation is always available
  }
}

// ── Workout Type Mapping (for native integration) ──────────────────────────

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

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * NATIVE INTEGRATION GUIDE (for production builds)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * To enable real health data sync, follow these steps:
 *
 * 1. INSTALL PACKAGES:
 *    pnpm add react-native-health          # iOS HealthKit
 *    pnpm add react-native-health-connect  # Android Health Connect
 *
 * 2. UNCOMMENT PLUGINS in app.config.ts:
 *    ["react-native-health", { ... }]
 *    ["expo-health-connect", { ... }]
 *
 * 3. REPLACE requestPermissions() with:
 *
 *    // iOS:
 *    import AppleHealthKit from "react-native-health";
 *    AppleHealthKit.initHealthKit({
 *      permissions: {
 *        read: [
 *          AppleHealthKit.Constants.Permissions.StepCount,
 *          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
 *          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
 *          AppleHealthKit.Constants.Permissions.HeartRate,
 *          AppleHealthKit.Constants.Permissions.Workout,
 *        ],
 *        write: [],
 *      },
 *    }, (err) => { ... });
 *
 *    // Android:
 *    import { initialize, requestPermission } from "react-native-health-connect";
 *    await initialize();
 *    await requestPermission([
 *      { accessType: "read", recordType: "Steps" },
 *      { accessType: "read", recordType: "ExerciseSession" },
 *      { accessType: "read", recordType: "TotalCaloriesBurned" },
 *      { accessType: "read", recordType: "HeartRate" },
 *      { accessType: "read", recordType: "Distance" },
 *    ]);
 *
 * 4. REPLACE syncData() with native queries:
 *
 *    // iOS:
 *    AppleHealthKit.getDailyStepCountSamples({ startDate, endDate }, callback);
 *    AppleHealthKit.getSamples({ startDate, endDate, type: "Workout" }, callback);
 *
 *    // Android:
 *    import { readRecords } from "react-native-health-connect";
 *    const steps = await readRecords("Steps", { timeRangeFilter });
 *    const exercises = await readRecords("ExerciseSession", { timeRangeFilter });
 *
 * 5. RUN expo prebuild to generate native projects
 * ══════════════════════════════════════════════════════════════════════════════
 */
