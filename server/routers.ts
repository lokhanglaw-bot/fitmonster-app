import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

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
