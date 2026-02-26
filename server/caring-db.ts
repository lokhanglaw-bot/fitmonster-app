import { eq, and, sql, desc, gte } from "drizzle-orm";
import { getDb } from "./db";
import {
  monsterCaring,
  InsertMonsterCaring,
  MonsterCaring,
  foodLogs,
  workouts,
  monsters,
} from "../drizzle/schema";

// ============================================
// Monster Caring - Core CRUD
// ============================================

export async function getMonsterCaring(userId: number): Promise<MonsterCaring | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(monsterCaring).where(eq(monsterCaring.userId, userId)).limit(1);
  return result[0] || null;
}

export async function upsertMonsterCaring(userId: number, data: Partial<InsertMonsterCaring>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getMonsterCaring(userId);
  if (existing) {
    await db.update(monsterCaring).set(data).where(eq(monsterCaring.userId, userId));
    return existing.id;
  } else {
    const result = await db.insert(monsterCaring).values({ userId, ...data }) as any;
    return Number(result.insertId);
  }
}

export async function updateMonsterCaring(userId: number, data: Partial<InsertMonsterCaring>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(monsterCaring).set(data).where(eq(monsterCaring.userId, userId));
}

// ============================================
// Phase 1: Hunger System - Fullness Decay & Feeding
// ============================================

/**
 * Calculate and apply fullness decay based on time elapsed since lastDecayAt.
 * Decay rate: ~3.5 points per hour (configurable).
 * Cap: max 8 points per application to prevent large jumps after long offline periods.
 * Returns the updated caring state.
 */
export async function applyFullnessDecay(userId: number): Promise<MonsterCaring | null> {
  const caring = await getMonsterCaring(userId);
  if (!caring) return null;

  const now = new Date();
  const lastDecay = new Date(caring.lastDecayAt);
  const hoursElapsed = (now.getTime() - lastDecay.getTime()) / (1000 * 60 * 60);

  // Safety: if hoursElapsed is negative or unreasonably large (>168h = 1 week), reset lastDecayAt
  if (hoursElapsed < 0 || hoursElapsed > 168) {
    await updateMonsterCaring(userId, { lastDecayAt: now });
    return { ...caring, lastDecayAt: now };
  }

  // Only decay if at least 30 minutes have passed (was 10 min, increased to reduce frequency)
  if (hoursElapsed < 0.5) return caring;

  // Fullness decay: ~3.5 per hour, but cap at 8 points per application
  // This prevents large drops when user hasn't opened app for a while
  const rawFullnessDecay = Math.floor(hoursElapsed * 3.5);
  const fullnessDecay = Math.min(rawFullnessDecay, 8);
  const newFullness = Math.max(0, caring.fullness - fullnessDecay);

  // Energy decay: ~0.8 per hour, cap at 4 points per application
  const rawEnergyDecay = Math.floor(hoursElapsed * 0.8);
  const energyDecay = Math.min(rawEnergyDecay, 4);
  const newEnergy = Math.max(0, caring.energy - energyDecay);

  // Calculate mood based on fullness and energy
  const newMood = Math.round(newFullness * 0.4 + newEnergy * 0.4 + 20 * (caring.consecutiveBalancedDays > 0 ? 1 : 0.5));
  const clampedMood = Math.max(0, Math.min(100, newMood));

  // Check peak state buff
  const peakStateBuff = newFullness >= 70 && newEnergy >= 70;

  await updateMonsterCaring(userId, {
    fullness: newFullness,
    energy: newEnergy,
    mood: clampedMood,
    lastDecayAt: now,
    peakStateBuff,
  });

  return {
    ...caring,
    fullness: newFullness,
    energy: newEnergy,
    mood: clampedMood,
    lastDecayAt: now,
    peakStateBuff,
  };
}

/**
 * Feed the monster when user logs food.
 * Fullness recovery depends on meal quality.
 */
