import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

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
              content: `You are a professional nutritionist AI. Analyze the food image and return a JSON object with the following structure:
{
  "foods": [
    {
      "name": "string - name of the food item",
      "portion": "string - estimated portion size (e.g., '1 cup', '200g')",
      "calories": number,
      "protein": number (in grams),
      "carbs": number (in grams),
      "fat": number (in grams),
      "fiber": number (in grams)
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "healthScore": number (1-10, how healthy is this meal),
  "summary": "string - brief description of the meal"
}

Be accurate with nutritional estimates. If you cannot identify the food, still provide your best guess. Always return valid JSON.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this food image and provide detailed nutrition information." },
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
        radiusKm: z.number().default(10),
      }))
      .query(async ({ ctx, input }) => {
        const nearbyLocations = await db.getNearbyUsers(ctx.user.id, input.latitude, input.longitude, input.radiusKm);
        const userIds = nearbyLocations.map(l => l.userId);
        const usersInfo = await db.getUserInfoForNearby(userIds);
        
        return nearbyLocations.map(loc => {
          const info = usersInfo.find(u => u.user.id === loc.userId);
          return {
            ...loc,
            name: info?.profile?.trainerName || info?.user.name || 'Trainer',
            monsterType: info?.activeMonster?.monsterType || 'bodybuilder',
            monsterName: info?.activeMonster?.name || null,
            monsterLevel: info?.activeMonster?.level || 1,
            monsterStage: info?.activeMonster?.evolutionStage || 1,
            monsterImageUrl: info?.activeMonster?.imageUrl || null,
            totalExp: info?.profile?.totalExp || 0,
          };
        });
      }),
  }),

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
