# FitMonster — 「尋找其他人」功能完整程式碼

本文件整合了 FitMonster 中「尋找其他人」功能涉及的所有程式碼檔案，包含資料庫 Schema、伺服器端 API、資料庫函式、客戶端地圖頁面、對戰配對頁面，以及地圖元件。

---

## 目錄

1. [資料庫 Schema — `drizzle/schema.ts`（相關部分）](#1-資料庫-schema)
2. [伺服器端 API — `server/routers.ts`（location & friends）](#2-伺服器端-api)
3. [資料庫函式 — `server/db.ts`（location & friends）](#3-資料庫函式)
4. [客戶端地圖頁面 — `app/nearby-map.tsx`](#4-客戶端地圖頁面)
5. [對戰配對頁面 — `app/(tabs)/battle.tsx`（配對相關部分）](#5-對戰配對頁面)
6. [地圖元件 — Native 版 `components/map-view-wrapper.native.tsx`](#6-地圖元件-native)
7. [地圖元件 — Web 版 `components/map-view-wrapper.web.tsx`](#7-地圖元件-web)
8. [地圖元件 — 型別宣告 `components/map-view-wrapper.d.ts`](#8-地圖元件型別宣告)

---

## 1. 資料庫 Schema

**檔案路徑：** `drizzle/schema.ts`

以下為與「尋找其他人」相關的資料表定義。

### profiles 表（性別偏好欄位）

```typescript
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
  age: int("age"),
  birthday: varchar("birthday", { length: 10 }),
  gender: mysqlEnum("gender", ["male", "female"]),
  height: float("height"),
  weight: float("weight"),
  bmr: float("bmr"),
  matchGenderPreference: mysqlEnum("matchGenderPreference", ["all", "male", "female"]).default("all"),
  profileCompleted: boolean("profileCompleted").default(false).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### matchSwipes 表

```typescript
export const matchSwipes = mysqlTable("matchSwipes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetUserId: int("targetUserId").notNull(),
  swipeType: mysqlEnum("swipeType", ["like", "nope", "super_like"]).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

### friendships 表

```typescript
export const friendships = mysqlTable("friendships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  friendId: int("friendId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "blocked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### userLocations 表

```typescript
export const userLocations = mysqlTable("userLocations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  latitude: float("latitude").notNull(),
  longitude: float("longitude").notNull(),
  isSharing: boolean("isSharing").default(false).notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

### 型別匯出

```typescript
export type MatchSwipe = typeof matchSwipes.$inferSelect;
export type InsertMatchSwipe = typeof matchSwipes.$inferInsert;

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = typeof userLocations.$inferInsert;
```

---

## 2. 伺服器端 API

**檔案路徑：** `server/routers.ts`

以下為 `location` 和 `friends` 路由的完整程式碼。

### location 路由

```typescript
// Location & Friend System
location: router({
  update: protectedProcedure
    .input(z.object({
      latitude: z.number(),
      longitude: z.number(),
      isSharing: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.upsertUserLocation(ctx.user.id, input.latitude, input.longitude, input.isSharing);
      return { id };
    }),
  nearby: protectedProcedure
    .input(z.object({
      latitude: z.number(),
      longitude: z.number(),
      radiusKm: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Get the caller's gender preference
      const genderPref = await db.getUserGenderPreference(ctx.user.id);
      const nearbyLocations = await db.getNearbyUsers(ctx.user.id, input.latitude, input.longitude, input.radiusKm);
      const userIds = nearbyLocations.map(l => l.userId);
      const usersInfo = await db.getUserInfoForNearby(userIds);
      
      // Map and filter by gender preference
      const results = nearbyLocations.map(loc => {
        const info = usersInfo.find(u => u.user.id === loc.userId);
        return {
          ...loc,
          name: info?.profile?.trainerName || info?.user.name || 'Trainer',
          gender: info?.profile?.gender || null,
          monsterType: info?.activeMonster?.monsterType || 'bodybuilder',
          monsterName: info?.activeMonster?.name || null,
          monsterLevel: info?.activeMonster?.level || 1,
          monsterStage: info?.activeMonster?.evolutionStage || 1,
          monsterImageUrl: info?.activeMonster?.imageUrl || null,
          totalExp: info?.profile?.totalExp || 0,
        };
      });
      
      // Apply gender preference filter
      if (genderPref === 'all') return results;
      return results.filter(u => {
        if (!u.gender) return true; // Show users without gender set
        return u.gender === genderPref;
      });
    }),
}),
```

### profile.updateMatchPreference 路由

```typescript
updateMatchPreference: protectedProcedure
  .input(z.object({ matchGenderPreference: z.enum(["all", "male", "female"]) }))
  .mutation(async ({ ctx, input }) => {
    await db.updateProfile(ctx.user.id, { matchGenderPreference: input.matchGenderPreference });
    return { success: true };
  }),
```

### friends 路由

```typescript
friends: router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.getFriendsWithInfo(ctx.user.id);
  }),
  pendingRequests: protectedProcedure.query(async ({ ctx }) => {
    const pending = await db.getPendingFriendRequests(ctx.user.id);
    const senderIds = pending.map(p => p.userId);
    const sendersInfo = await db.getUserInfoForNearby(senderIds);
    return pending.map(p => {
      const info = sendersInfo.find(u => u.user.id === p.userId);
      return {
        friendshipId: p.id,
        userId: p.userId,
        name: info?.profile?.trainerName || info?.user.name || 'Trainer',
        monsterType: info?.activeMonster?.monsterType || 'bodybuilder',
        monsterLevel: info?.activeMonster?.level || 1,
        monsterImageUrl: info?.activeMonster?.imageUrl || null,
        createdAt: p.createdAt,
      };
    });
  }),
  locations: protectedProcedure.query(async ({ ctx }) => {
    return await db.getFriendsLocations(ctx.user.id);
  }),
  sendRequest: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if friendship already exists
      const existing = await db.checkFriendship(ctx.user.id, input.targetUserId);
      if (existing) {
        return { success: false, message: 'Friend request already exists', status: existing.status };
      }
      const id = await db.createFriendship({
        userId: ctx.user.id,
        friendId: input.targetUserId,
      });
      return { success: true, id };
    }),
  acceptRequest: protectedProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateFriendship(input.friendshipId, 'accepted');
      return { success: true };
    }),
  rejectRequest: protectedProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateFriendship(input.friendshipId, 'blocked');
      return { success: true };
    }),
}),
```

---

## 3. 資料庫函式

**檔案路徑：** `server/db.ts`

以下為與位置、好友、配對相關的所有資料庫函式。

```typescript
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

export async function getNearbyUsers(
  userId: number,
  latitude: number,
  longitude: number,
  radiusKm: number = 50,
  genderPreference: "all" | "male" | "female" = "all"
) {
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
  console.log(`[Nearby] User ${userId} querying at (${latitude}, ${longitude}), radius ${radiusKm}km, genderPref: ${genderPreference}. Found ${allLocations.length} sharing users in DB.`);

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
    console.log(`[Nearby] User ${loc.userId} at (${loc.latitude}, ${loc.longitude}), distance: ${distance.toFixed(2)}km, within radius: ${distance <= radiusKm}`);
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

// Get user's gender preference from profile
export async function getUserGenderPreference(userId: number): Promise<"all" | "male" | "female"> {
  const db = await getDb();
  if (!db) return "all";
  const result = await db.select({ matchGenderPreference: profiles.matchGenderPreference }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return (result[0]?.matchGenderPreference as "all" | "male" | "female") || "all";
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

// ============================================
// Friendship Management
// ============================================

export async function getUserFriends(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendships).where(and(
    sql`${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId}`,
    eq(friendships.status, "accepted")
  ));
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

// Get friends' locations (only those who are sharing)
export async function getFriendsLocations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get accepted friendships
  const acceptedFriendships = await db.select().from(friendships).where(and(
    sql`${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId}`,
    eq(friendships.status, "accepted")
  ));
  
  const friendIds = acceptedFriendships.map(f => 
    f.userId === userId ? f.friendId : f.userId
  );
  
  if (friendIds.length === 0) return [];
  
  // Get locations for friends who are sharing
  const results = [];
  for (const fid of friendIds) {
    const locResult = await db.select().from(userLocations).where(
      and(eq(userLocations.userId, fid), eq(userLocations.isSharing, true))
    ).limit(1);
    if (locResult[0]) {
      results.push(locResult[0]);
    }
  }
  
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
      name: info?.profile?.trainerName || info?.user.name || 'Trainer',
      monsterType: info?.activeMonster?.monsterType || 'bodybuilder',
      monsterName: info?.activeMonster?.name || null,
      monsterLevel: info?.activeMonster?.level || 1,
      monsterStage: info?.activeMonster?.evolutionStage || 1,
      monsterImageUrl: info?.activeMonster?.imageUrl || null,
    };
  });
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

// ============================================
// Match/Swipe Management
// ============================================

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
```

---

## 4. 客戶端地圖頁面

**檔案路徑：** `app/nearby-map.tsx`（完整 814 行）

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  FlatList,
  Switch,
  ActivityIndicator,
  AppState,
} from "react-native";
import { MapViewWrapper, animateMapToRegion, type MapRegion } from "@/components/map-view-wrapper";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useI18n } from "@/lib/i18n-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Monster image mapping by type and stage
const MONSTER_IMAGES: Record<string, Record<number, any>> = {
  bodybuilder: {
    1: require("@/assets/monsters/bodybuilder-stage1.png"),
    2: require("@/assets/monsters/bodybuilder-stage2.png"),
    3: require("@/assets/monsters/bodybuilder-stage3.png"),
  },
  physique: {
    1: require("@/assets/monsters/physique-stage1.png"),
    2: require("@/assets/monsters/physique-stage2.png"),
    3: require("@/assets/monsters/physique-stage3.png"),
  },
  powerlifter: {
    1: require("@/assets/monsters/powerlifter-stage1.png"),
    2: require("@/assets/monsters/powerlifter-stage2.png"),
    3: require("@/assets/monsters/powerlifter-stage3.png"),
  },
};

const GRADIENT_BY_TYPE: Record<string, readonly [string, string]> = {
  bodybuilder: ["#DCFCE7", "#BBF7D0"],
  physique: ["#DBEAFE", "#BFDBFE"],
  powerlifter: ["#FEF3C7", "#FDE68A"],
};

const EMOJI_BY_TYPE: Record<string, string> = {
  bodybuilder: "🏋️",
  physique: "🧘",
  powerlifter: "💪",
};

interface FriendLocation {
  userId: number;
  name: string;
  monsterType: string;
  monsterLevel: number;
  monsterStage: number;
  monsterImageUrl: string | null;
  latitude: number;
  longitude: number;
  lastUpdated: Date | string;
  monsterName: string | null;
}

interface NearbyUser {
  userId: number;
  name: string;
  monsterType: string;
  monsterLevel: number;
  monsterStage: number;
  monsterImageUrl: string | null;
  distanceKm: number;
  lastUpdated: Date | string;
  latitude: number;
  longitude: number;
}

function getTimeAgo(lastUpdated: Date | string, t: any): { text: string; isOnline: boolean } {
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const diffMs = now - updated;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 5) return { text: t.now || "Now", isOnline: true };
  if (diffMin < 60) return { text: `${diffMin}${t.minutesAgoShort || "m ago"}`, isOnline: false };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `${diffHours}${t.hoursAgoShort || "h ago"}`, isOnline: false };
  return { text: `${Math.floor(diffHours / 24)}${t.daysAgoShort || "d ago"}`, isOnline: false };
}

function getMonsterImage(type: string, stage: number) {
  const typeImages = MONSTER_IMAGES[type] || MONSTER_IMAGES.bodybuilder;
  return typeImages[stage] || typeImages[1];
}

const REFRESH_INTERVAL_MS = 15_000;
const LOCATION_UPDATE_INTERVAL_MS = 30_000;

export default function NearbyMapScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t, tr } = useI18n();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [selectedUser, setSelectedUser] = useState<FriendLocation | NearbyUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const sharingRef = useRef(false);

  // tRPC mutations & queries
  const locationUpdateMutation = trpc.location.update.useMutation();
  const sendFriendRequestMutation = trpc.friends.sendRequest.useMutation();

  // Query nearby users (non-friends)
  const nearbyQuery = trpc.location.nearby.useQuery(
    { latitude: userLocation?.lat ?? 0, longitude: userLocation?.lng ?? 0, radiusKm: 50 },
    { enabled: !!userLocation && sharingLocation, refetchInterval: REFRESH_INTERVAL_MS }
  );

  // Query friends' locations
  const friendsLocQuery = trpc.friends.locations.useQuery(undefined, {
    enabled: sharingLocation,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  // Keep refs in sync
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  useEffect(() => { sharingRef.current = sharingLocation; }, [sharingLocation]);

  // Update nearby users when query data changes
  useEffect(() => {
    if (nearbyQuery.data) {
      setNearbyUsers(nearbyQuery.data as NearbyUser[]);
    }
  }, [nearbyQuery.data]);

  // Update friend locations when query data changes
  useEffect(() => {
    if (friendsLocQuery.data) {
      setFriendLocations(friendsLocQuery.data as FriendLocation[]);
      setLastError(null);
    }
  }, [friendsLocQuery.data]);

  // On mount: request location
  useEffect(() => {
    initLocation();
    return () => {
      if (locationTimerRef.current) clearInterval(locationTimerRef.current);
    };
  }, []);

  // Periodically update own location to server while sharing
  useEffect(() => {
    if (sharingLocation && userLocation) {
      locationTimerRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const newLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLocation(newLoc);
          await locationUpdateMutation.mutateAsync({
            latitude: newLoc.lat,
            longitude: newLoc.lng,
            isSharing: true,
          });
        } catch {
          // Silently continue - don't block the user
        }
      }, LOCATION_UPDATE_INTERVAL_MS);

      return () => {
        if (locationTimerRef.current) clearInterval(locationTimerRef.current);
      };
    }
  }, [sharingLocation, !!userLocation]);

  // When app comes to foreground, refresh
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && sharingRef.current) {
        friendsLocQuery.refetch();
        if (userLocationRef.current) nearbyQuery.refetch();
      }
    });
    return () => sub.remove();
  }, []);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(coords);
      } else {
        // Default to Hong Kong area
        setUserLocation({ lat: 22.3193, lng: 114.1694 });
        Alert.alert(
          t.locationPermissionRequired || "Location Permission Required",
          t.locationPermissionMessage || "Please enable location access in your device settings to share your location with nearby trainers.",
          [{ text: t.ok }]
        );
      }
    } catch (err) {
      setUserLocation({ lat: 22.3193, lng: 114.1694 });
      console.warn("Location error:", err);
    }
    setLoading(false);
  };

  const shareLocationToServer = async (lat: number, lng: number, sharing: boolean): Promise<boolean> => {
    try {
      await locationUpdateMutation.mutateAsync({
        latitude: lat,
        longitude: lng,
        isSharing: sharing,
      });
      setLastError(null);
      setRetryCount(0);
      return true;
    } catch (err: any) {
      console.warn("Failed to update location sharing:", err?.message || err);
      return false;
    }
  };

  const handleToggleSharing = useCallback(async (value: boolean) => {
    if (value && !locationGranted) {
      Alert.alert(
        t.locationPermissionRequired || "Location Permission Required",
        t.locationPermissionMessage || "Please enable location access in your device settings.",
        [{ text: t.ok }]
      );
      return;
    }

    // Optimistically set the toggle
    setSharingLocation(value);

    if (userLocation) {
      const success = await shareLocationToServer(userLocation.lat, userLocation.lng, value);
      if (!success) {
        // Retry once
        const retrySuccess = await shareLocationToServer(userLocation.lat, userLocation.lng, value);
        if (!retrySuccess) {
          setLastError(t.locationShareRetry || "Location sharing may be delayed. Will retry automatically.");
          setRetryCount(prev => prev + 1);
        }
      }
    }

    if (value) {
      friendsLocQuery.refetch();
      nearbyQuery.refetch();
    }
  }, [locationGranted, userLocation]);

  const handleManualRefresh = useCallback(async () => {
    if (!userLocation) return;
    setRefreshing(true);

    try {
      if (locationGranted) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const newLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setUserLocation(newLoc);

        if (sharingLocation) {
          await shareLocationToServer(newLoc.lat, newLoc.lng, true);
        }
      }
    } catch {
      // Continue with existing location
    }

    await Promise.all([
      friendsLocQuery.refetch(),
      nearbyQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [userLocation, locationGranted, sharingLocation]);

  const handleSendRequest = useCallback(async (user: NearbyUser | FriendLocation) => {
    try {
      const result = await sendFriendRequestMutation.mutateAsync({
        targetUserId: user.userId,
      });
      if (result.success) {
        Alert.alert(
          t.friendRequestSentTitle || "Friend Request Sent!",
          `${t.friendRequestSentTo || "You sent a friend request to"} ${user.name}.\n${t.needToAccept || "They need to accept before you can battle!"}`,
          [{ text: t.ok }]
        );
      } else {
        Alert.alert(
          t.friendRequestSentTitle || "Already Sent",
          t.friendRequestSentMsg || "A friend request already exists with this user.",
          [{ text: t.ok }]
        );
      }
    } catch {
      Alert.alert(
        "Error",
        "Failed to send friend request. Please try again.",
        [{ text: t.ok }]
      );
    }
  }, []);

  const centerOnUser = useCallback(() => {
    if (userLocation) {
      animateMapToRegion(mapRef, {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  }, [userLocation]);

  const initialRegion: MapRegion | undefined = userLocation ? {
    latitude: userLocation.lat,
    longitude: userLocation.lng,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  } : undefined;

  // Combine friends and nearby for the list
  const allPeople = [
    ...friendLocations.map(f => ({ ...f, isFriend: true, distanceKm: 0 })),
    ...nearbyUsers.filter(n => !friendLocations.some(f => f.userId === n.userId)).map(n => ({ ...n, isFriend: false })),
  ];

  return (
    <ScreenContainer edges={["bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              if (router.canDismiss()) router.dismiss();
              else router.back();
            }}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.nearbyTrainers}</Text>
          <TouchableOpacity
            onPress={handleManualRefresh}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[{ color: colors.muted, marginTop: 12, fontSize: 14 }]}>
              {t.gettingLocation || "Getting your location..."}
            </Text>
          </View>
        ) : (
          <>
            {/* Real Map */}
            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              {initialRegion ? (
                <MapViewWrapper
                  mapRef={mapRef}
                  style={styles.map}
                  initialRegion={initialRegion}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  showsCompass={false}
                  markers={[
                    ...friendLocations.map((friend) => {
                      const timeInfo = getTimeAgo(friend.lastUpdated, t);
                      return {
                        id: `friend-${friend.userId}`,
                        coordinate: { latitude: friend.latitude, longitude: friend.longitude },
                        title: `${friend.name} (${t.friend || "Friend"})`,
                        description: `${tr(`monsterType_${friend.monsterType}`) || friend.monsterType} Lv.${friend.monsterLevel} · ${timeInfo.text}`,
                        pinColor: "#22C55E",
                        showActions: true,
                        actions: [
                          {
                            label: t.mapBattle || "Battle",
                            emoji: "⚔️",
                            color: colors.primary,
                            onPress: () => {
                              router.push({
                                pathname: "/chat",
                                params: {
                                  friendId: friend.userId,
                                  friendName: friend.name,
                                  challenge: "true",
                                },
                              } as any);
                            },
                          },
                          {
                            label: t.mapChat || "Chat",
                            emoji: "💬",
                            color: colors.success,
                            onPress: () => {
                              router.push({
                                pathname: "/chat",
                                params: {
                                  friendId: friend.userId,
                                  friendName: friend.name,
                                },
                              } as any);
                            },
                          },
                        ],
                      };
                    }),
                    ...nearbyUsers
                      .filter(n => !friendLocations.some(f => f.userId === n.userId))
                      .map((user) => {
                        const timeInfo = getTimeAgo(user.lastUpdated, t);
                        return {
                          id: `nearby-${user.userId}`,
                          coordinate: { latitude: user.latitude, longitude: user.longitude },
                          title: user.name,
                          description: `${tr(`monsterType_${user.monsterType}`) || user.monsterType} Lv.${user.monsterLevel} · ${user.distanceKm}km · ${timeInfo.text}`,
                          pinColor: "#3B82F6",
                        };
                      }),
                  ]}
                />
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Text style={{ color: colors.muted }}>Loading map...</Text>
                </View>
              )}

              {/* Center on me button */}
              <TouchableOpacity
                style={[styles.centerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={centerOnUser}
                activeOpacity={0.7}
              >
                <IconSymbol name="location.fill" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Location sharing toggle */}
            <View style={[styles.sharingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sharingInfo}>
                <IconSymbol name="location.fill" size={20} color={sharingLocation ? colors.primary : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sharingTitle, { color: colors.foreground }]}>{t.shareLocation}</Text>
                  <Text style={[styles.sharingDesc, { color: colors.muted }]}>
                    {sharingLocation
                      ? (t.visibleToNearby || "Visible to nearby trainers & friends")
                      : (t.notVisibleOnMap || "Others can't see you on the map")}
                  </Text>
                </View>
              </View>
              <Switch
                value={sharingLocation}
                onValueChange={handleToggleSharing}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Status banner */}
            {lastError && (
              <View style={[styles.errorBanner, { backgroundColor: "#FEF3C7" }]}>
                <Text style={{ color: "#92400E", fontSize: 13, flex: 1 }}>⚠️ {lastError}</Text>
                <TouchableOpacity onPress={handleManualRefresh}>
                  <Text style={{ color: "#92400E", fontWeight: "700", fontSize: 13 }}>{t.refreshNow || "Retry"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Auto-refresh indicator */}
            {sharingLocation && (friendsLocQuery.isFetching || nearbyQuery.isFetching) && !refreshing && (
              <View style={styles.autoRefreshBar}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[{ color: colors.muted, fontSize: 12, marginLeft: 8 }]}>
                  {t.refreshingNearby || "Refreshing..."}
                </Text>
              </View>
            )}

            {/* People list */}
            <View style={styles.listHeader}>
              {friendLocations.length > 0 && (
                <Text style={[styles.listTitle, { color: colors.primary }]}>
                  👥 {friendLocations.length} {t.friendsOnMap || "friends on map"}
                </Text>
              )}
              {nearbyUsers.filter(n => !friendLocations.some(f => f.userId === n.userId)).length > 0 && (
                <Text style={[styles.listTitle, { color: colors.foreground }]}>
                  🏃 {nearbyUsers.filter(n => !friendLocations.some(f => f.userId === n.userId)).length} {t.trainersActiveNearby || "trainers nearby"}
                </Text>
              )}
            </View>

            {!sharingLocation ? (
              <View style={styles.emptyNearby}>
                <Text style={{ fontSize: 40 }}>📍</Text>
                <Text style={[styles.emptyNearbyTitle, { color: colors.foreground }]}>
                  {t.enableSharingTitle || "Enable Location Sharing"}
                </Text>
                <Text style={[styles.emptyNearbyDesc, { color: colors.muted }]}>
                  {t.enableSharingHint || "Turn on location sharing to see friends on the map and discover nearby trainers!"}
                </Text>
              </View>
            ) : allPeople.length === 0 ? (
              <View style={styles.emptyNearby}>
                <Text style={{ fontSize: 40 }}>🔍</Text>
                <Text style={[styles.emptyNearbyTitle, { color: colors.foreground }]}>
                  {t.noNearbyTrainers || "No trainers nearby yet"}
                </Text>
                <Text style={[styles.emptyNearbyDesc, { color: colors.muted }]}>
                  {t.nearbyHint || "Make sure your friends also have the app open with location sharing enabled!"}
                </Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                  onPress={handleManualRefresh}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    {refreshing ? "..." : (t.refreshNow || "Refresh Now")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={allPeople}
                keyExtractor={(item) => `${item.userId}`}
                renderItem={({ item }) => {
                  const timeInfo = getTimeAgo(item.lastUpdated, t);
                  const gradient = GRADIENT_BY_TYPE[item.monsterType] || GRADIENT_BY_TYPE.bodybuilder;
                  const monsterImage = getMonsterImage(item.monsterType, item.monsterStage);
                  const isFriend = "isFriend" in item && item.isFriend;

                  return (
                    <TouchableOpacity
                      style={[styles.userCard, {
                        backgroundColor: colors.surface,
                        borderColor: isFriend ? colors.primary : colors.border,
                        borderWidth: isFriend ? 1.5 : 1,
                      }]}
                      onPress={() => {
                        if (item.latitude && item.longitude) {
                          animateMapToRegion(mapRef, {
                            latitude: item.latitude,
                            longitude: item.longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                          }, 500);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <LinearGradient colors={[gradient[0], gradient[1]]} style={styles.userAvatar}>
                        <Image source={monsterImage} style={styles.userMonster} contentFit="contain" />
                      </LinearGradient>
                      <View style={styles.userInfo}>
                        <View style={styles.userNameRow}>
                          <Text style={[styles.userName, { color: colors.foreground }]}>{item.name}</Text>
                          {isFriend && (
                            <View style={[styles.friendBadge, { backgroundColor: colors.primary + "20" }]}>
                              <Text style={[styles.friendBadgeText, { color: colors.primary }]}>
                                {t.friend || "Friend"}
                              </Text>
                            </View>
                          )}
                          {timeInfo.isOnline && <View style={styles.onlineDot} />}
                        </View>
                        <Text style={[styles.userLevel, { color: colors.muted }]}>
                          {tr(`monsterType_${item.monsterType}`) || item.monsterType} Lv.{item.monsterLevel}
                        </Text>
                        <Text style={[styles.userDistance, { color: colors.primary }]}>
                          📍 {"distanceKm" in item && item.distanceKm > 0 ? `${item.distanceKm} km · ` : ""}{timeInfo.text}
                        </Text>
                      </View>
                      {isFriend ? (
                        <View style={styles.friendActions}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                            onPress={() => {
                              router.push({
                                pathname: "/chat",
                                params: {
                                  friendId: item.userId,
                                  friendName: item.name,
                                  challenge: "true",
                                },
                              } as any);
                            }}
                          >
                            <Text style={styles.actionBtnText}>⚔️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.success }]}
                            onPress={() => {
                              router.push({
                                pathname: "/chat",
                                params: {
                                  friendId: item.userId,
                                  friendName: item.name,
                                },
                              } as any);
                            }}
                          >
                            <Text style={styles.actionBtnText}>💬</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addBtn, { backgroundColor: colors.primary }]}
                          onPress={() => handleSendRequest(item)}
                        >
                          <IconSymbol name="person.badge.plus" size={18} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapContainer: {
    marginHorizontal: 16,
    height: SCREEN_HEIGHT * 0.35,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  centerBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sharingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sharingInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  sharingTitle: { fontSize: 15, fontWeight: "600" },
  sharingDesc: { fontSize: 12, marginTop: 2 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  autoRefreshBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 12,
  },
  listTitle: { fontSize: 14, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  userMonster: { width: 32, height: 32 },
  userInfo: { flex: 1, marginLeft: 12 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 15, fontWeight: "600" },
  friendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  friendBadgeText: { fontSize: 10, fontWeight: "700" },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  userLevel: { fontSize: 13, marginTop: 2 },
  userDistance: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  friendActions: {
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 16 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNearby: { alignItems: "center", paddingTop: 30, paddingHorizontal: 32 },
  emptyNearbyTitle: { fontSize: 17, fontWeight: "700", marginTop: 12 },
  emptyNearbyDesc: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
```

---

## 5. 對戰配對頁面

**檔案路徑：** `app/(tabs)/battle.tsx`（配對相關部分，第 1-336 行）

```tsx
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Animated as RNAnimated,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc";
import { useActivity } from "@/lib/activity-context";
import * as Location from "expo-location";

// Opponent type used for battle system
type Opponent = {
  id: number;
  name: string;
  distance: string;
  online: boolean;
  level: number;
  monsterType: string;
  monsterImage: any;
  streakKey: string;
  matchPercent: number;
  todayExp: number;
  strength: number;
  defense: number;
  agility: number;
  hp: number;
  gradient: readonly [string, string];
  gender?: "male" | "female";
};

function buildOpponentFromNearby(user: any): Opponent {
  const type = (user.monsterType || "bodybuilder").toLowerCase();
  const stage = user.monsterStage || 1;
  return {
    id: user.userId,
    name: user.name || "Trainer",
    distance: user.distanceKm ? `${user.distanceKm}km` : "?",
    online: true,
    level: user.monsterLevel || 1,
    monsterType: type.charAt(0).toUpperCase() + type.slice(1),
    monsterImage: getMonsterImage(type, stage),
    streakKey: "streakBeastMode",
    matchPercent: Math.round(50 + Math.random() * 40),
    todayExp: (user.totalExp || 0) % 1000,
    strength: 10 + (user.monsterLevel || 1) * 2,
    defense: 8 + (user.monsterLevel || 1) * 2,
    agility: 8 + (user.monsterLevel || 1) * 2,
    hp: 100 + (user.monsterLevel || 1) * 10,
    gradient: getGradientForType(type),
    gender: user.gender || undefined,
  };
}

// ... (helper functions: getMonsterImage, getGradientForType — same as nearby-map.tsx)

export default function BattleScreen() {
  // ...state setup...

  // Real backend queries
  const friendsQuery = trpc.friends.list.useQuery(undefined, { retry: 1 });
  const pendingQuery = trpc.friends.pendingRequests.useQuery(undefined, { retry: 1 });
  const acceptMutation = trpc.friends.acceptRequest.useMutation();
  const rejectMutation = trpc.friends.rejectRequest.useMutation();
  const sendRequestMutation = trpc.friends.sendRequest.useMutation();

  // Get user's real location for nearby query AND auto-share it
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const locationShareMutation = trpc.location.update.useMutation();
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLoc(coords);
          // Auto-share location so other users can find us
          try {
            await locationShareMutation.mutateAsync({
              latitude: coords.lat,
              longitude: coords.lng,
              isSharing: true,
            });
          } catch (err) {
            console.warn("Failed to share location from battle:", err);
          }
        }
      } catch {}
    })();
  }, []);

  // Fetch nearby users from backend for match cards
  const nearbyQuery = trpc.location.nearby.useQuery(
    { latitude: userLoc?.lat ?? 0, longitude: userLoc?.lng ?? 0, radiusKm: 50 },
    { retry: 1, enabled: !!userLoc }
  );
  const nearbyOpponents: Opponent[] = useMemo(() => {
    if (nearbyQuery.data && nearbyQuery.data.length > 0) {
      return nearbyQuery.data.map(buildOpponentFromNearby);
    }
    return [];
  }, [nearbyQuery.data]);

  // Send friend request (swipe right)
  const handleSwipe = useCallback((direction: "left" | "right" | "star") => {
    if (nearbyOpponents.length === 0) return;
    const opp = nearbyOpponents[currentOpponent % nearbyOpponents.length];

    if (direction === "left") {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentOpponent((prev) => prev + 1);
      return;
    }

    setSwipesLeft((prev) => Math.max(0, prev - 1));

    // Check if already sent a request or already friends
    const alreadyRequested = friendRequests.some((r) => r.from.id === opp.id);
    const alreadyFriend = friends.some((f) => f.id === opp.id);

    if (alreadyFriend) {
      Alert.alert(t.alreadyFriendsTitle, tr("alreadyFriendsMsg", { name: opp.name }));
      setCurrentOpponent((prev) => prev + 1);
      return;
    }

    if (alreadyRequested) {
      Alert.alert(t.requestAlreadySentTitle, tr("requestAlreadySentMsg", { name: opp.name }));
      setCurrentOpponent((prev) => prev + 1);
      return;
    }

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Like = send friend request (needs acceptance)
    Alert.alert(
      t.friendRequestSentEmoji,
      tr("friendRequestSentMsg", { name: opp.name }),
    );
    setFriendRequests((prev) => [
      ...prev,
      {
        id: Date.now(),
        from: opp,
        status: "pending",
        sentByMe: true,
        timestamp: new Date(),
      },
    ]);

    // Send real friend request to backend
    sendRequestMutation.mutate({ targetUserId: opp.id }, {
      onSuccess: () => {
        friendsQuery.refetch();
        pendingQuery.refetch();
      },
    });

    setCurrentOpponent((prev) => prev + 1);
  }, [currentOpponent, friendRequests, friends, nearbyOpponents]);

  // ... (rest of battle.tsx: battle logic, UI rendering, styles)
}
```

---

## 6. 地圖元件 Native

**檔案路徑：** `components/map-view-wrapper.native.tsx`

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export interface CalloutAction {
  label: string;
  emoji: string;
  onPress: () => void;
  color?: string;
}

export interface MapMarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  /** Unique identifier for the marker (e.g. userId) */
  id?: string | number;
  /** If true, show custom callout with action buttons */
  showActions?: boolean;
  /** Action buttons to show in the callout */
  actions?: CalloutAction[];
}

interface MapViewWrapperProps {
  style?: any;
  initialRegion?: MapRegion;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  markers?: MapMarkerProps[];
  mapRef?: React.RefObject<any>;
}

export function MapViewWrapper({
  style,
  initialRegion,
  showsUserLocation,
  showsMyLocationButton,
  showsCompass,
  markers = [],
  mapRef,
}: MapViewWrapperProps) {
  return (
    <MapView
      ref={mapRef}
      style={style || { flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton ?? false}
      showsCompass={showsCompass ?? false}
    >
      {markers.map((m, i) => (
        <Marker
          key={m.id ?? i}
          coordinate={m.coordinate}
          title={m.showActions ? undefined : m.title}
          description={m.showActions ? undefined : m.description}
          pinColor={m.pinColor}
        >
          {m.showActions && m.actions && m.actions.length > 0 ? (
            <Callout tooltip>
              <View style={calloutStyles.container}>
                <Text style={calloutStyles.title} numberOfLines={1}>
                  {m.title}
                </Text>
                {m.description ? (
                  <Text style={calloutStyles.description} numberOfLines={2}>
                    {m.description}
                  </Text>
                ) : null}
                <View style={calloutStyles.actionsRow}>
                  {m.actions.map((action, ai) => (
                    <TouchableOpacity
                      key={ai}
                      style={[
                        calloutStyles.actionBtn,
                        { backgroundColor: action.color || "#3B82F6" },
                      ]}
                      onPress={action.onPress}
                      activeOpacity={0.7}
                    >
                      <Text style={calloutStyles.actionEmoji}>{action.emoji}</Text>
                      <Text style={calloutStyles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={calloutStyles.arrow} />
              </View>
            </Callout>
          ) : null}
        </Marker>
      ))}
    </MapView>
  );
}

export function animateMapToRegion(
  mapRef: React.RefObject<any>,
  region: MapRegion,
  duration: number = 500
) {
  if (mapRef.current?.animateToRegion) {
    mapRef.current.animateToRegion(region, duration);
  }
}

const calloutStyles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    minWidth: 180,
    maxWidth: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
  },
  actionEmoji: {
    fontSize: 14,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  arrow: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
});
```

---

## 7. 地圖元件 Web

**檔案路徑：** `components/map-view-wrapper.web.tsx`

```tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export interface CalloutAction {
  label: string;
  emoji: string;
  onPress: () => void;
  color?: string;
}

export interface MapMarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  id?: string | number;
  showActions?: boolean;
  actions?: CalloutAction[];
}

interface MapViewWrapperProps {
  style?: any;
  initialRegion?: MapRegion;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  markers?: MapMarkerProps[];
  mapRef?: React.RefObject<any>;
}

export function MapViewWrapper({
  style,
  markers = [],
}: MapViewWrapperProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <View style={[styles.webMap, style]}>
      <View style={styles.webMapInner}>
        <Text style={styles.webMapIcon}>🗺️</Text>
        <Text style={styles.webMapText}>Map View</Text>
        <Text style={styles.webMapSubtext}>
          {markers.length > 0
            ? `${markers.length} location(s) on map`
            : "Open on your phone to see the real map"}
        </Text>
        {markers.map((m, i) => (
          <TouchableOpacity
            key={m.id ?? i}
            style={[styles.webMarker, { borderLeftColor: m.pinColor || "#3B82F6" }]}
            onPress={() => setExpandedIdx(expandedIdx === i ? null : i)}
            activeOpacity={0.7}
          >
            <Text style={styles.webMarkerTitle}>{m.title}</Text>
            {m.description ? (
              <Text style={styles.webMarkerDesc}>{m.description}</Text>
            ) : null}
            {expandedIdx === i && m.showActions && m.actions && m.actions.length > 0 && (
              <View style={styles.webActionsRow}>
                {m.actions.map((action, ai) => (
                  <TouchableOpacity
                    key={ai}
                    style={[styles.webActionBtn, { backgroundColor: action.color || "#3B82F6" }]}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.webActionEmoji}>{action.emoji}</Text>
                    <Text style={styles.webActionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function animateMapToRegion(
  _mapRef: React.RefObject<any>,
  _region: MapRegion,
  _duration: number = 500
) {
  // No-op on web
}

const styles = StyleSheet.create({
  webMap: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    overflow: "hidden",
  },
  webMapInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  webMapIcon: { fontSize: 40, marginBottom: 8 },
  webMapText: { fontSize: 16, fontWeight: "700", color: "#333" },
  webMapSubtext: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 12 },
  webMarker: {
    width: "100%",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 6,
  },
  webMarkerTitle: { fontSize: 13, fontWeight: "600", color: "#333" },
  webMarkerDesc: { fontSize: 11, color: "#666", marginTop: 2 },
  webActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingBottom: 4,
  },
  webActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  webActionEmoji: { fontSize: 12 },
  webActionLabel: { fontSize: 11, fontWeight: "600", color: "#fff" },
});
```

---

## 8. 地圖元件型別宣告

**檔案路徑：** `components/map-view-wrapper.d.ts`

```typescript
import React from "react";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export interface CalloutAction {
  label: string;
  emoji: string;
  onPress: () => void;
  color?: string;
}

export interface MapMarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  id?: string | number;
  showActions?: boolean;
  actions?: CalloutAction[];
}

interface MapViewWrapperProps {
  style?: any;
  initialRegion?: MapRegion;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  markers?: MapMarkerProps[];
  mapRef?: React.RefObject<any>;
}

export function MapViewWrapper(props: MapViewWrapperProps): React.JSX.Element;
export function animateMapToRegion(
  mapRef: React.RefObject<any>,
  region: MapRegion,
  duration?: number
): void;
```
