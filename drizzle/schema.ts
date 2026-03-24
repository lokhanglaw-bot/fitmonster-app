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
  userId: int("user_id").notNull(),
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
