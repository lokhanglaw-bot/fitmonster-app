import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as chatDb from "./chat-db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { getFoodAnalysisPrompt, getFoodAnalysisUserPrompt } from "./food-prompt";
import { sendToUser, getOnlineStatuses, isUserOnline } from "./websocket";
import { sendPushNotification, sendChatPushNotification } from "./push-notifications";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // Sync local (email/password) users to DB so they get a real DB ID
    // This is needed because local login generates Date.now() IDs that don't exist in DB
    syncLocalUser: publicProcedure
      .input(z.object({
        openId: z.string().min(1),
        name: z.string().optional(),
        email: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Upsert the user into the DB
        await db.upsertUser({
          openId: input.openId,
          name: input.name || null,
          email: input.email || null,
          loginMethod: "local",
          lastSignedIn: new Date(),
        });
        // Get the user back to return the real DB ID
        const user = await db.getUserByOpenId(input.openId);
        if (!user) {
          throw new Error("Failed to sync local user");
        }
        return { id: user.id, openId: user.openId };
      }),
  }),

  // FitMonster API Routers
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserProfile(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ trainerName: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createProfile({
          userId: ctx.user.id,
          trainerName: input.trainerName,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          trainerName: z.string().optional(),
          healthScore: z.number().optional(),
          coins: z.number().optional(),
          currentStreak: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateProfile(ctx.user.id, input);
        return { success: true };
      }),
    setupProfile: protectedProcedure
      .input(
        z.object({
          birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          gender: z.enum(["male", "female"]),
          height: z.number().min(100).max(250),
          weight: z.number().min(30).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Calculate age from birthday
        const birthDate = new Date(input.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        // Calculate BMR using Harris-Benedict formula
        let bmr: number;
        if (input.gender === "male") {
          bmr = 88.362 + (13.397 * input.weight) + (4.799 * input.height) - (5.677 * age);
        } else {
          bmr = 447.593 + (9.247 * input.weight) + (3.098 * input.height) - (4.330 * age);
        }
        bmr = Math.round(bmr);
        
        // Calculate daily calorie goal (BMR × 1.2 for sedentary)
        const dailyCalorieGoal = Math.round(bmr * 1.2);
        
        // Upsert: create profile if it doesn't exist, update if it does
        const existingProfile = await db.getUserProfile(ctx.user.id);
        if (existingProfile) {
          await db.updateProfile(ctx.user.id, {
            age,
            birthday: input.birthday,
            gender: input.gender,
            height: input.height,
            weight: input.weight,
            bmr,
            dailyCalorieGoal,
            profileCompleted: true,
          });
        } else {
          await db.createProfile({
            userId: ctx.user.id,
            age,
            birthday: input.birthday,
            gender: input.gender,
            height: input.height,
            weight: input.weight,
            bmr,
            dailyCalorieGoal,
            profileCompleted: true,
          });
        }
        return { success: true, bmr, dailyCalorieGoal, age };
      }),
    updateProfileData: protectedProcedure
      .input(
        z.object({
          birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          gender: z.enum(["male", "female"]).optional(),
          height: z.number().min(100).max(250).optional(),
          weight: z.number().min(30).max(200).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Get current profile to merge with updates
        const currentProfile = await db.getUserProfile(ctx.user.id);
        if (!currentProfile) {
          // If no profile exists yet, create one with the provided data
          if (input.birthday && input.gender && input.height && input.weight) {
            // Redirect to setupProfile logic
            const birthDate = new Date(input.birthday);
            const today = new Date();
            let ageCalc = today.getFullYear() - birthDate.getFullYear();
            const md = today.getMonth() - birthDate.getMonth();
            if (md < 0 || (md === 0 && today.getDate() < birthDate.getDate())) ageCalc--;
            let bmrCalc: number;
            if (input.gender === "male") {
              bmrCalc = Math.round(88.362 + 13.397 * input.weight + 4.799 * input.height - 5.677 * ageCalc);
            } else {
              bmrCalc = Math.round(447.593 + 9.247 * input.weight + 3.098 * input.height - 4.330 * ageCalc);
            }
            await db.createProfile({
              userId: ctx.user.id,
              age: ageCalc,
              birthday: input.birthday,
              gender: input.gender,
              height: input.height,
              weight: input.weight,
              bmr: bmrCalc,
              dailyCalorieGoal: Math.round(bmrCalc * 1.2),
              profileCompleted: true,
            });
            return { success: true, bmr: bmrCalc, dailyCalorieGoal: Math.round(bmrCalc * 1.2), age: ageCalc };
          }
          throw new Error("Profile not found");
        }
        
        const birthday = input.birthday || currentProfile.birthday;
        const gender = input.gender || currentProfile.gender;
        const height = input.height || currentProfile.height;
        const weight = input.weight || currentProfile.weight;
        
        if (!birthday || !gender || !height || !weight) {
          throw new Error("Missing required profile fields");
        }
        
        // Recalculate age from birthday
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        // Recalculate BMR
        let bmr: number;
        if (gender === "male") {
          bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else {
          bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }
        bmr = Math.round(bmr);
        const dailyCalorieGoal = Math.round(bmr * 1.2);
        
        const updateData: Record<string, any> = { age, bmr, dailyCalorieGoal };
        if (input.birthday) updateData.birthday = input.birthday;
        if (input.gender) updateData.gender = input.gender;
        if (input.height) updateData.height = input.height;
        if (input.weight) updateData.weight = input.weight;
        
        await db.updateProfile(ctx.user.id, updateData);
        return { success: true, bmr, dailyCalorieGoal, age };
      }),
    updateMatchPreference: protectedProcedure
      .input(z.object({ matchGenderPreference: z.enum(["all", "male", "female"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateProfile(ctx.user.id, { matchGenderPreference: input.matchGenderPreference });
        return { success: true };
      }),
  }),

  monsters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserMonsters(ctx.user.id);
    }),
    active: protectedProcedure.query(async ({ ctx }) => {
      return await db.getActiveMonster(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          monsterType: z.enum(["bodybuilder", "physique", "powerlifter", "athlete", "colossus"]),
          imageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createMonster({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),
    // Sync all monsters from client AsyncStorage to server DB
    sync: protectedProcedure
      .input(
        z.object({
          monsters: z.array(z.object({
            name: z.string(),
            type: z.string(),
            level: z.number(),
            currentHp: z.number(),
            maxHp: z.number(),
            currentExp: z.number(),
            expToNextLevel: z.number(),
            strength: z.number(),
            defense: z.number(),
            agility: z.number(),
            evolutionProgress: z.number(),
            stage: z.number(),
            status: z.string().optional(),
          })),
          activeIndex: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        // Delete existing monsters for this user, then re-insert
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error('Database not available');
        const { monsters: monstersTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await dbInstance.delete(monstersTable).where(eq(monstersTable.userId, userId));
        
        const results: number[] = [];
        for (let i = 0; i < input.monsters.length; i++) {
          const m = input.monsters[i];
          const monsterType = m.type.toLowerCase() as any;
          const validTypes = ['bodybuilder', 'physique', 'powerlifter', 'athlete', 'colossus'];
          const id = await db.createMonster({
            userId,
            name: m.name,
            monsterType: validTypes.includes(monsterType) ? monsterType : 'bodybuilder',
            level: m.level,
            currentHp: m.currentHp,
            maxHp: m.maxHp,
            currentExp: m.currentExp,
            expToNextLevel: m.expToNextLevel,
            strength: m.strength,
            defense: m.defense,
            agility: m.agility,
            evolutionProgress: m.evolutionProgress,
            evolutionStage: m.stage,
            isActive: i === input.activeIndex,
          });
          results.push(id);
        }
        console.log(`[Monsters] Synced ${results.length} monsters for user ${userId}`);
        return { count: results.length, ids: results };
      }),
  }),

  workouts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserWorkouts(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          exerciseType: z.string(),
          exerciseName: z.string(),
          duration: z.number(),
          metValue: z.number(),
          caloriesBurned: z.number(),
          expEarned: z.number(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createWorkout({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),
  }),

  foodLogs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserFoodLogs(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          foodName: z.string(),
          calories: z.number(),
          protein: z.number(),
          carbs: z.number().optional(),
          fats: z.number().optional(),
          imageUrl: z.string().optional(),
          mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
          expEarned: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createFoodLog({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    // AI Food Analysis - upload base64 image, get nutrition data
    analyze: publicProcedure
      .input(
        z.object({
          imageBase64: z.string(), // base64 encoded image data
          mimeType: z.string().default("image/jpeg"),
          language: z.enum(["en", "zh"]).default("en"),
        })
      )
      .mutation(async ({ input }) => {
        // 1. Upload image to S3 so LLM can access it
        const imageBuffer = Buffer.from(input.imageBase64, "base64");
        const fileKey = `food-analysis/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { url: imageUrl } = await storagePut(fileKey, imageBuffer, input.mimeType);

        // 2. Call LLM with the image for food analysis
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: getFoodAnalysisPrompt(input.language),
            },
            {
              role: "user",
              content: [
                { type: "text", text: getFoodAnalysisUserPrompt(input.language) },
                { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        });

        // 3. Parse the LLM response
        const content = response.choices[0]?.message?.content;
        const contentStr = typeof content === "string" ? content : "";
        let analysisResult;
        try {
          analysisResult = JSON.parse(contentStr);
        } catch {
          analysisResult = {
            foods: [{ name: "Unknown food", portion: "1 serving", calories: 200, protein: 10, carbs: 25, fat: 8, fiber: 3 }],
            totalCalories: 200,
            totalProtein: 10,
            totalCarbs: 25,
            totalFat: 8,
            mealType: "snack",
            healthScore: 5,
            summary: "Could not fully analyze the image. Showing estimated values.",
          };
        }

        return {
          imageUrl,
          analysis: analysisResult,
        };
      }),
    // AI Food Analysis from text description - no image needed
    analyzeText: publicProcedure
      .input(
        z.object({
          description: z.string(), // e.g. "一嚿雞胸加兩隻蛋"
          language: z.enum(["en", "zh"]).default("en"),
        })
      )
      .mutation(async ({ input }) => {
        const isZh = input.language === "zh";
        const systemPrompt = `You are a professional nutritionist AI. The user will describe what they ate in text. Estimate the nutrition accurately.

IMPORTANT RULES:
1. Use USDA/standard nutrition databases as reference.
2. Be CONSERVATIVE and ACCURATE with estimates.
3. A plain egg has ~6g protein, ~78 calories.
4. A chicken breast (100g) has ~31g protein, ~165 calories.
5. Consider typical portion sizes if not specified.
6. All text fields MUST be in ${isZh ? "Traditional Chinese (繁體中文)" : "English"}.

Return a JSON object:
{
  "foods": [
    {
      "name": "string",
      "portion": "string",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "healthScore": number (1-10),
  "summary": "string - brief nutritional summary in ${isZh ? "繁體中文" : "English"}"
}

Always return valid JSON.`;

        const userPrompt = isZh
          ? `我吃了：${input.description}\n\n請分析營養資訊，用繁體中文回答。`
          : `I ate: ${input.description}\n\nPlease analyze the nutrition information.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        const contentStr = typeof content === "string" ? content : "";
        let analysisResult;
        try {
          analysisResult = JSON.parse(contentStr);
        } catch {
          analysisResult = {
            foods: [{ name: input.description, portion: "1 serving", calories: 200, protein: 10, carbs: 25, fat: 8 }],
            totalCalories: 200,
            totalProtein: 10,
            totalCarbs: 25,
            totalFat: 8,
            mealType: "snack",
            healthScore: 5,
            summary: isZh ? "無法完全分析，顯示估計值。" : "Could not fully analyze. Showing estimated values.",
          };
        }

        return { analysis: analysisResult };
      }),
  }),

  quests: router({
    all: protectedProcedure.query(async () => {
      return await db.getAllQuests();
    }),
    userQuests: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        return await db.getUserQuests(ctx.user.id, input.date);
      }),
    initializeDaily: protectedProcedure
      .input(z.object({ date: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const allQuests = await db.getAllQuests();
        const results = [];
        for (const quest of allQuests) {
          const id = await db.createUserQuest({
            userId: ctx.user.id,
            questId: quest.id,
            targetValue: quest.targetValue,
            date: input.date,
          });
          results.push(id);
        }
        return { count: results.length };
      }),
  }),

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
        radiusKm: z.number().optional(),
        includeFriends: z.boolean().optional(), // When true, don't exclude friends (for map view)
        genderFilter: z.enum(['all', 'male', 'female']).optional(), // Client-side gender filter override
      }))
      .query(async ({ ctx, input }) => {
        // Use provided radius or fetch user's saved match radius
        const radiusKm = input.radiusKm ?? await db.getUserMatchRadius(ctx.user.id);
        console.log(`[Nearby] Radius: ${radiusKm} km, user: ${ctx.user.id}, includeFriends: ${input.includeFriends ?? false}`);

        // Get existing friends + pending requests
        const [existingFriends, sentRequests, pendingRequests] = await Promise.all([
          db.getUserFriends(ctx.user.id),
          db.getSentFriendRequests(ctx.user.id),
          db.getPendingFriendRequests(ctx.user.id),
        ]);

        // Build friend/pending sets
        const friendIds = new Set<number>();
        for (const f of existingFriends) {
          friendIds.add(f.userId === ctx.user.id ? f.friendId : f.userId);
        }
        const pendingIds = new Set<number>();
        for (const r of sentRequests) {
          pendingIds.add(r.friendId);
        }
        for (const r of pendingRequests) {
          pendingIds.add(r.userId);
        }

        // Build exclude set: only exclude friends/pending when includeFriends is false (default)
        const excludeIds = new Set<number>();
        if (!input.includeFriends) {
          for (const id of friendIds) excludeIds.add(id);
          for (const id of pendingIds) excludeIds.add(id);
          console.log(`[Nearby] Excluding ${excludeIds.size} users (friends + pending requests)`);
        } else {
          console.log(`[Nearby] Including friends in results (map mode)`);
        }

        const nearbyLocations = await db.getNearbyUsers(ctx.user.id, input.latitude, input.longitude, radiusKm);
        const userIds = nearbyLocations.map(l => l.userId);
        const usersInfo = await db.getUserInfoForNearby(userIds);
        
        // Map and filter
        const results = nearbyLocations
          .filter(loc => !excludeIds.has(loc.userId))
          .map(loc => {
            const info = usersInfo.find(u => u.user.id === loc.userId);
            return {
              ...loc,
              name: info?.activeMonster?.name || info?.profile?.trainerName || 'Trainer',
              gender: info?.profile?.gender || null,
              monsterType: info?.activeMonster?.monsterType || 'bodybuilder',
              monsterName: info?.activeMonster?.name || null,
              monsterLevel: info?.activeMonster?.level || 1,
              monsterStage: info?.activeMonster?.evolutionStage || 1,
              monsterImageUrl: info?.activeMonster?.imageUrl || null,
              totalExp: info?.profile?.totalExp || 0,
              isFriend: friendIds.has(loc.userId),
              isPending: pendingIds.has(loc.userId),
            };
          });
        
        // Apply gender filter: use client-provided filter if available, otherwise use user's saved preference
        const genderFilter = input.genderFilter ?? await db.getUserGenderPreference(ctx.user.id);
        if (genderFilter === 'all') return results;
        return results.filter(u => {
          if (!u.gender) return true; // Show users without gender set
          return u.gender === genderFilter;
        });
      }),
  }),

  friends: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const friendsInfo = await db.getFriendsWithInfo(ctx.user.id);
      // Enrich with real-time online status from WebSocket connections
      const friendIds = friendsInfo.map((f: any) => f.user.id);
      const onlineMap = getOnlineStatuses(friendIds);
      return friendsInfo.map((f: any) => ({
        ...f,
        isOnline: onlineMap[f.user.id] || false,
      }));
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
          name: info?.activeMonster?.name || info?.profile?.trainerName || 'Trainer',
          monsterName: info?.activeMonster?.name || null,
          monsterType: info?.activeMonster?.monsterType || 'bodybuilder',
          monsterLevel: info?.activeMonster?.level || 1,
          monsterImageUrl: info?.activeMonster?.imageUrl || null,
          createdAt: p.createdAt,
        };
      });
    }),
    sentRequests: protectedProcedure.query(async ({ ctx }) => {
      const sent = await db.getSentFriendRequests(ctx.user.id);
      const targetIds = sent.map(s => s.friendId);
      const targetsInfo = await db.getUserInfoForNearby(targetIds);
      return sent.map(s => {
        const info = targetsInfo.find(u => u.user.id === s.friendId);
        return {
          friendshipId: s.id,
          userId: s.friendId,
          name: info?.activeMonster?.name || info?.profile?.trainerName || info?.user.name || 'Trainer',
          monsterName: info?.activeMonster?.name || null,
          monsterType: info?.activeMonster?.monsterType || 'bodybuilder',
          monsterLevel: info?.activeMonster?.level || 1,
          monsterImageUrl: info?.activeMonster?.imageUrl || null,
          createdAt: s.createdAt,
        };
      });
    }),
    locations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getFriendsLocations(ctx.user.id);
    }),
    sendRequest: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify target user exists
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        if (dbInstance) {
          const { users: usersTable } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const targetUser = await dbInstance.select().from(usersTable).where(eq(usersTable.id, input.targetUserId)).limit(1);
          if (targetUser.length === 0) {
            return { success: false, message: 'Target user does not exist' };
          }
        }
        // Check if friendship already exists
        const existing = await db.checkFriendship(ctx.user.id, input.targetUserId);
        if (existing) {
          return { success: false, message: 'Friend request already exists', status: existing.status };
        }
        const id = await db.createFriendship({
          userId: ctx.user.id,
          friendId: input.targetUserId,
        });
        // Send real-time notification to target user
        const senderMonster = await db.getActiveMonster(ctx.user.id);
        const senderName = senderMonster?.name || 'A trainer';
        sendToUser(input.targetUserId, {
          type: 'friend_request',
          fromUserId: ctx.user.id,
          fromName: senderName,
        });
        // Send push notification
        sendPushNotification(input.targetUserId, {
          title: '\u{1F4E8} New Friend Request',
          body: `${senderName} wants to be your friend!`,
          data: { type: 'friend_request', fromUserId: ctx.user.id },
        });
        return { success: true, id };
      }),
    acceptRequest: protectedProcedure
      .input(z.object({ friendshipId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateFriendship(input.friendshipId, 'accepted');
        // Find who sent the request so we can notify them
        const friendship = await db.checkFriendship(ctx.user.id, 0); // We need the friendship row
        // Query the friendship by id to find the sender
        const { getDb } = await import('./db');
        const dbInstance = await getDb();
        if (dbInstance) {
          const { friendships } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const rows = await dbInstance.select().from(friendships).where(eq(friendships.id, input.friendshipId)).limit(1);
          if (rows[0]) {
            const senderId = rows[0].userId;
            const acceptorMonster = await db.getActiveMonster(ctx.user.id);
            const acceptorName = acceptorMonster?.name || 'A trainer';
            sendToUser(senderId, {
              type: 'friend_accepted',
              fromUserId: ctx.user.id,
              fromName: acceptorName,
            });
            // Send push notification to original sender
            sendPushNotification(senderId, {
              title: '\u{2705} Friend Request Accepted',
              body: `${acceptorName} accepted your friend request!`,
              data: { type: 'friend_accepted', fromUserId: ctx.user.id },
            });
          }
        }
        return { success: true };
      }),
    rejectRequest: protectedProcedure
      .input(z.object({ friendshipId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateFriendship(input.friendshipId, 'blocked');
        return { success: true };
      }),
    toggleHideLocation: protectedProcedure
      .input(z.object({ friendId: z.number(), hide: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.toggleFriendHideLocation(ctx.user.id, input.friendId, input.hide);
        return { success: true };
      }),
    hideStatus: protectedProcedure.query(async ({ ctx }) => {
      return await db.getFriendsHideStatus(ctx.user.id);
    }),
  }),

  // Match radius management
  matchRadius: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return { radiusKm: await db.getUserMatchRadius(ctx.user.id) };
    }),
    update: protectedProcedure
      .input(z.object({ radiusKm: z.number().min(0.1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateMatchRadius(ctx.user.id, input.radiusKm);
        return { success: true };
      }),
  }),

  // Test fake users (for development/testing only - requires auth)
  testLocation: router({
    insertFakeUsers: protectedProcedure
      .input(z.object({
        centerLat: z.number(),
        centerLng: z.number(),
        count: z.number().default(100),
      }))
      .mutation(async ({ input }) => {
        const ids = await db.insertFakeUsers(input.centerLat, input.centerLng, input.count);
        console.log(`[Test] Inserted ${ids.length} fake users around (${input.centerLat}, ${input.centerLng})`);
        return { count: ids.length, userIds: ids };
      }),
    deleteFakeUsers: protectedProcedure
      .input(z.object({ userIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.deleteFakeUsers(input.userIds);
        console.log(`[Test] Deleted ${input.userIds.length} fake users`);
        return { success: true, deleted: input.userIds.length };
      }),
  }),

  // Push notification token management
  pushToken: router({
    register: protectedProcedure
      .input(z.object({
        token: z.string(),
        platform: z.enum(["ios", "android", "web"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await chatDb.savePushToken(ctx.user.id, input.token, input.platform);
        return { success: true, id };
      }),
    remove: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        await chatDb.removePushToken(input.token);
        return { success: true };
      }),
  }),

  // Chat API (for REST fallback, main chat uses WebSocket)
  chat: router({
    history: protectedProcedure
      .input(z.object({
        friendId: z.number(),
        limit: z.number().optional(),
        before: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await chatDb.getChatHistory(
          ctx.user.id,
          input.friendId,
          input.limit || 50,
          input.before ? new Date(input.before) : undefined
        );
      }),
    conversations: protectedProcedure.query(async ({ ctx }) => {
      const previews = await chatDb.getConversationPreviews(ctx.user.id);
      const unreadByFriend = await chatDb.getUnreadCountByFriend(ctx.user.id);
      return previews.map(p => ({
        ...p,
        unreadCount: unreadByFriend.find(u => u.senderId === p.partnerId)?.count || 0,
      }));
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return { count: await chatDb.getUnreadCount(ctx.user.id) };
    }),
    markRead: protectedProcedure
      .input(z.object({ senderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await chatDb.markMessagesAsRead(input.senderId, ctx.user.id);
        // Notify sender via WebSocket that messages were read
        sendToUser(input.senderId, {
          type: "messages_read",
          readerId: ctx.user.id,
        });
        return { success: true };
      }),
    uploadImage: protectedProcedure
      .input(z.object({
        base64: z.string(),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const mimeType = input.mimeType || "image/jpeg";
        const ext = mimeType.includes("png") ? "png" : "jpg";
        const key = `chat-images/${ctx.user.id}/${Date.now()}.${ext}`;
        const buffer = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buffer, mimeType);
        return { url };
      }),
    uploadAudio: protectedProcedure
      .input(z.object({
        base64: z.string(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const key = `chat-audio/${ctx.user.id}/${Date.now()}.m4a`;
        const buffer = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buffer, "audio/mp4");
        return { url, duration: input.duration || 0 };
      }),
    // REST fallback: send message via tRPC (used when WS is down)
    sendMessage: protectedProcedure
      .input(z.object({
        receiverId: z.number(),
        message: z.string(),
        messageType: z.enum(["text", "image", "audio"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const senderId = ctx.user.id;
        const { receiverId, message, messageType } = input;
        console.log(`[Chat REST] sendMessage from ${senderId} to ${receiverId}, type: ${messageType || "text"}`);

        // Save to database
        const savedMsg = await chatDb.saveMessage({
          senderId,
          receiverId,
          message: message.trim(),
          messageType: messageType || "text",
        });

        if (!savedMsg) {
          throw new Error("Failed to save message");
        }

        // Send push notification to receiver (REST-only, no WS)
        console.log(`[Chat REST] Sending push notification to user ${receiverId} for message ${savedMsg.id}`);
        const senderMonster = await db.getActiveMonster(senderId);
        const senderName = senderMonster?.name || "Someone";
        const preview = (messageType === "image") ? "📷 Photo"
          : (messageType === "audio") ? "🎤 Voice message"
          : message.trim().substring(0, 100);
        sendChatPushNotification(senderId, receiverId, senderName, preview, savedMsg.id)
          .catch(err => console.error("[Chat REST] Push notification failed:", err));

        return savedMsg;
      }),
  }),

  dailyStats: router({
    get: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        return await db.getDailyStats(ctx.user.id, input.date);
      }),
    upsert: protectedProcedure
      .input(
        z.object({
          date: z.string(),
          steps: z.number().optional(),
          caloriesIntake: z.number().optional(),
          caloriesBurned: z.number().optional(),
          proteinIntake: z.number().optional(),
          workoutExp: z.number().optional(),
          nutritionExp: z.number().optional(),
          netExp: z.number().optional(),
          healthScore: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { date, ...data } = input;
        const id = await db.upsertDailyStats(ctx.user.id, date, data);
        return { id };
      }),
  }),
});

export type AppRouter = typeof appRouter;