export async function feedMonster(
  userId: number,
  calories: number,
  protein: number,
  carbs: number,
  fats: number,
  mealType: string
): Promise<{ fullnessGain: number; message: string; newFullness: number }> {
  // First apply any pending decay
  let caring = await applyFullnessDecay(userId);
  if (!caring) {
    // Create caring record if it doesn't exist
    await upsertMonsterCaring(userId, {});
    caring = await getMonsterCaring(userId);
    if (!caring) throw new Error("Failed to create caring record");
  }

  // Calculate meal quality and fullness gain
  let fullnessGain: number;
  let message: string;

  const hasProtein = protein >= 15;
  const hasCarbs = carbs >= 20;
  const hasFats = fats >= 5 && fats <= 30;
  const isBalanced = hasProtein && hasCarbs && hasFats;

  if (mealType === "snack") {
    fullnessGain = Math.min(15, Math.round(calories / 20));
    message = "snack_fed";
  } else if (isBalanced && calories >= 300) {
    fullnessGain = Math.min(40, 35 + Math.round((protein - 15) / 5));
    message = "balanced_meal";
  } else if (fats > 40 || (fats > 0 && calories > 0 && (fats * 9 / calories) > 0.4)) {
    fullnessGain = Math.min(25, Math.round(calories / 25));
    message = "high_fat_meal";
  } else {
    fullnessGain = Math.min(30, Math.round(calories / 20));
    message = "normal_meal";
  }

  const newFullness = Math.min(100, caring.fullness + fullnessGain);
  const newMood = Math.round(newFullness * 0.4 + caring.energy * 0.4 + 20 * (caring.consecutiveBalancedDays > 0 ? 1 : 0.5));
  const peakStateBuff = newFullness >= 70 && caring.energy >= 70;

  await updateMonsterCaring(userId, {
    fullness: newFullness,
    lastFedAt: new Date(),
    mood: Math.max(0, Math.min(100, newMood)),
    peakStateBuff,
  });

  return { fullnessGain, message, newFullness };
}

/**
 * Apply HP effects based on fullness level.
 * Called periodically or on caring status check.
 * Returns HP change amount.
 */
export function calculateHpEffect(fullness: number): { hpChange: number; reason: string } {
  if (fullness >= 80) {
    return { hpChange: 1, reason: "well_fed" }; // +1 HP/hour
  } else if (fullness >= 50) {
    return { hpChange: 0, reason: "normal" }; // No effect
  } else if (fullness >= 20) {
    return { hpChange: 0, reason: "slightly_hungry" }; // HP stops recovering
  } else if (fullness >= 1) {
    return { hpChange: -2, reason: "very_hungry" }; // -2 HP/hour
  } else {
    return { hpChange: -5, reason: "starving" }; // -5 HP/hour, can't battle
  }
}

// ============================================
// Phase 2: Nutrition Advice System
// ============================================

/**
 * Analyze recent nutrition data (past 3-7 days) and return nutrition summary.
 */
