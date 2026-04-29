import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  mysqlEnum,
  float,
  json,
} from "drizzle-orm/mysql-core";
import { randomUUID } from "crypto";

// Fitness bonus type for battle system
export type FitnessBonuses = {
  workedOut: boolean;
  proteinMet: boolean;
  steps10k: boolean;
  bodyFatLow: boolean;
  peakState: boolean;
  streak7days: boolean;
  damageMultiplier: number;
  extraHp: number;
  tieBreakAdvantage: boolean;
};

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordHash: varchar("passwordHash", { length: 128 }),
  passwordSalt: varchar("passwordSalt", { length: 64 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// FitMonster Tables
// ============================================

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  trainerName: varchar("trainerName", { length: 100 }),
  healthScore: int("healthScore").default(0).notNull(),
  totalSteps: int("totalSteps").default(0).notNull(),
  totalExp: int("totalExp").default(0).notNull(),
  coins: int("coins").default(0).notNull(),
  dailyCalorieGoal: int("dailyCalorieGoal").default(1800).notNull(),
  dailyProteinGoal: int("dailyProteinGoal").default(100).notNull(),
  dailyStepsGoal: int("dailyStepsGoal").default(10000).notNull(),
  age: int("age"),
  birthday: varchar("birthday", { length: 10 }),
  gender: mysqlEnum("gender", ["male", "female"]),
  height: float("height"),
  weight: float("weight"),
  bmr: float("bmr"),
  matchGenderPreference: mysqlEnum("matchGenderPreference", ["all", "male", "female"]).default("all"),
  matchRadius: float("matchRadius").default(5).notNull(),
  profileCompleted: boolean("profileCompleted").default(false).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const monsters = mysqlTable("monsters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  monsterType: mysqlEnum("monsterType", [
    "bodybuilder",
    "physique",
    "powerlifter",
    "athlete",
    "colossus",
    "bodybuilder2",
    "physique2",
    "powerlifter2",
  ]).default("bodybuilder").notNull(),
  level: int("level").default(1).notNull(),
  currentHp: int("currentHp").default(100).notNull(),
  maxHp: int("maxHp").default(100).notNull(),
  currentExp: int("currentExp").default(0).notNull(),
  expToNextLevel: int("expToNextLevel").default(100).notNull(),
  strength: int("strength").default(10).notNull(),
  defense: int("defense").default(10).notNull(),
  agility: int("agility").default(10).notNull(),
  evolutionProgress: int("evolutionProgress").default(0).notNull(),
  evolutionStage: int("evolutionStage").default(1).notNull(),
  status: mysqlEnum("status", ["rookie", "in_battle", "training", "resting"]).default("rookie").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  imageUrl: text("imageUrl"),
  // v2.0 body type fields
  muscleScore: float("muscleScore").default(50).notNull(),
  fatScore: float("fatScore").default(50).notNull(),
  bodyType: varchar("bodyType", { length: 20 }).default("standard").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workouts = mysqlTable("workouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseType: varchar("exerciseType", { length: 100 }).notNull(),
  exerciseName: varchar("exerciseName", { length: 200 }).notNull(),
  duration: int("duration").notNull(),
  metValue: float("metValue").notNull(),
  caloriesBurned: int("caloriesBurned").notNull(),
  expEarned: int("expEarned").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const dailyStats = mysqlTable("dailyStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  steps: int("steps").default(0).notNull(),
  caloriesIntake: int("caloriesIntake").default(0).notNull(),
  caloriesBurned: int("caloriesBurned").default(0).notNull(),
  proteinIntake: int("proteinIntake").default(0).notNull(),
  workoutExp: int("workoutExp").default(0).notNull(),
  nutritionExp: int("nutritionExp").default(0).notNull(),
  netExp: int("netExp").default(0).notNull(),
  healthScore: int("healthScore").default(0).notNull(),
  workoutsCompleted: int("workoutsCompleted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const foodLogs = mysqlTable("foodLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  foodName: varchar("foodName", { length: 200 }).notNull(),
  calories: int("calories").notNull(),
  protein: int("protein").notNull(),
  carbs: int("carbs"),
  fats: int("fats"),
  imageUrl: text("imageUrl"),
  mealType: mysqlEnum("mealType", ["breakfast", "lunch", "dinner", "snack"]),
  expEarned: int("expEarned").default(0).notNull(),
  // v2.0 sugar tracking fields
  addedSugar: float("addedSugar"),
  saturatedFat: float("saturatedFat"),
  sodium: float("sodium"),
  glycemicIndex: varchar("glycemicIndex", { length: 10 }),
  fiber: float("fiber"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const quests = mysqlTable("quests", {
  id: int("id").autoincrement().primaryKey(),
  questType: varchar("questType", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  targetValue: int("targetValue").notNull(),
  rewardCoins: int("rewardCoins").notNull(),
  rewardExp: int("rewardExp").notNull(),
  icon: varchar("icon", { length: 50 }),
  isDaily: boolean("isDaily").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userQuests = mysqlTable("userQuests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  questId: int("questId").notNull().references(() => quests.id, { onDelete: "cascade" }),
  currentProgress: int("currentProgress").default(0).notNull(),
  targetValue: int("targetValue").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  date: varchar("date", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const battles = mysqlTable("battles", {
  id: int("id").autoincrement().primaryKey(),
  challengerId: int("challengerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  opponentId: int("opponentId").notNull().references(() => users.id, { onDelete: "cascade" }),
  challengerMonsterId: int("challengerMonsterId").notNull().references(() => monsters.id, { onDelete: "cascade" }),
  opponentMonsterId: int("opponentMonsterId").notNull().references(() => monsters.id, { onDelete: "cascade" }),
  winnerId: int("winnerId"),
  battleType: mysqlEnum("battleType", ["pvp", "wild", "friendly"]).default("pvp").notNull(),
  status: mysqlEnum("status", ["pending", "active", "completed"]).default("pending").notNull(),
  expReward: int("expReward").default(0).notNull(),
  coinReward: int("coinReward").default(0).notNull(),
  battleLog: json("battleLog"),
  // v2.0 RPS battle fields
  player1Hp: float("player1Hp").default(100).notNull(),
  player2Hp: float("player2Hp").default(100).notNull(),
  currentRound: int("currentRound").default(0).notNull(),
  player1FitnessBonus: json("p1FitnessBonus").$type<FitnessBonuses>(),
  player2FitnessBonus: json("p2FitnessBonus").$type<FitnessBonuses>(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const matchSwipes = mysqlTable("matchSwipes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetUserId: int("targetUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  swipeType: mysqlEnum("swipeType", ["like", "nope", "super_like"]).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const friendships = mysqlTable("friendships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId: int("friendId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "accepted", "blocked"]).default("pending").notNull(),
  hideLocation: boolean("hideLocation").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userLocations = mysqlTable("userLocations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  latitude: float("latitude").notNull(),
  longitude: float("longitude").notNull(),
  isSharing: boolean("isSharing").default(false).notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============================================
// Chat Messages
// ============================================
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: int("receiverId").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  messageType: mysqlEnum("messageType", ["text", "image", "audio", "system"]).default("text").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============================================
// Push Notification Tokens
// ============================================
export const pushTokens = mysqlTable("pushTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["ios", "android", "web"]).default("ios").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============================================
// Monster Caring System
// ============================================
export const monsterCaring = mysqlTable("monsterCaring", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fullness: int("fullness").default(70).notNull(), // 0-100 satiety
  energy: int("energy").default(70).notNull(), // 0-100 vitality
  mood: int("mood").default(70).notNull(), // 0-100 mood
  lastDecayAt: timestamp("lastDecayAt").defaultNow().notNull(), // last time decay was applied
  lastFedAt: timestamp("lastFedAt"), // last time monster was fed
  lastExerciseAt: timestamp("lastExerciseAt"), // last time exercise was logged
  dailyHpLoss: int("dailyHpLoss").default(0).notNull(), // HP lost today from hunger (cap at 20)
  nutritionAdvice: text("nutritionAdvice"), // current nutrition advice text (JSON)
  nutritionAdviceDate: varchar("nutritionAdviceDate", { length: 10 }), // date of last advice
  consecutiveBalancedDays: int("consecutiveBalancedDays").default(0).notNull(),
  consecutiveExerciseDays: int("consecutiveExerciseDays").default(0).notNull(),
  peakStateBuff: boolean("peakStateBuff").default(false).notNull(), // fullness >= 70 && energy >= 70
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============================================
// Password Reset Tokens (FIX 3)
// ============================================
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Type Exports
export type MonsterCaring = typeof monsterCaring.$inferSelect;
export type InsertMonsterCaring = typeof monsterCaring.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

export type Monster = typeof monsters.$inferSelect;
export type InsertMonster = typeof monsters.$inferInsert;

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;

export type DailyStats = typeof dailyStats.$inferSelect;
export type InsertDailyStats = typeof dailyStats.$inferInsert;

export type FoodLog = typeof foodLogs.$inferSelect;
export type InsertFoodLog = typeof foodLogs.$inferInsert;

export type Quest = typeof quests.$inferSelect;
export type InsertQuest = typeof quests.$inferInsert;

export type UserQuest = typeof userQuests.$inferSelect;
export type InsertUserQuest = typeof userQuests.$inferInsert;

export type Battle = typeof battles.$inferSelect;
export type InsertBattle = typeof battles.$inferInsert;

export type MatchSwipe = typeof matchSwipes.$inferSelect;
export type InsertMatchSwipe = typeof matchSwipes.$inferInsert;

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = typeof userLocations.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

// ============================================
// v2.0 Body Stats (daily body composition tracking)
// ============================================
export const bodyStats = mysqlTable("bodyStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  muscleScore: float("muscleScore").default(50).notNull(),
  fatScore: float("fatScore").default(50).notNull(),
  bodyType: varchar("bodyType", { length: 20 }).default("standard").notNull(),
  calorieBalance: int("calorieBalance").default(0).notNull(),
  proteinAdequate: boolean("proteinAdequate").default(false).notNull(),
  hadStrengthTraining: boolean("hadStrengthTraining").default(false).notNull(),
  hadCardio: boolean("hadCardio").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BodyStats = typeof bodyStats.$inferSelect;
export type InsertBodyStats = typeof bodyStats.$inferInsert;

// ============================================
// v2.0 Exercise Library (150+ exercises)
// ============================================
export const exercises = mysqlTable("exercises", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameZh: varchar("nameZh", { length: 100 }),
  category: varchar("category", { length: 50 }).notNull(), // chest, back, legs, shoulders, arms, core, cardio
  muscleGroup: varchar("muscleGroup", { length: 50 }).notNull(), // primary muscle group
  secondaryMuscles: varchar("secondaryMuscles", { length: 200 }), // comma-separated
  equipment: varchar("equipment", { length: 50 }), // barbell, dumbbell, cable, machine, bodyweight
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  instructions: text("instructions"),
  isCompound: boolean("isCompound").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = typeof exercises.$inferInsert;

// ============================================
// v2.0 Workout Sets (per-set tracking)
// ============================================
export const workoutSets = mysqlTable("workoutSets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutId: int("workoutId").references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: int("exerciseId").references(() => exercises.id),
  exerciseName: varchar("exerciseName", { length: 100 }).notNull(),
  setNumber: int("setNumber").notNull(),
  setType: mysqlEnum("setType", ["warmup", "working", "failure", "drop", "super"]).default("working").notNull(),
  weight: float("weight"), // kg
  reps: int("reps"),
  duration: int("duration"), // seconds (for timed exercises)
  rpe: float("rpe"), // rate of perceived exertion 1-10
  isPR: boolean("isPR").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkoutSet = typeof workoutSets.$inferSelect;
export type InsertWorkoutSet = typeof workoutSets.$inferInsert;

// ============================================
// v2.0 Personal Records
// ============================================
export const personalRecords = mysqlTable("personalRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseId: int("exerciseId").references(() => exercises.id),
  exerciseName: varchar("exerciseName", { length: 100 }).notNull(),
  recordType: mysqlEnum("recordType", ["weight", "reps", "volume", "duration"]).default("weight").notNull(),
  value: float("value").notNull(),
  previousValue: float("previousValue"),
  workoutSetId: int("workoutSetId").references(() => workoutSets.id),
  achievedAt: timestamp("achievedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type InsertPersonalRecord = typeof personalRecords.$inferInsert;

// ============================================
// v2.0 Battle Rounds (RPS per-round tracking)
// ============================================
export const battleRounds = mysqlTable("battleRounds", {
  id: int("id").autoincrement().primaryKey(),
  battleId: int("battleId").notNull().references(() => battles.id, { onDelete: "cascade" }),
  roundNumber: int("roundNumber").notNull(),
  player1Move: varchar("player1Move", { length: 20 }), // powerStrike, evade, counter
  player2Move: varchar("player2Move", { length: 20 }),
  player1Damage: float("player1Damage").default(0).notNull(), // damage taken by p1
  player2Damage: float("player2Damage").default(0).notNull(), // damage taken by p2
  result: varchar("result", { length: 10 }), // p1win, p2win, draw
  player1HpAfter: float("player1HpAfter"),
  player2HpAfter: float("player2HpAfter"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BattleRound = typeof battleRounds.$inferSelect;
export type InsertBattleRound = typeof battleRounds.$inferInsert;
