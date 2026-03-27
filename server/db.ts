import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash, randomBytes } from "crypto";
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
  passwordResetTokens,
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

    // FIX 25: Always update lastSignedIn on login, even if no other fields changed
    updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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
// Password Hashing Helpers
// ============================================

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(password + salt).digest("hex");
}

function generateSalt(): string {
  return randomBytes(32).toString("hex");
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// FIX 25: Atomic upsert for Apple user creation (prevents TOCTOU race condition)
export async function createOrLoginAppleUser(data: {
  appleUserId: string;
  email: string | null;
  name: string | null;
}): Promise<{ id: number; openId: string; name: string | null; email: string | null; accountLinked?: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openId = `apple-${data.appleUserId}`;

  // Step 1: Check if a user with the same email already exists (account linking)
  if (data.email) {
    const emailUser = await getUserByEmail(data.email);
    if (emailUser && emailUser.openId !== openId) {
      // Bug 8: Link Apple ID to existing account (accountLinked flag for client notification)
      await db.update(users).set({
        openId,
        loginMethod: "apple",
        lastSignedIn: new Date(),
      }).where(eq(users.id, emailUser.id));
      return {
        id: emailUser.id,
        openId,
        name: data.name || emailUser.name,
        email: emailUser.email,
        accountLinked: true,
      };
    }
  }

  // Step 2: Atomic upsert — insert new user or update existing on openId conflict
  await db.insert(users).values({
    openId,
    name: data.name || "Apple User",
    email: data.email,
    loginMethod: "apple",
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      lastSignedIn: new Date(),
      // Only update name/email if they were previously null
      ...(data.name ? { name: sql`COALESCE(NULLIF(${users.name}, ''), ${data.name})` } : {}),
      ...(data.email ? { email: sql`COALESCE(${users.email}, ${data.email})` } : {}),
    },
  });

  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("Failed to create/update Apple user");
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
  };
}

// FIX 25: Atomic upsert for Google user creation (prevents TOCTOU race condition)
export async function createOrLoginGoogleUser(data: {
  googleUserId: string;
  email: string;
  name: string | null;
}): Promise<{ id: number; openId: string; name: string | null; email: string | null; accountLinked?: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openId = `google-${data.googleUserId}`;

  // Step 1: Check if a user with the same email already exists (account linking)
  if (data.email) {
    const emailUser = await getUserByEmail(data.email);
    if (emailUser && emailUser.openId !== openId) {
      // Bug 8: Link Google ID to existing account (accountLinked flag for client notification)
      await db.update(users).set({
        openId,
        loginMethod: "google",
        lastSignedIn: new Date(),
      }).where(eq(users.id, emailUser.id));
      return {
        id: emailUser.id,
        openId,
        name: data.name || emailUser.name,
        email: emailUser.email,
        accountLinked: true,
      };
    }
  }

  // Step 2: Atomic upsert — insert new user or update existing on openId conflict
  await db.insert(users).values({
    openId,
    name: data.name || "Google User",
    email: data.email,
    loginMethod: "google",
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      lastSignedIn: new Date(),
      // Only update name/email if they were previously null
      ...(data.name ? { name: sql`COALESCE(NULLIF(${users.name}, ''), ${data.name})` } : {}),
      ...(data.email ? { email: sql`COALESCE(${users.email}, ${data.email})` } : {}),
    },
  });

  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("Failed to create/update Google user");
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
  };
}

export async function createLocalUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: number; openId: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already exists with this email
  const existing = await getUserByEmail(data.email);
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const salt = generateSalt();
  const hash = hashPassword(data.password, salt);
  const openId = `local-${data.email.trim()}`;

  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    loginMethod: "local",
    passwordHash: hash,
    passwordSalt: salt,
    lastSignedIn: new Date(),
  });

  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("Failed to create user");
  return { id: user.id, openId: user.openId };
}