export async function analyzeRecentNutrition(userId: number): Promise<{
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  avgCalories: number;
  daysAnalyzed: number;
  issues: string[];
  strengths: string[];
}> {
  const db = await getDb();
  if (!db) return { avgProtein: 0, avgCarbs: 0, avgFats: 0, avgCalories: 0, daysAnalyzed: 0, issues: [], strengths: [] };

  // Get food logs from past 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentLogs = await db.select().from(foodLogs)
    .where(and(
      eq(foodLogs.userId, userId),
      gte(foodLogs.date, sevenDaysAgo)
    ))
    .orderBy(desc(foodLogs.date));

  if (recentLogs.length === 0) {
    return { avgProtein: 0, avgCarbs: 0, avgFats: 0, avgCalories: 0, daysAnalyzed: 0, issues: ["no_data"], strengths: [] };
  }

  // Group by day
  const dayMap = new Map<string, { protein: number; carbs: number; fats: number; calories: number }>();
  for (const log of recentLogs) {
    const day = new Date(log.date).toISOString().split("T")[0];
    const existing = dayMap.get(day) || { protein: 0, carbs: 0, fats: 0, calories: 0 };
    existing.protein += log.protein || 0;
    existing.carbs += log.carbs || 0;
    existing.fats += log.fats || 0;
    existing.calories += log.calories || 0;
    dayMap.set(day, existing);
  }

  const daysAnalyzed = dayMap.size;
  let totalProtein = 0, totalCarbs = 0, totalFats = 0, totalCalories = 0;
  for (const [, day] of dayMap) {
    totalProtein += day.protein;
    totalCarbs += day.carbs;
    totalFats += day.fats;
    totalCalories += day.calories;
  }

  const avgProtein = Math.round(totalProtein / daysAnalyzed);
  const avgCarbs = Math.round(totalCarbs / daysAnalyzed);
  const avgFats = Math.round(totalFats / daysAnalyzed);
  const avgCalories = Math.round(totalCalories / daysAnalyzed);

  // Analyze issues and strengths
  const issues: string[] = [];
  const strengths: string[] = [];

  // Protein check (target: 60-150g depending on weight, use 80g as general target)
  if (avgProtein < 50) {
    issues.push("low_protein");
  } else if (avgProtein >= 80) {
    strengths.push("good_protein");
  }

  // Fat check (target: 20-30% of calories)
  if (avgCalories > 0) {
    const fatCaloriePercent = (avgFats * 9) / avgCalories * 100;
    if (fatCaloriePercent > 35) {
      issues.push("high_fat");
    } else if (fatCaloriePercent >= 20 && fatCaloriePercent <= 30) {
      strengths.push("good_fat_balance");
    }
  }

  // Carbs check
  if (avgCalories > 0) {
    const carbCaloriePercent = (avgCarbs * 4) / avgCalories * 100;
    if (carbCaloriePercent > 60) {
      issues.push("high_carbs");
    } else if (carbCaloriePercent < 30) {
      issues.push("low_carbs");
    }
  }

  // Vegetable/fiber proxy: if fat is high and protein is low, likely not enough vegetables
  if (avgFats > avgProtein && avgProtein < 60) {
    issues.push("low_vegetables");
  }

  // Overall balance
  if (issues.length === 0 && strengths.length >= 1) {
    strengths.push("balanced_diet");
  }

  return { avgProtein, avgCarbs, avgFats, avgCalories, daysAnalyzed, issues, strengths };
}

// ============================================
// Phase 3: Vitality / Energy System
// ============================================

/**
 * Add energy from exercise.
 * Different exercise intensities give different energy recovery.
 */
export async function addExerciseEnergy(
  userId: number,
  duration: number, // minutes
  caloriesBurned: number,
  metValue: number
): Promise<{ energyGain: number; newEnergy: number; message: string }> {
  // First apply any pending decay
  let caring = await applyFullnessDecay(userId);
  if (!caring) {
    await upsertMonsterCaring(userId, {});
    caring = await getMonsterCaring(userId);
    if (!caring) throw new Error("Failed to create caring record");
  }

  let energyGain: number;
  let message: string;

  // High intensity (MET >= 6, or calories > 200 in 30 min)
  if (metValue >= 6 || (caloriesBurned > 200 && duration >= 30)) {
    energyGain = Math.min(40, 30 + Math.round(duration / 15));
    message = "high_intensity";
  }
  // Medium intensity (MET >= 3, or 30+ min moderate)
  else if (metValue >= 3 || duration >= 30) {
    energyGain = Math.min(25, 20 + Math.round(duration / 20));
    message = "medium_intensity";
  }
  // Light exercise
  else {
    energyGain = Math.min(15, 10 + Math.round(duration / 30));
    message = "light_exercise";
  }

  const newEnergy = Math.min(100, caring.energy + energyGain);
  const newMood = Math.round(caring.fullness * 0.4 + newEnergy * 0.4 + 20 * (caring.consecutiveBalancedDays > 0 ? 1 : 0.5));
  const peakStateBuff = caring.fullness >= 70 && newEnergy >= 70;

  await updateMonsterCaring(userId, {
    energy: newEnergy,
    lastExerciseAt: new Date(),
    mood: Math.max(0, Math.min(100, newMood)),
    peakStateBuff,
  });

  return { energyGain, newEnergy, message };
}

/**
 * Calculate battle stat modifiers based on caring state.
 * Returns multipliers for speed, crit rate, and overall stats.
 */
