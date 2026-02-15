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
  userLocations,
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
  InsertUserLocation,
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

// ============================================
// Location Management
// ============================================

export async function upsertUserLocation(userId: number, latitude: number, longitude: number, isSharing: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(userLocations).where(eq(userLocations.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(userLocations).set({ latitude, longitude, isSharing, lastUpdated: new Date() }).where(eq(userLocations.userId, userId));
    return existing[0].id;
  } else {
    const result = await db.insert(userLocations).values({ userId, latitude, longitude, isSharing }) as any;
    return Number(result.insertId);
  }
}

export async function getNearbyUsers(userId: number, latitude: number, longitude: number, radiusKm: number = 10) {
  const db = await getDb();
  if (!db) return [];
  // Get all users sharing their location (except current user)
  const allLocations = await db.select({
    locationId: userLocations.id,
    userId: userLocations.userId,
    latitude: userLocations.latitude,
    longitude: userLocations.longitude,
    lastUpdated: userLocations.lastUpdated,
    isSharing: userLocations.isSharing,
  }).from(userLocations).where(and(
    sql`${userLocations.userId} != ${userId}`,
    eq(userLocations.isSharing, true)
  ));

  // Calculate distance using Haversine formula and filter by radius
  const nearbyUsers = allLocations.filter(loc => {
    const R = 6371; // Earth radius in km
    const dLat = (loc.latitude - latitude) * Math.PI / 180;
    const dLon = (loc.longitude - longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(latitude * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radiusKm;
  }).map(loc => {
    const R = 6371;
    const dLat = (loc.latitude - latitude) * Math.PI / 180;
    const dLon = (loc.longitude - longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(latitude * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { ...loc, distanceKm: Math.round(R * c * 10) / 10 };
  });

  return nearbyUsers;
}

// Get user info with profile and active monster for nearby display
export async function getUserInfoForNearby(userIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (userIds.length === 0) return [];
  
  const results = [];
  for (const uid of userIds) {
    const userResult = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    const profileResult = await db.select().from(profiles).where(eq(profiles.userId, uid)).limit(1);
    const monsterResult = await db.select().from(monsters).where(and(eq(monsters.userId, uid), eq(monsters.isActive, true))).limit(1);
    
    if (userResult[0]) {
      results.push({
        user: userResult[0],
        profile: profileResult[0] || null,
        activeMonster: monsterResult[0] || null,
      });
    }
  }
  return results;
}

// Get pending friend requests for a user
export async function getPendingFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendships).where(and(
    eq(friendships.friendId, userId),
    eq(friendships.status, "pending")
  ));
}

// Check if a friendship already exists between two users
export async function checkFriendship(userId: number, friendId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(friendships).where(
    sql`(${friendships.userId} = ${userId} AND ${friendships.friendId} = ${friendId}) OR (${friendships.userId} = ${friendId} AND ${friendships.friendId} = ${userId})`
  ).limit(1);
  return result[0] || null;
}

// Get friends with their profile and monster info
export async function getFriendsWithInfo(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const acceptedFriendships = await db.select().from(friendships).where(and(
    sql`${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId}`,
    eq(friendships.status, "accepted")
  ));
  
  const friendIds = acceptedFriendships.map(f => 
    f.userId === userId ? f.friendId : f.userId
  );
  
  if (friendIds.length === 0) return [];
  
  const friendsInfo = await getUserInfoForNearby(friendIds);
  return friendsInfo;
}
