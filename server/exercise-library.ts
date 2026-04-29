import { getDb } from "./db";
import { exercises } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// 55 core exercises covering all muscle groups
export const EXERCISE_SEED_DATA = [
  // ── Chest (8) ──
  { name: "Bench Press", nameZh: "臥推", category: "chest", muscleGroup: "chest", secondaryMuscles: "triceps,front_delt", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Incline Bench Press", nameZh: "上斜臥推", category: "chest", muscleGroup: "upper_chest", secondaryMuscles: "triceps,front_delt", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Dumbbell Fly", nameZh: "啞鈴飛鳥", category: "chest", muscleGroup: "chest", secondaryMuscles: "front_delt", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Cable Crossover", nameZh: "繩索夾胸", category: "chest", muscleGroup: "chest", secondaryMuscles: "front_delt", equipment: "cable", difficulty: "beginner" as const, isCompound: false },
  { name: "Push-up", nameZh: "伏地挺身", category: "chest", muscleGroup: "chest", secondaryMuscles: "triceps,front_delt,core", equipment: "bodyweight", difficulty: "beginner" as const, isCompound: true },
  { name: "Decline Bench Press", nameZh: "下斜臥推", category: "chest", muscleGroup: "lower_chest", secondaryMuscles: "triceps", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Dumbbell Bench Press", nameZh: "啞鈴臥推", category: "chest", muscleGroup: "chest", secondaryMuscles: "triceps,front_delt", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: true },
  { name: "Chest Dip", nameZh: "胸肌雙槓撐體", category: "chest", muscleGroup: "lower_chest", secondaryMuscles: "triceps,front_delt", equipment: "bodyweight", difficulty: "intermediate" as const, isCompound: true },

  // ── Back (8) ──
  { name: "Deadlift", nameZh: "硬舉", category: "back", muscleGroup: "back", secondaryMuscles: "hamstrings,glutes,core", equipment: "barbell", difficulty: "advanced" as const, isCompound: true },
  { name: "Barbell Row", nameZh: "槓鈴划船", category: "back", muscleGroup: "mid_back", secondaryMuscles: "biceps,rear_delt", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Pull-up", nameZh: "引體向上", category: "back", muscleGroup: "lats", secondaryMuscles: "biceps,rear_delt", equipment: "bodyweight", difficulty: "intermediate" as const, isCompound: true },
  { name: "Lat Pulldown", nameZh: "滑輪下拉", category: "back", muscleGroup: "lats", secondaryMuscles: "biceps", equipment: "cable", difficulty: "beginner" as const, isCompound: true },
  { name: "Seated Cable Row", nameZh: "坐姿繩索划船", category: "back", muscleGroup: "mid_back", secondaryMuscles: "biceps,rear_delt", equipment: "cable", difficulty: "beginner" as const, isCompound: true },
  { name: "T-Bar Row", nameZh: "T槓划船", category: "back", muscleGroup: "mid_back", secondaryMuscles: "biceps,rear_delt", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Dumbbell Row", nameZh: "啞鈴划船", category: "back", muscleGroup: "lats", secondaryMuscles: "biceps,rear_delt", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: true },
  { name: "Face Pull", nameZh: "面拉", category: "back", muscleGroup: "rear_delt", secondaryMuscles: "traps,rhomboids", equipment: "cable", difficulty: "beginner" as const, isCompound: false },

  // ── Legs (9) ──
  { name: "Squat", nameZh: "深蹲", category: "legs", muscleGroup: "quads", secondaryMuscles: "glutes,hamstrings,core", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Leg Press", nameZh: "腿推", category: "legs", muscleGroup: "quads", secondaryMuscles: "glutes,hamstrings", equipment: "machine", difficulty: "beginner" as const, isCompound: true },
  { name: "Romanian Deadlift", nameZh: "羅馬尼亞硬舉", category: "legs", muscleGroup: "hamstrings", secondaryMuscles: "glutes,lower_back", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Leg Curl", nameZh: "腿彎舉", category: "legs", muscleGroup: "hamstrings", equipment: "machine", difficulty: "beginner" as const, isCompound: false },
  { name: "Leg Extension", nameZh: "腿伸展", category: "legs", muscleGroup: "quads", equipment: "machine", difficulty: "beginner" as const, isCompound: false },
  { name: "Calf Raise", nameZh: "提踵", category: "legs", muscleGroup: "calves", equipment: "machine", difficulty: "beginner" as const, isCompound: false },
  { name: "Bulgarian Split Squat", nameZh: "保加利亞分腿蹲", category: "legs", muscleGroup: "quads", secondaryMuscles: "glutes,hamstrings", equipment: "dumbbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Hip Thrust", nameZh: "臀推", category: "legs", muscleGroup: "glutes", secondaryMuscles: "hamstrings", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Lunge", nameZh: "弓步", category: "legs", muscleGroup: "quads", secondaryMuscles: "glutes,hamstrings", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: true },

  // ── Shoulders (7) ──
  { name: "Overhead Press", nameZh: "肩推", category: "shoulders", muscleGroup: "front_delt", secondaryMuscles: "side_delt,triceps", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Lateral Raise", nameZh: "側平舉", category: "shoulders", muscleGroup: "side_delt", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Front Raise", nameZh: "前平舉", category: "shoulders", muscleGroup: "front_delt", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Rear Delt Fly", nameZh: "反向飛鳥", category: "shoulders", muscleGroup: "rear_delt", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Arnold Press", nameZh: "阿諾推舉", category: "shoulders", muscleGroup: "front_delt", secondaryMuscles: "side_delt,triceps", equipment: "dumbbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Upright Row", nameZh: "直立划船", category: "shoulders", muscleGroup: "side_delt", secondaryMuscles: "traps", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },
  { name: "Dumbbell Shoulder Press", nameZh: "啞鈴肩推", category: "shoulders", muscleGroup: "front_delt", secondaryMuscles: "side_delt,triceps", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: true },

  // ── Arms (8) ──
  { name: "Barbell Curl", nameZh: "槓鈴彎舉", category: "arms", muscleGroup: "biceps", equipment: "barbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Dumbbell Curl", nameZh: "啞鈴彎舉", category: "arms", muscleGroup: "biceps", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Hammer Curl", nameZh: "錘式彎舉", category: "arms", muscleGroup: "biceps", secondaryMuscles: "brachialis", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Tricep Pushdown", nameZh: "三頭肌下壓", category: "arms", muscleGroup: "triceps", equipment: "cable", difficulty: "beginner" as const, isCompound: false },
  { name: "Skull Crusher", nameZh: "仰臥臂屈伸", category: "arms", muscleGroup: "triceps", equipment: "barbell", difficulty: "intermediate" as const, isCompound: false },
  { name: "Overhead Tricep Extension", nameZh: "過頭三頭伸展", category: "arms", muscleGroup: "triceps", equipment: "dumbbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Preacher Curl", nameZh: "牧師彎舉", category: "arms", muscleGroup: "biceps", equipment: "barbell", difficulty: "beginner" as const, isCompound: false },
  { name: "Close-Grip Bench Press", nameZh: "窄握臥推", category: "arms", muscleGroup: "triceps", secondaryMuscles: "chest,front_delt", equipment: "barbell", difficulty: "intermediate" as const, isCompound: true },

  // ── Core (6) ──
  { name: "Plank", nameZh: "棒式", category: "core", muscleGroup: "core", equipment: "bodyweight", difficulty: "beginner" as const, isCompound: false },
  { name: "Crunch", nameZh: "捲腹", category: "core", muscleGroup: "abs", equipment: "bodyweight", difficulty: "beginner" as const, isCompound: false },
  { name: "Russian Twist", nameZh: "俄式轉體", category: "core", muscleGroup: "obliques", equipment: "bodyweight", difficulty: "beginner" as const, isCompound: false },
  { name: "Hanging Leg Raise", nameZh: "懸吊舉腿", category: "core", muscleGroup: "abs", secondaryMuscles: "hip_flexors", equipment: "bodyweight", difficulty: "intermediate" as const, isCompound: false },
  { name: "Cable Woodchop", nameZh: "繩索劈柴", category: "core", muscleGroup: "obliques", equipment: "cable", difficulty: "intermediate" as const, isCompound: false },
  { name: "Ab Wheel Rollout", nameZh: "滾輪", category: "core", muscleGroup: "abs", secondaryMuscles: "lats,shoulders", equipment: "bodyweight", difficulty: "advanced" as const, isCompound: false },

  // ── Cardio (9) ──
  { name: "Running", nameZh: "跑步", category: "cardio", muscleGroup: "cardio", equipment: "bodyweight", difficulty: "beginner" as const, isCompound: true },
  { name: "Cycling", nameZh: "騎車", category: "cardio", muscleGroup: "cardio", secondaryMuscles: "quads,hamstrings", equipment: "machine", difficulty: "beginner" as const, isCompound: true },
  { name: "Rowing Machine", nameZh: "划船機", category: "cardio", muscleGroup: "cardio", secondaryMuscles: "back,biceps,legs", equipment: "machine", difficulty: "beginner" as const, isCompound: true },
  { name: "Jump Rope", nameZh: "跳繩", category: "cardio", muscleGroup: "cardio", secondaryMuscles: "calves,shoulders", equipment: "bodyweight", difficulty: "beginner" as const, isCompound: true },
  { name: "Stair Climber", nameZh: "爬樓梯機", category: "cardio", muscleGroup: "cardio", secondaryMuscles: "quads,glutes", equipment: "machine", difficulty: "beginner" as const, isCompound: true },
  { name: "Swimming", nameZh: "游泳", category: "cardio", muscleGroup: "cardio", secondaryMuscles: "back,shoulders,core", equipment: "bodyweight", difficulty: "intermediate" as const, isCompound: true },
  { name: "Elliptical", nameZh: "橢圓機", category: "cardio", muscleGroup: "cardio", equipment: "machine", difficulty: "beginner" as const, isCompound: true },
  { name: "HIIT", nameZh: "高強度間歇", category: "cardio", muscleGroup: "cardio", equipment: "bodyweight", difficulty: "advanced" as const, isCompound: true },
  { name: "Walking", nameZh: "步行", category: "cardio", muscleGroup: "cardio", equipment: "bodyweight", difficulty: "beginner" as const, isCompound: true },
];

// Seed exercises into DB (idempotent)
export async function seedExercises() {
  const db = await getDb();
  if (!db) return;

  // Check if already seeded
  const existing = await db.select().from(exercises).limit(1);
  if (existing.length > 0) return;

  // Batch insert
  await db.insert(exercises).values(EXERCISE_SEED_DATA);
  console.log(`[ExerciseLibrary] Seeded ${EXERCISE_SEED_DATA.length} exercises`);
}

// Get all exercises, optionally filtered by category
export async function getExercises(category?: string) {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    return db
      .select()
      .from(exercises)
      .where(eq(exercises.category, category));
  }
  return db.select().from(exercises);
}

// Get exercise by ID
export async function getExerciseById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [exercise] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);
  return exercise ?? null;
}
