import { getDb } from "./db";
import {
  workoutSets,
  personalRecords,
  exercises,
  workouts,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// ── Log a single set ───────────────────────────────────────────
export async function logWorkoutSet(data: {
  userId: number;
  workoutId?: number;
  exerciseId?: number;
  exerciseName: string;
  setNumber: number;
  setType: "warmup" | "working" | "failure" | "drop" | "super";
  weight?: number;
  reps?: number;
  duration?: number;
  rpe?: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check for PR before inserting
  let isPR = false;
  if (data.weight && data.reps && data.setType !== "warmup") {
    const volume = data.weight * data.reps;
    isPR = await checkAndRecordPR(
      data.userId,
      data.exerciseId ?? null,
      data.exerciseName,
      data.weight,
      data.reps,
      volume
    );
  }

  const result = await db.insert(workoutSets).values({
    userId: data.userId,
    workoutId: data.workoutId ?? null,
    exerciseId: data.exerciseId ?? null,
    exerciseName: data.exerciseName,
    setNumber: data.setNumber,
    setType: data.setType,
    weight: data.weight ?? null,
    reps: data.reps ?? null,
    duration: data.duration ?? null,
    rpe: data.rpe ?? null,
    isPR,
    notes: data.notes ?? null,
  });

  return { id: result[0].insertId, isPR };
}

// ── Check and record personal records ──────────────────────────
async function checkAndRecordPR(
  userId: number,
  exerciseId: number | null,
  exerciseName: string,
  weight: number,
  reps: number,
  volume: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  let isPR = false;

  // Check weight PR (1RM estimate: weight × (1 + reps/30))
  const estimated1RM = weight * (1 + reps / 30);

  const [currentWeightPR] = await db
    .select()
    .from(personalRecords)
    .where(
      and(
        eq(personalRecords.userId, userId),
        eq(personalRecords.exerciseName, exerciseName),
        eq(personalRecords.recordType, "weight")
      )
    )
    .orderBy(desc(personalRecords.value))
    .limit(1);

  if (!currentWeightPR || estimated1RM > currentWeightPR.value) {
    await db.insert(personalRecords).values({
      userId,
      exerciseId,
      exerciseName,
      recordType: "weight",
      value: +estimated1RM.toFixed(1),
      previousValue: currentWeightPR?.value ?? null,
    });
    isPR = true;
  }

  // Check volume PR (weight × reps)
  const [currentVolumePR] = await db
    .select()
    .from(personalRecords)
    .where(
      and(
        eq(personalRecords.userId, userId),
        eq(personalRecords.exerciseName, exerciseName),
        eq(personalRecords.recordType, "volume")
      )
    )
    .orderBy(desc(personalRecords.value))
    .limit(1);

  if (!currentVolumePR || volume > currentVolumePR.value) {
    await db.insert(personalRecords).values({
      userId,
      exerciseId,
      exerciseName,
      recordType: "volume",
      value: volume,
      previousValue: currentVolumePR?.value ?? null,
    });
    isPR = true;
  }

  return isPR;
}

// ── Get last session data for an exercise ──────────────────────
export async function getLastSessionSets(
  userId: number,
  exerciseName: string
) {
  const db = await getDb();
  if (!db) return [];

  const sets = await db
    .select()
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.userId, userId),
        eq(workoutSets.exerciseName, exerciseName)
      )
    )
    .orderBy(desc(workoutSets.createdAt))
    .limit(20);

  if (sets.length === 0) return [];

  // Group by the most recent workout session (same day)
  const latestDate = sets[0].createdAt.toISOString().split("T")[0];
  return sets.filter(
    (s) => s.createdAt.toISOString().split("T")[0] === latestDate
  );
}

// ── Get personal records for a user ────────────────────────────
export async function getUserPRs(userId: number, exerciseName?: string) {
  const db = await getDb();
  if (!db) return [];

  if (exerciseName) {
    return db
      .select()
      .from(personalRecords)
      .where(
        and(
          eq(personalRecords.userId, userId),
          eq(personalRecords.exerciseName, exerciseName)
        )
      )
      .orderBy(desc(personalRecords.achievedAt));
  }

  return db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.userId, userId))
    .orderBy(desc(personalRecords.achievedAt))
    .limit(50);
}

// ── Get muscle group volume for heat map ───────────────────────
export async function getMuscleGroupVolume(userId: number, days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  const sets = await db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.userId, userId));

  // Filter by date in JS (simpler than SQL date comparison)
  const recentSets = sets.filter((s) => s.createdAt >= since);

  // Get exercise info for muscle group mapping
  const allExercises = await db.select().from(exercises);
  const exerciseMap = new Map(allExercises.map((e) => [e.name, e]));

  // Aggregate by muscle group
  const volumeMap = new Map<
    string,
    { totalSets: number; totalVolume: number; lastWorked: string }
  >();

  for (const set of recentSets) {
    const exercise = exerciseMap.get(set.exerciseName);
    const muscleGroup = exercise?.muscleGroup ?? "other";
    const volume = (set.weight ?? 0) * (set.reps ?? 0);

    const current = volumeMap.get(muscleGroup) ?? {
      totalSets: 0,
      totalVolume: 0,
      lastWorked: "",
    };
    current.totalSets += 1;
    current.totalVolume += volume;
    const dateStr = set.createdAt.toISOString().split("T")[0];
    if (dateStr > current.lastWorked) current.lastWorked = dateStr;
    volumeMap.set(muscleGroup, current);
  }

  // Find max volume for normalization
  const maxVolume = Math.max(
    ...Array.from(volumeMap.values()).map((v) => v.totalVolume),
    1
  );

  return Array.from(volumeMap.entries()).map(([muscleGroup, data]) => ({
    muscleGroup,
    totalSets: data.totalSets,
    totalVolume: data.totalVolume,
    lastWorked: data.lastWorked || undefined,
    intensity: data.totalVolume / maxVolume,
  }));
}

// ── Get workout sets for a specific workout ────────────────────
export async function getWorkoutSets(workoutId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.workoutId, workoutId))
    .orderBy(workoutSets.setNumber);
}