export async function verifyLocalUser(email: string, password: string): Promise<{ id: number; openId: string; name: string | null; status: "ok" | "needs_password" } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await getUserByEmail(email);
  if (!user) return null;
  if (!user.passwordHash || !user.passwordSalt) {
    // Legacy user without password — return special status
    return { id: user.id, openId: user.openId, name: user.name, status: "needs_password" };
  }

  const hash = hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) {
    return null; // Wrong password
  }

  // Update lastSignedIn
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

  return { id: user.id, openId: user.openId, name: user.name, status: "ok" };
}

// Legacy — kept for backward compatibility but no longer used by the password reset flow
// export async function resetPasswordByEmail(...) { ... }

// Check if a user exists by email (for forgot password validation)
export async function checkUserExistsByEmail(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  return !!user;
}

// ============================================
// Password Reset Token Helpers  (Fix 1)
// ============================================

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const user = await getUserByEmail(email);
  if (!user) return null; // Silently return null — do NOT reveal if email exists

  // Invalidate any existing unused tokens for this user
  await db.delete(passwordResetTokens).where(
    and(
      eq(passwordResetTokens.userId, user.id),
      sql`${passwordResetTokens.usedAt} IS NULL`,
    ),
  );

  const token = randomBytes(32).toString("hex"); // 64-char hex string
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });
  return token;
}

export async function getUserEmailByResetToken(token: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  if (rows.length === 0) return null;
  const record = rows[0];
  if (record.usedAt) return null;                       // Already used
  if (record.expiresAt < new Date()) return null;       // Expired

  const user = await getUserById(record.userId);
  return user?.email ?? null;
}

export async function resetPasswordByToken(
  token: string,
  newPassword: string,
): Promise<{ id: number; openId: string; name: string | null } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  if (rows.length === 0) return null;
  const record = rows[0];
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  const salt = generateSalt();
  const hash = hashPassword(newPassword, salt);

  // Mark token used AND update password atomically in one transaction
  await db.transaction(async (tx) => {
    await tx.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));
    await tx.update(users)
      .set({ passwordHash: hash, passwordSalt: salt, lastSignedIn: new Date() })
      .where(eq(users.id, record.userId));
  });

  const user = await getUserById(record.userId);
  if (!user) return null;
  return { id: user.id, openId: user.openId, name: user.name };
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
  console.log(`[Location] User ${userId} updating location: (${latitude}, ${longitude}), sharing: ${isSharing}`);
  const existing = await db.select().from(userLocations).where(eq(userLocations.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(userLocations).set({ latitude, longitude, isSharing, lastUpdated: new Date() }).where(eq(userLocations.userId, userId));
    console.log(`[Location] Updated existing location for user ${userId}`);
    return existing[0].id;
  } else {
    const result = await db.insert(userLocations).values({ userId, latitude, longitude, isSharing }) as any;
    console.log(`[Location] Created new location for user ${userId}, id: ${Number(result.insertId)}`);
    return Number(result.insertId);
  }
}

export async function getUserSharingStatus(userId: number): Promise<{ isSharing: boolean }> {
  const db = await getDb();
  if (!db) return { isSharing: false };
  const result = await db.select({ isSharing: userLocations.isSharing }).from(userLocations).where(eq(userLocations.userId, userId)).limit(1);
  return { isSharing: result[0]?.isSharing ?? false };
}

