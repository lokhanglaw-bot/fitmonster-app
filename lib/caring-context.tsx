import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CaringState {
  fullness: number; // 0-100
  energy: number;   // 0-100
  mood: number;     // 0-100
  peakStateBuff: boolean;
  lastFedAt: string | null;
  lastExerciseAt: string | null;
  consecutiveBalancedDays: number;
  consecutiveExerciseDays: number;
  fullnessStatus: string;
  energyStatus: string;
  moodStatus: string;
  overallStatus: string;
  hpEffect: { hpChange: number; reason: string };
  battleModifiers: {
    speedModifier: number;
    critModifier: number;
    overallModifier: number;
    canBattle: boolean;
    statusLabel: string;
  };
  dialogue: string;
  isLoading: boolean;
  lastSyncedAt: number;
}

const defaultState: CaringState = {
  fullness: 70,
  energy: 70,
  mood: 70,
  peakStateBuff: false,
  lastFedAt: null,
  lastExerciseAt: null,
  consecutiveBalancedDays: 0,
  consecutiveExerciseDays: 0,
  fullnessStatus: "normal",
  energyStatus: "normal",
  moodStatus: "normal",
  overallStatus: "good",
  hpEffect: { hpChange: 0, reason: "normal" },
  battleModifiers: {
    speedModifier: 1.0,
    critModifier: 0,
    overallModifier: 1.0,
    canBattle: true,
    statusLabel: "normal",
  },
  dialogue: "",
  isLoading: true,
  lastSyncedAt: 0,
};

// ── Context ────────────────────────────────────────────────────────────────

interface CaringContextType {
  state: CaringState;
  refresh: () => Promise<void>;
  feedMonster: (calories: number, protein: number, carbs: number, fats: number, mealType?: string) => Promise<{ fullnessGain: number; message: string } | null>;
  exerciseMonster: (duration: number, caloriesBurned: number, metValue?: number) => Promise<{ energyGain: number; message: string } | null>;
  getAdvice: (language: "en" | "zh") => Promise<string>;
}

const CaringContext = createContext<CaringContextType | null>(null);

const CARING_CACHE_KEY = "@fitmonster_caring_cache";
const SYNC_COOLDOWN_MS = 30_000; // 30 seconds between server syncs

export function CaringProvider({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const [state, setState] = useState<CaringState>(defaultState);
  const lastSyncRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // tRPC utils for manual invalidation
  const utils = trpc.useUtils();

  // Load cached state on mount
  useEffect(() => {
    isMountedRef.current = true;
    if (!userId) {
      setState(defaultState);
      return;
    }

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(`${CARING_CACHE_KEY}_${userId}`);
        if (cached && isMountedRef.current) {
          const parsed = JSON.parse(cached);
          setState(prev => ({ ...prev, ...parsed, isLoading: true }));
        }
      } catch {
        // ignore cache errors
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, [userId]);

  // Sync with server
  const refresh = useCallback(async () => {
    if (!userId) return;
    const now = Date.now();
    if (now - lastSyncRef.current < SYNC_COOLDOWN_MS) return;
    lastSyncRef.current = now;

    try {
      const result = await utils.caring.status.fetch();
      if (!isMountedRef.current) return;

      const newState: CaringState = {
        fullness: result.fullness,
        energy: result.energy,
        mood: result.mood,
        peakStateBuff: result.peakStateBuff,
        lastFedAt: result.lastFedAt,
        lastExerciseAt: result.lastExerciseAt,
        consecutiveBalancedDays: result.consecutiveBalancedDays,
        consecutiveExerciseDays: result.consecutiveExerciseDays,
        fullnessStatus: result.fullnessStatus,
        energyStatus: result.energyStatus,
        moodStatus: result.moodStatus,
        overallStatus: result.overallStatus,
        hpEffect: result.hpEffect,
        battleModifiers: result.battleModifiers,
        dialogue: state.dialogue, // preserve current dialogue
        isLoading: false,
        lastSyncedAt: now,
      };

      setState(newState);

      // Cache locally
      await AsyncStorage.setItem(`${CARING_CACHE_KEY}_${userId}`, JSON.stringify(newState));
    } catch (err) {
      console.log("[Caring] Sync failed:", err);
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [userId, utils, state.dialogue]);

  // Auto-sync on mount and periodically
  useEffect(() => {
    if (!userId) return;

    // Initial sync
    const timer = setTimeout(() => refresh(), 500);

    // Periodic refresh every 2 minutes
    const interval = setInterval(() => {
      lastSyncRef.current = 0; // Reset cooldown for periodic refresh
      refresh();
    }, 120_000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [userId, refresh]);

  const feedMonster = useCallback(async (
    calories: number, protein: number, carbs: number, fats: number, mealType = "meal"
  ) => {
    if (!userId) return null;
    try {
      const result = await utils.client.caring.feed.mutate({
        calories, protein, carbs, fats, mealType,
      });

      // Update local state immediately
      setState(prev => ({
        ...prev,
        fullness: result.newFullness,
        lastFedAt: new Date().toISOString(),
      }));

      // Force refresh from server
      lastSyncRef.current = 0;
      setTimeout(() => refresh(), 1000);

      return { fullnessGain: result.fullnessGain, message: result.message };
    } catch (err) {
      console.log("[Caring] Feed failed:", err);
      return null;
    }
  }, [userId, utils, refresh]);

  const exerciseMonster = useCallback(async (
    duration: number, caloriesBurned: number, metValue = 5
  ) => {
    if (!userId) return null;
    try {
      const result = await utils.client.caring.exercise.mutate({
        duration, caloriesBurned, metValue,
      });

      // Update local state immediately
      setState(prev => ({
        ...prev,
        energy: result.newEnergy,
        lastExerciseAt: new Date().toISOString(),
      }));

      // Force refresh from server
      lastSyncRef.current = 0;
      setTimeout(() => refresh(), 1000);

      return { energyGain: result.energyGain, message: result.message };
    } catch (err) {
      console.log("[Caring] Exercise failed:", err);
      return null;
    }
  }, [userId, utils, refresh]);

  const getAdvice = useCallback(async (language: "en" | "zh") => {
    if (!userId) return "";
    try {
      const result = await utils.client.caring.advice.mutate({ language });
      const dialogue = result.dialogue;
      setState(prev => ({ ...prev, dialogue }));
      return dialogue;
    } catch (err) {
      console.log("[Caring] Advice failed:", err);
      return "";
    }
  }, [userId, utils]);

  return (
    <CaringContext.Provider value={{ state, refresh, feedMonster, exerciseMonster, getAdvice }}>
      {children}
    </CaringContext.Provider>
  );
}

export function useCaring(): CaringContextType {
  const ctx = useContext(CaringContext);
  if (!ctx) throw new Error("useCaring must be used within CaringProvider");
  return ctx;
}
