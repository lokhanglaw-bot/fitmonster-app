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
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// FitMonster Tables
// ============================================

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  trainerName: varchar("trainerName", { length: 100 }),
  healthScore: int("healthScore").default(0).notNull(),
  totalSteps: int("totalSteps").default(0).notNull(),
  totalExp: int("totalExp").default(0).notNull(),
  coins: int("coins").default(0).notNull(),
  dailyCalorieGoal: int("dailyCalorieGoal").default(1800).notNull(),
  dailyProteinGoal: int("dailyProteinGoal").default(100).notNull(),
  dailyStepsGoal: int("dailyStepsGoal").default(10000).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const monsters = mysqlTable("monsters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  monsterType: mysqlEnum("monsterType", [
    "bodybuilder",
    "physique",
    "powerlifter",
    "athlete",
    "colossus",
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workouts = mysqlTable("workouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
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
  userId: int("userId").notNull(),
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
  userId: int("userId").notNull(),
  foodName: varchar("foodName", { length: 200 }).notNull(),
  calories: int("calories").notNull(),
  protein: int("protein").notNull(),
  carbs: int("carbs"),
  fats: int("fats"),
  imageUrl: text("imageUrl"),
  mealType: mysqlEnum("mealType", ["breakfast", "lunch", "dinner", "snack"]),
  expEarned: int("expEarned").default(0).notNull(),
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
  userId: int("userId").notNull(),
  questId: int("questId").notNull(),
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
  challengerId: int("challengerId").notNull(),
  opponentId: int("opponentId").notNull(),
  challengerMonsterId: int("challengerMonsterId").notNull(),
  opponentMonsterId: int("opponentMonsterId").notNull(),
  winnerId: int("winnerId"),
  battleType: mysqlEnum("battleType", ["pvp", "wild", "friendly"]).default("pvp").notNull(),
  status: mysqlEnum("status", ["pending", "active", "completed"]).default("pending").notNull(),
  expReward: int("expReward").default(0).notNull(),
  coinReward: int("coinReward").default(0).notNull(),
  battleLog: json("battleLog"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const matchSwipes = mysqlTable("matchSwipes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetUserId: int("targetUserId").notNull(),
  swipeType: mysqlEnum("swipeType", ["like", "nope", "super_like"]).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const friendships = mysqlTable("friendships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  friendId: int("friendId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "blocked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Type Exports
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
