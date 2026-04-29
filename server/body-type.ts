import { getDb } from "./db";
import {
  bodyStats,
  foodLogs,
  workouts,
  profiles,
  monsters,
  monsterCaring,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { BodyType } from "../types/game";
import { MALE_FAT_THRESHOLDS, FEMALE_FAT_THRESHOLDS } from "../types/game";

const CLAMP = (v: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v));

// ── Body type from fat score + gender ──────────────────────────
export function resolveBodyType(
  fatScore: number,
  gender: "male" | "female"
): BodyType {
  const t = gender === "female" ? FEMALE_FAT_THRESHOLDS : MALE_FAT_THRESHOLDS;
  if (fatScore < t.peak) return "peak";
  if (fatScore < t.lean) return "lean";
  if (fatScore < t.standard) return "standard";
  if (fatScore < t.fat) return "fat";
  return "obese";
}

// ── Daily delta calculation ────────────────────────────────────
export function calculateDailyDelta(opts: {
  calorieBalance: number;
  proteinAdequate: boolean;
  hadStrengthTraining: boolean;
  hadHighFatFood: boolean;
  hadHighSugarFood: boolean;
  consecutiveHealthyDays: number;
  consecutiveInactiveDays: number;
}): { muscleDelta: number; fatDelta: number; reason: string } {
  const {
    calorieBalance,
    proteinAdequate,
    hadStrengthTraining,
    hadHighFatFood,
    hadHighSugarFood,
    consecutiveHealthyDays,
    consecutiveInactiveDays,
  } = opts;

  let muscleDelta = 0;
  let fatDelta = 0;
  const reasons: string[] = [];

  if (calorieBalance > 200) {
    // Calorie surplus
    if (proteinAdequate && hadStrengthTraining) {
      muscleDelta += 2;
      fatDelta += 0.5;
      reasons.push("surplus + protein + lifting → muscle gain");
    } else {
      fatDelta += 3;
      reasons.push("surplus without adequate protein/training → fat gain");
    }
  } else if (calorieBalance < -200) {
    // Calorie deficit
    if (proteinAdequate && hadStrengthTraining) {
      fatDelta -= 2;
      muscleDelta -= 0.3;
      reasons.push("deficit + protein + lifting → fat loss");
    } else {
      muscleDelta -= 2;
      fatDelta -= 1;
      reasons.push("deficit without protein/training → muscle loss");
    }
  } else {
    // Balanced (±200 kcal)
    if (hadStrengthTraining) {
      muscleDelta += 1;
      fatDelta -= 0.5;
      reasons.push("balanced + lifting → body recomp");
    }
  }

  // Accelerators
  if (hadHighFatFood && !hadStrengthTraining) {
    fatDelta *= 1.5;
    reasons.push("high-fat food without exercise → ×1.5 fat");
  }

  if (hadHighSugarFood) {
    fatDelta += 0.5;
    reasons.push("high-sugar food → extra fat");
  }

  // Streak bonuses / penalties
  if (consecutiveHealthyDays >= 3) {
    fatDelta -= 0.7;
    reasons.push("3-day health streak → metabolism bonus");
  }
  if (consecutiveInactiveDays >= 7) {
    muscleDelta -= 1;
    reasons.push("7-day inactivity → muscle atrophy");
  }

  return {
    muscleDelta: CLAMP(muscleDelta, -10, 10),
    fatDelta: CLAMP(fatDelta, -10, 10),
    reason: reasons.join("; "),
  };
}

