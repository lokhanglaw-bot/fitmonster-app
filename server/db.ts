import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  profiles,
  monsters,
  workouts,
  dailyStats,
  foodLogs,
  quests,
  userQuests,
  battles,
  matchSwipes,
  friendships,
  InsertUser,
  InsertProfile,
  InsertMonster,
  InsertWorkout,
  InsertDailyStats,
  InsertFoodLog,
  InsertQuest,
  InsertUserQuest,
  InsertBattle,
  InsertMatchSwipe,
  InsertFriendship,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// FitMonster Database Functions
// ============================================

// Profile Management
export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result[0] || null;
}

export async function createProfile(data: InsertProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(profiles).values(data) as any;
  return Number(result.insertId);
}

export async function updateProfile(userId: number, data: Partial<InsertProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(profiles).set(data).where(eq(profiles.userId, userId));
}

// Monster Management
export async function getUserMonsters(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(monsters).where(eq(monsters.userId, userId)).orderBy(desc(monsters.isActive));
}

export async function getActiveMonster(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(monsters).where(and(eq(monsters.userId, userId), eq(monsters.isActive, true))).limit(1);
  return result[0] || null;
}

export async function createMonster(data: InsertMonster) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(monsters).values(data) as any;
  return Number(result.insertId);
}

export async function updateMonster(monsterId: number, data: Partial<InsertMonster>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(monsters).set(data).where(eq(monsters.id, monsterId));
}

// Workout Management
export async function getUserWorkouts(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workouts).where(eq(workouts.userId, userId)).orderBy(desc(workouts.date)).limit(limit);
}

export async function createWorkout(data: InsertWorkout) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workouts).values(data) as any;
  return Number(result.insertId);
}

// Daily Stats Management
export async function getDailyStats(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(dailyStats).where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, date))).limit(1);
  return result[0] || null;
}

export async function upsertDailyStats(userId: number, date: string, data: Partial<InsertDailyStats>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getDailyStats(userId, date);
  if (existing) {
    await db.update(dailyStats).set(data).where(and(eq(dailyStats.userId, userId), eq(dailyStats.date, date)));
    return existing.id;
  } else {
    const result = await db.insert(dailyStats).values({ userId, date, ...data }) as any;
    return Number(result.insertId);
  }
}

// Food Log Management
export async function getUserFoodLogs(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foodLogs).where(eq(foodLogs.userId, userId)).orderBy(desc(foodLogs.date)).limit(limit);
}

export async function createFoodLog(data: InsertFoodLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(foodLogs).values(data) as any;
  return Number(result.insertId);
}

// Quest Management
export async function getAllQuests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quests).where(eq(quests.isDaily, true));
}

export async function createQuest(data: InsertQuest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quests).values(data) as any;
  return Number(result.insertId);
}

export async function getUserQuests(userId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ userQuest: userQuests, quest: quests }).from(userQuests).innerJoin(quests, eq(userQuests.questId, quests.id)).where(and(eq(userQuests.userId, userId), eq(userQuests.date, date)));
}

export async function createUserQuest(data: InsertUserQuest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userQuests).values(data) as any;
  return Number(result.insertId);
}

export async function updateUserQuestProgress(userId: number, questId: number, date: string, progress: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userQuests).set({ currentProgress: progress }).where(and(eq(userQuests.userId, userId), eq(userQuests.questId, questId), eq(userQuests.date, date)));
}

// Battle Management
export async function getUserBattles(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(battles).where(sql`${battles.challengerId} = ${userId} OR ${battles.opponentId} = ${userId}`).orderBy(desc(battles.createdAt)).limit(limit);
}

export async function createBattle(data: InsertBattle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(battles).values(data) as any;
  return Number(result.insertId);
}

export async function updateBattle(battleId: number, data: Partial<InsertBattle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(battles).set(data).where(eq(battles.id, battleId));
}

// Match/Swipe Management
export async function getUserSwipesToday(userId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchSwipes).where(and(eq(matchSwipes.userId, userId), eq(matchSwipes.date, date)));
}

export async function createMatchSwipe(data: InsertMatchSwipe) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(matchSwipes).values(data) as any;
  return Number(result.insertId);
}

// Friendship Management
export async function getUserFriends(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendships).where(and(sql`${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId}`, eq(friendships.status, "accepted")));
}

export async function createFriendship(data: InsertFriendship) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(friendships).values(data) as any;
  return Number(result.insertId);
}

export async function updateFriendship(friendshipId: number, status: "pending" | "accepted" | "blocked") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(friendships).set({ status }).where(eq(friendships.id, friendshipId));
}