export function calculateBattleModifiers(caring: MonsterCaring): {
  speedModifier: number;
  critModifier: number;
  overallModifier: number;
  canBattle: boolean;
  statusLabel: string;
} {
  const { fullness, energy, peakStateBuff } = caring;

  // Can't battle if starving
  if (fullness === 0) {
    return {
      speedModifier: 0.8,
      critModifier: 0,
      overallModifier: 0.7,
      canBattle: false,
      statusLabel: "starving",
    };
  }

  let speedModifier = 1.0;
  let critModifier = 0;
  let overallModifier = 1.0;

  // Energy effects on speed and crit
  if (energy >= 80) {
    speedModifier = 1.10;
    critModifier = 0.05;
  } else if (energy >= 50) {
    speedModifier = 1.0;
    critModifier = 0;
  } else if (energy >= 20) {
    speedModifier = 0.95;
    critModifier = 0;
  } else {
    speedModifier = 0.90;
    critModifier = 0;
  }

  // Peak state buff (fullness >= 70 && energy >= 70)
  if (fullness >= 80 && energy >= 80) {
    overallModifier = 1.15; // 巔峰狀態: +15%
  } else if (fullness >= 70 && energy >= 70) {
    overallModifier = 1.08; // 最佳狀態: +8%
  }

  let statusLabel = "normal";
  if (fullness >= 80 && energy >= 80) statusLabel = "peak";
  else if (fullness >= 70 && energy >= 70) statusLabel = "optimal";
  else if (fullness < 20 || energy < 20) statusLabel = "weak";
  else if (fullness < 50 || energy < 50) statusLabel = "tired";

  return {
    speedModifier,
    critModifier,
    overallModifier,
    canBattle: true,
    statusLabel,
  };
}

/**
 * Get the monster's current status description based on caring values.
 */
export function getMonsterStatus(caring: MonsterCaring): {
  fullnessStatus: string;
  energyStatus: string;
  moodStatus: string;
  overallStatus: string;
} {
  // Fullness status
  let fullnessStatus: string;
  if (caring.fullness >= 80) fullnessStatus = "satisfied";
  else if (caring.fullness >= 50) fullnessStatus = "normal";
  else if (caring.fullness >= 20) fullnessStatus = "hungry";
  else if (caring.fullness >= 1) fullnessStatus = "very_hungry";
  else fullnessStatus = "starving";

  // Energy status
  let energyStatus: string;
  if (caring.energy >= 80) energyStatus = "energetic";
  else if (caring.energy >= 50) energyStatus = "normal";
  else if (caring.energy >= 20) energyStatus = "lazy";
  else energyStatus = "exhausted";

  // Mood status
  let moodStatus: string;
  if (caring.mood >= 80) moodStatus = "happy";
  else if (caring.mood >= 50) moodStatus = "normal";
  else if (caring.mood >= 20) moodStatus = "sad";
  else moodStatus = "depressed";

  // Overall
  let overallStatus: string;
  if (caring.fullness >= 70 && caring.energy >= 70 && caring.mood >= 70) overallStatus = "excellent";
  else if (caring.fullness >= 50 && caring.energy >= 50) overallStatus = "good";
  else if (caring.fullness >= 20 && caring.energy >= 20) overallStatus = "fair";
  else overallStatus = "poor";

  return { fullnessStatus, energyStatus, moodStatus, overallStatus };
}

/**
 * Apply daily energy decay (called once per day or on first access of the day).
 * Energy decreases by 15-20 points per day if no exercise.
 */
export async function applyDailyEnergyDecay(userId: number): Promise<void> {
  const caring = await getMonsterCaring(userId);
  if (!caring) return;

  const today = new Date().toISOString().split("T")[0];
  const lastExercise = caring.lastExerciseAt ? new Date(caring.lastExerciseAt).toISOString().split("T")[0] : null;

  // If user exercised today, no daily energy decay
  if (lastExercise === today) return;

  // Check how many days since last exercise
  const daysSinceExercise = lastExercise
    ? Math.floor((Date.now() - new Date(caring.lastExerciseAt!).getTime()) / (1000 * 60 * 60 * 24))
    : 3; // Default to 3 days if never exercised

  // Daily decay: 15 base + 2 per day without exercise (max 25)
  const dailyDecay = Math.min(25, 15 + daysSinceExercise * 2);

  // Reset daily HP loss counter
  await updateMonsterCaring(userId, {
    dailyHpLoss: 0,
  });
}