// ── Persist daily body stats and update monster ────────────────
export async function settleDailyBodyStats(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;

  // Get user profile for gender + TDEE
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!profile) return null;

  const gender = (profile.gender as "male" | "female") ?? "male";
  const tdee = profile.dailyCalorieGoal ?? 2000;

  // Get yesterday's body stats for current scores
  const [yesterday] = await db
    .select()
    .from(bodyStats)
    .where(
      and(
        eq(bodyStats.userId, String(userId)),
        lte(bodyStats.date, date)
      )
    )
    .orderBy(desc(bodyStats.date))
    .limit(1);

  const prevMuscle = yesterday?.muscleScore ?? 50;
  const prevFat = yesterday?.fatScore ?? 50;

  // Get today's food logs
  const todayStart = new Date(`${date}T00:00:00`);
  const todayEnd = new Date(`${date}T23:59:59`);

  const todayFoodLogs = await db
    .select()
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.userId, userId),
        gte(foodLogs.createdAt, todayStart),
        lte(foodLogs.createdAt, todayEnd)
      )
    );

  const totalCalories = todayFoodLogs.reduce(
    (s, f) => s + (f.calories ?? 0),
    0
  );
  const totalProtein = todayFoodLogs.reduce(
    (s, f) => s + (f.protein ?? 0),
    0
  );
  const calorieBalance = totalCalories - tdee;

  const bodyWeightKg = profile.weight ?? 70;
  const proteinTarget = bodyWeightKg * 0.7;
  const proteinAdequate = totalProtein >= proteinTarget;

  // High-fat / high-sugar flags
  const hadHighFatFood = todayFoodLogs.some((f) => (f.fats ?? 0) > 20);
  const hadHighSugarFood = todayFoodLogs.some(
    (f) => (f.carbs ?? 0) > 60 && (f.fiber ?? 99) < 3
  );

  // Get today's workouts
  const todayWorkouts = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.createdAt, todayStart),
        lte(workouts.createdAt, todayEnd)
      )
    );

  const hadStrengthTraining = todayWorkouts.some((w) =>
    ["chest", "back", "legs", "shoulders", "arms", "core", "strength"].includes(
      w.exerciseType ?? ""
    )
  );
  const hadCardio = todayWorkouts.some((w) => w.exerciseType === "cardio");

  // Consecutive days helpers
  const recentStats = await db
    .select()
    .from(bodyStats)
    .where(eq(bodyStats.userId, String(userId)))
    .orderBy(desc(bodyStats.date))
    .limit(10);

  let consecutiveHealthyDays = 0;
  for (const s of recentStats) {
    if (s.proteinAdequate && s.hadStrengthTraining) consecutiveHealthyDays++;
    else break;
  }

  let consecutiveInactiveDays = 0;
  for (const s of recentStats) {
    if (!s.hadStrengthTraining && !s.hadCardio) consecutiveInactiveDays++;
    else break;
  }

  const { muscleDelta, fatDelta } = calculateDailyDelta({
    calorieBalance,
    proteinAdequate,
    hadStrengthTraining,
    hadHighFatFood,
    hadHighSugarFood,
    consecutiveHealthyDays,
    consecutiveInactiveDays,
  });

  const newMuscle = CLAMP(prevMuscle + muscleDelta);
  const newFat = CLAMP(prevFat + fatDelta);
  const bodyType = resolveBodyType(newFat, gender);

  // Upsert body_stats row
  await db
    .insert(bodyStats)
    .values({
      userId: String(userId),
      date,
      muscleScore: newMuscle,
      fatScore: newFat,
      bodyType,
      calorieBalance,
      proteinAdequate,
      hadStrengthTraining,
      hadCardio,
    })
    .onDuplicateKeyUpdate({
      set: {
        muscleScore: newMuscle,
        fatScore: newFat,
        bodyType,
        calorieBalance,
        proteinAdequate,
        hadStrengthTraining,
        hadCardio,
        updatedAt: new Date(),
      },
    });

  // Update monster body type
  const [monster] = await db
    .select()
    .from(monsters)
    .where(eq(monsters.userId, userId))
    .limit(1);

  if (monster) {
    await db
      .update(monsters)
      .set({ muscleScore: newMuscle, fatScore: newFat, bodyType })
      .where(eq(monsters.id, monster.id));
  }

  return { muscleScore: newMuscle, fatScore: newFat, bodyType };
}

// ── Weekly body report ─────────────────────────────────────────
export async function getWeeklyBodyReport(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(bodyStats)
    .where(eq(bodyStats.userId, String(userId)))
    .orderBy(desc(bodyStats.date))
    .limit(14);

  if (rows.length < 2) return null;

  const latest = rows[0];
  const weekAgo = rows[Math.min(6, rows.length - 1)];

  const muscleDelta = latest.muscleScore - weekAgo.muscleScore;
  const fatDelta = latest.fatScore - weekAgo.fatScore;
  const bodyTypeChanged = latest.bodyType !== weekAgo.bodyType;

  const daysWithTraining = rows
    .slice(0, 7)
    .filter((r) => r.hadStrengthTraining).length;
  const daysWithCardio = rows
    .slice(0, 7)
    .filter((r) => r.hadCardio).length;
  const avgCalBalance =
    rows.slice(0, 7).reduce((s, r) => s + r.calorieBalance, 0) / 7;

  return {
    currentBodyType: latest.bodyType,
    previousBodyType: weekAgo.bodyType,
    bodyTypeChanged,
    muscleScoreDelta: +muscleDelta.toFixed(1),
    fatScoreDelta: +fatDelta.toFixed(1),
    currentMuscleScore: latest.muscleScore,
    currentFatScore: latest.fatScore,
    daysWithStrengthTraining: daysWithTraining,
    daysWithCardio,
    avgDailyCalorieBalance: +avgCalBalance.toFixed(0),
  };
}