export async function getNearbyUsers(userId: number, latitude: number, longitude: number, radiusKm: number = 5) {
  const db = await getDb();
  if (!db) return [];
  // Get all users sharing their location (except current user), filter out locations older than 24 hours
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const allLocations = await db.select({
    locationId: userLocations.id,
    userId: userLocations.userId,
    latitude: userLocations.latitude,
    longitude: userLocations.longitude,
    lastUpdated: userLocations.lastUpdated,
    isSharing: userLocations.isSharing,
  }).from(userLocations).where(and(
    sql`${userLocations.userId} != ${userId}`,
    eq(userLocations.isSharing, true),
    sql`${userLocations.lastUpdated} > ${cutoffTime}`
  ));
  console.log(`[Nearby] Radius: ${radiusKm} km, found: ${allLocations.length} sharing users (within 24h) in DB for user ${userId} at (${latitude}, ${longitude})`);

  // Calculate distance using Haversine formula, exclude self (distance > 0.0001km), filter by radius
  const nearbyUsers = allLocations.map(loc => {
    const R = 6371; // Earth radius in km
    const dLat = (loc.latitude - latitude) * Math.PI / 180;
    const dLon = (loc.longitude - longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(latitude * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return { ...loc, distanceKm: Math.round(distance * 10) / 10, rawDistance: distance };
  }).filter(loc => {
    // Exclude self (distance < 0.0001 km ≈ 0.1m) and filter by radius
    return loc.rawDistance > 0.0001 && loc.rawDistance <= radiusKm;
  }).map(({ rawDistance, ...rest }) => rest);

  console.log(`[Nearby] Radius: ${radiusKm} km, found: ${nearbyUsers.length} users within range`);
  return nearbyUsers;
}

// Get user's gender preference from profile
export async function getUserGenderPreference(userId: number): Promise<"all" | "male" | "female"> {
  const db = await getDb();
  if (!db) return "all";
  const result = await db.select({ matchGenderPreference: profiles.matchGenderPreference }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return (result[0]?.matchGenderPreference as "all" | "male" | "female") || "all";
}

// Get user's match radius from profile
export async function getUserMatchRadius(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 5;
  const result = await db.select({ matchRadius: profiles.matchRadius }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result[0]?.matchRadius ?? 5;
}

// Update user's match radius
export async function updateMatchRadius(userId: number, radiusKm: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(profiles).set({ matchRadius: radiusKm }).where(eq(profiles.userId, userId));
}

// Get user info with profile and active monster for nearby display
// FIX 14: Batch queries (3 total instead of 3N)
export async function getUserInfoForNearby(userIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (userIds.length === 0) return [];
  
  const [allUsers, allProfiles, allMonsters] = await Promise.all([
    db.select().from(users).where(inArray(users.id, userIds)),
    db.select().from(profiles).where(inArray(profiles.userId, userIds)),
    db.select().from(monsters).where(and(inArray(monsters.userId, userIds), eq(monsters.isActive, true))),
  ]);
  
  return allUsers.map(u => ({
    user: u,
    profile: allProfiles.find(p => p.userId === u.id) || null,
    activeMonster: allMonsters.find(m => m.userId === u.id) || null,
  }));
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

// Get sent friend requests (where current user is the sender)
export async function getSentFriendRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendships).where(and(
    eq(friendships.userId, userId),
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

// Get friends' locations (only those who are sharing, respecting hideLocation)
export async function getFriendsLocations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get accepted friendships (exclude those where hideLocation is true)
  const acceptedFriendships = await db.select().from(friendships).where(and(
    sql`${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId}`,
    eq(friendships.status, "accepted"),
    eq(friendships.hideLocation, false)
  ));
  
  const friendIds = acceptedFriendships.map(f => 
    f.userId === userId ? f.friendId : f.userId
  );
  
  if (friendIds.length === 0) return [];
  
  // Batch query: get all friends' locations in one query (fixes N+1 problem)
  const results = await db.select().from(userLocations).where(
    and(inArray(userLocations.userId, friendIds), eq(userLocations.isSharing, true))
  );
  
  // Enrich with user info
  const locUserIds = results.map(r => r.userId);
  const usersInfo = await getUserInfoForNearby(locUserIds);
  
  return results.map(loc => {
    const info = usersInfo.find(u => u.user.id === loc.userId);
    return {
      userId: loc.userId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      lastUpdated: loc.lastUpdated,
      name: info?.activeMonster?.name || info?.profile?.trainerName || 'Trainer',
      monsterType: info?.activeMonster?.monsterType || 'bodybuilder',
      monsterName: info?.activeMonster?.name || null,
      monsterLevel: info?.activeMonster?.level || 1,
      monsterStage: info?.activeMonster?.evolutionStage || 1,
      monsterImageUrl: info?.activeMonster?.imageUrl || null,
    };
  });
}

// Toggle hideLocation for a specific friendship
export async function toggleFriendHideLocation(userId: number, friendId: number, hide: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Find the friendship row (could be in either direction)
  const result = await db.select().from(friendships).where(
    sql`(${friendships.userId} = ${userId} AND ${friendships.friendId} = ${friendId}) OR (${friendships.userId} = ${friendId} AND ${friendships.friendId} = ${userId})`
  ).limit(1);
  if (result[0]) {
    await db.update(friendships).set({ hideLocation: hide }).where(eq(friendships.id, result[0].id));
  }
}

// Get hideLocation status for all friends
export async function getFriendsHideStatus(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const all = await db.select().from(friendships).where(and(
    sql`${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId}`,
    eq(friendships.status, "accepted")
  ));
  return all.map(f => ({
    friendshipId: f.id,
    friendId: f.userId === userId ? f.friendId : f.userId,
    hideLocation: f.hideLocation,
  }));
}

// ============================================
// Test Fake Users
// ============================================

export async function insertFakeUsers(centerLat: number, centerLng: number, count: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const fakeUserIds: number[] = [];
  for (let i = 0; i < count; i++) {
    try {
      // Random position within ~5km radius
      const angle = Math.random() * 2 * Math.PI;
      const radiusKm = Math.random() * 5;
      const dLat = (radiusKm / 111.32) * Math.cos(angle);
      const dLng = (radiusKm / (111.32 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
      const lat = centerLat + dLat;
      const lng = centerLng + dLng;
      const gender = Math.random() > 0.5 ? "male" : "female";
      const openId = `fake_test_user_${Date.now()}_${i}`;
      
      // Create user - extract insertId robustly
      const userResult = await db.insert(users).values({ openId, name: `FakeTrainer${i + 1}` }) as any;
      // mysql2 may return insertId as result.insertId or result[0]?.insertId
      const uid = Number(userResult.insertId ?? userResult[0]?.insertId);
      if (isNaN(uid) || uid <= 0) {
        console.error(`[Test] Failed to get valid userId for FakeTrainer${i + 1}, insertId:`, userResult.insertId, userResult[0]?.insertId);
        // Fallback: query the user we just created
        const created = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
        if (!created[0]) {
          console.error(`[Test] Could not find user with openId ${openId}, skipping`);
          continue;
        }
        const fallbackId = created[0].id;
        fakeUserIds.push(fallbackId);
        
        await db.insert(profiles).values({
          userId: fallbackId,
          trainerName: `FakeTrainer${i + 1}`,
          gender,
          profileCompleted: true,
        });
        
        const types = ["bodybuilder", "physique", "powerlifter"] as const;
        await db.insert(monsters).values({
          userId: fallbackId,
          name: `Monster${i + 1}`,
          monsterType: types[Math.floor(Math.random() * types.length)],
          level: Math.floor(Math.random() * 20) + 1,
          isActive: true,
        });
        
        await db.insert(userLocations).values({
          userId: fallbackId,
          latitude: lat,
          longitude: lng,
          isSharing: true,
          lastUpdated: new Date(),
        });
        continue;
      }
      
      fakeUserIds.push(uid);
      
      // Create profile
      await db.insert(profiles).values({
        userId: uid,
        trainerName: `FakeTrainer${i + 1}`,
        gender,
        profileCompleted: true,
      });
      
      // Create monster
      const types = ["bodybuilder", "physique", "powerlifter"] as const;
      await db.insert(monsters).values({
        userId: uid,
        name: `Monster${i + 1}`,
        monsterType: types[Math.floor(Math.random() * types.length)],
        level: Math.floor(Math.random() * 20) + 1,
        isActive: true,
      });
      
      // Create location (sharing, fresh timestamp - explicit lastUpdated)
      await db.insert(userLocations).values({
        userId: uid,
        latitude: lat,
        longitude: lng,
        isSharing: true,
        lastUpdated: new Date(),
      });
    } catch (err: any) {
      console.error(`[Test] Error creating fake user ${i + 1}:`, err?.message || err);
      // Continue with next user
    }
  }
  
  console.log(`[Test] Successfully created ${fakeUserIds.length} fake users`);
  return fakeUserIds;
}

export async function deleteFakeUsers(userIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const uid of userIds) {
    await db.delete(userLocations).where(eq(userLocations.userId, uid));
    await db.delete(monsters).where(eq(monsters.userId, uid));
    await db.delete(profiles).where(eq(profiles.userId, uid));
    await db.delete(users).where(eq(users.id, uid));
  }
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

// Get friendship between two specific users (any status)
export async function getFriendshipBetween(userId: number, friendId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(friendships).where(
    sql`(${friendships.userId} = ${userId} AND ${friendships.friendId} = ${friendId}) OR (${friendships.userId} = ${friendId} AND ${friendships.friendId} = ${userId})`
  ).limit(1);
  return result[0] || null;
}

// Delete friendship (unfriend) - removes the record entirely
export async function deleteFriendship(userId: number, friendId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(friendships).where(
    sql`(${friendships.userId} = ${userId} AND ${friendships.friendId} = ${friendId}) OR (${friendships.userId} = ${friendId} AND ${friendships.friendId} = ${userId})`
  );
}

// Delete user account and all associated data
// All child tables have onDelete: "cascade", so deleting the user row cascades automatically.
// We still manually delete tables that use compound WHERE (OR conditions) as a safety net.
export async function deleteUserAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const {
    chatMessages, battles, matchSwipes, friendships, foodLogs, monsters,
  } = await import("../drizzle/schema");
  const { storageDelete } = await import("./storage");
  
  // Step 0: Clean up S3 files BEFORE deleting DB rows
  // (We need the DB rows to know which S3 keys to delete)
  try {
    // Delete food log images from S3
    const userFoodLogs = await db.select({ imageUrl: foodLogs.imageUrl })
      .from(foodLogs)
      .where(eq(foodLogs.userId, userId));
    for (const log of userFoodLogs) {
      if (log.imageUrl) {
        await storageDelete(log.imageUrl);
      }
    }
    
    // Delete monster images from S3
    const userMonsters = await db.select({ imageUrl: monsters.imageUrl })
      .from(monsters)
      .where(eq(monsters.userId, userId));
    for (const m of userMonsters) {
      if (m.imageUrl) {
        await storageDelete(m.imageUrl);
      }
    }
    
    // Delete chat media (images/audio) from S3
    const userChatMedia = await db.select({ message: chatMessages.message, messageType: chatMessages.messageType })
      .from(chatMessages)
      .where(
        sql`(${chatMessages.senderId} = ${userId}) AND ${chatMessages.messageType} IN ('image', 'audio')`
      );
    for (const msg of userChatMedia) {
      if (msg.message && (msg.message.startsWith("http") || msg.message.startsWith("/"))) {
        await storageDelete(msg.message);
      }
    }
    
    console.log(`[DeleteAccount] S3 cleanup done for user ${userId}: ${userFoodLogs.length} food images, ${userMonsters.length} monster images, ${userChatMedia.length} chat media`);
  } catch (e) {
    console.warn("[DeleteAccount] S3 cleanup error (continuing with DB deletion):", e);
  }
  
  // Step 1: Manually delete rows where the user appears in non-owner FK columns
  // (CASCADE only fires on the direct userId FK, not on receiverId/opponentId/targetUserId/friendId)
  try {
    await db.delete(chatMessages).where(
      sql`${chatMessages.senderId} = ${userId} OR ${chatMessages.receiverId} = ${userId}`
    );
  } catch (e) { console.warn("[DeleteAccount] chatMessages cleanup:", e); }
  
  try {
    await db.delete(battles).where(
      sql`${battles.challengerId} = ${userId} OR ${battles.opponentId} = ${userId}`
    );
  } catch (e) { console.warn("[DeleteAccount] battles cleanup:", e); }
  
  try {
    await db.delete(matchSwipes).where(
      sql`${matchSwipes.userId} = ${userId} OR ${matchSwipes.targetUserId} = ${userId}`
    );
  } catch (e) { console.warn("[DeleteAccount] matchSwipes cleanup:", e); }
  
  try {
    await db.delete(friendships).where(
      sql`${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId}`
    );
  } catch (e) { console.warn("[DeleteAccount] friendships cleanup:", e); }
  
  // Step 2: Delete the user row — CASCADE handles all other child tables
  const result = await db.delete(users).where(eq(users.id, userId));
  console.log(`[DeleteAccount] User ${userId} deleted, result:`, result);
  
  return { success: true };
}
