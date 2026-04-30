import React, { createContext, useContext, useCallback, useEffect, useReducer, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { Platform } from "react-native";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FoodLogEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  expEarned: number;
  timestamp: string; // ISO string
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  imageUri?: string; // local photo URI
}

export interface WorkoutLogEntry {
  id: string;
  exercise: string;
  duration: number; // minutes
  expEarned: number;
  timestamp: string; // ISO string
}

export interface MonsterData {
  name: string;
  type: string;
  level: number;
  currentHp: number;
  maxHp: number;
  currentExp: number;
  expToNextLevel: number;
  strength: number;
  defense: number;
  agility: number;
  evolutionProgress: number;
  evolutionMax: number;
  status: string;
  stage: number;
}

export interface ActivityState {
  // Today's cumulative data
  todayProtein: number;      // grams
  todayCarbs: number;        // grams
  todayFat: number;          // grams
  todaySugar: number;        // grams
  todayCaloriesIn: number;   // kcal consumed
  todayCaloriesBurned: number; // kcal burned
  todayWorkoutMinutes: number;
  todaySteps: number;
  todayFoodLogs: FoodLogEntry[];
  todayWorkoutLogs: WorkoutLogEntry[];
  todayMealCount: number;
  todayTotalExp: number;
  // Lifetime / weekly aggregates
  weeklyCalories: number[];  // last 7 days
  weeklyProtein: number[];
  weeklyCarbs: number[];     // last 7 days
  weeklyFat: number[];       // last 7 days
  weeklySugar: number[];     // last 7 days
  weeklyWorkout: number[];   // minutes per day
  // Date tracking
  lastResetDate: string;     // YYYY-MM-DD
  // Monster team
  monsters: MonsterData[];
  activeMonsterIndex: number; // which monster is selected for training/battle
  // All-time workout logs (for history)
  allWorkoutLogs: WorkoutLogEntry[];
}

// FIX 24: Use local date instead of UTC to avoid timezone-related reset issues
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// FIX 24: Local timezone timestamp for food/workout log entries
const getLocalTimestamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const initialState: ActivityState = {
  todayProtein: 0,
  todayCarbs: 0,
  todayFat: 0,
  todaySugar: 0,
  todayCaloriesIn: 0,
  todayCaloriesBurned: 0,
  todayWorkoutMinutes: 0,
  todaySteps: 0,
  todayFoodLogs: [],
  todayWorkoutLogs: [],
  todayMealCount: 0,
  todayTotalExp: 0,
  weeklyCalories: [0, 0, 0, 0, 0, 0, 0],
  weeklyProtein: [0, 0, 0, 0, 0, 0, 0],
  weeklyCarbs: [0, 0, 0, 0, 0, 0, 0],
  weeklyFat: [0, 0, 0, 0, 0, 0, 0],
  weeklySugar: [0, 0, 0, 0, 0, 0, 0],
  weeklyWorkout: [0, 0, 0, 0, 0, 0, 0],
  lastResetDate: getToday(),
  monsters: [],
  activeMonsterIndex: 0,
  allWorkoutLogs: [],
};

// ── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOG_FOOD"; payload: Omit<FoodLogEntry, "id" | "timestamp"> }
  | { type: "LOG_WORKOUT"; payload: Omit<WorkoutLogEntry, "id" | "timestamp"> }
  | { type: "SYNC_STEPS"; payload: { steps: number } }
  | { type: "SET_STEPS"; payload: { steps: number } }
  | { type: "SYNC_HEALTH_DATA"; payload: { steps: number; caloriesBurned: number; workoutMinutes: number; workoutLogs: Omit<WorkoutLogEntry, "id" | "timestamp">[]; stepsExp: number } }
  | { type: "ADD_RECORD_FOOD"; payload: { name: string; calories: number } }
  | { type: "ADD_RECORD_WORKOUT"; payload: { name: string; duration: number } }
  | { type: "ADD_MONSTER"; payload: MonsterData }
  | { type: "SET_MONSTERS"; payload: MonsterData[] }
  | { type: "SET_ACTIVE_MONSTER"; payload: { index: number } }
  | { type: "REMOVE_MONSTER"; payload: { monsterIndex: number } }
  | { type: "EVOLVE_MONSTER"; payload: { monsterIndex: number } }
  | { type: "HYDRATE"; payload: ActivityState }
  | { type: "DAILY_RESET" }
  | { type: "FULL_RESET" };

function activityReducer(state: ActivityState, action: Action): ActivityState {
  switch (action.type) {
    case "LOG_FOOD": {
      const { name, calories, protein, carbs, fat, sugar, expEarned, mealType, imageUri } = action.payload;
      const entry: FoodLogEntry = {
        id: `food-${Date.now()}`,
        name, calories, protein, carbs, fat, sugar: sugar || 0, expEarned,
        timestamp: getLocalTimestamp(),
        mealType,
        imageUri,
      };
      const foodResult = {
        ...state,
        todayProtein: state.todayProtein + protein,
        todayCarbs: (state.todayCarbs || 0) + carbs,
        todayFat: (state.todayFat || 0) + fat,
        todaySugar: (state.todaySugar || 0) + (sugar || 0),
        todayCaloriesIn: state.todayCaloriesIn + calories,
        todayMealCount: state.todayMealCount + 1,
        todayTotalExp: state.todayTotalExp + expEarned,
        todayFoodLogs: [...state.todayFoodLogs, entry],
        weeklyCalories: updateWeeklyLast(state.weeklyCalories, calories),
        weeklyProtein: updateWeeklyLast(state.weeklyProtein, protein),
        weeklyCarbs: updateWeeklyLast(state.weeklyCarbs || [0,0,0,0,0,0,0], carbs),
        weeklyFat: updateWeeklyLast(state.weeklyFat || [0,0,0,0,0,0,0], fat),
        weeklySugar: updateWeeklyLast(state.weeklySugar || [0,0,0,0,0,0,0], sugar || 0),
      };
      // Add EXP to active monster's evolution progress
      return addEvolutionExp(foodResult, expEarned);
    }
    case "LOG_WORKOUT": {
      const { exercise, duration, expEarned } = action.payload;
      const caloriesBurned = Math.round(duration * 7.5); // rough estimate
      const entry: WorkoutLogEntry = {
        id: `workout-${Date.now()}`,
        exercise, duration, expEarned,
        timestamp: getLocalTimestamp(),
      };
      const workoutResult = {
        ...state,
        todayWorkoutMinutes: state.todayWorkoutMinutes + duration,
        todayCaloriesBurned: state.todayCaloriesBurned + caloriesBurned,
        todayTotalExp: state.todayTotalExp + expEarned,
        todayWorkoutLogs: [...state.todayWorkoutLogs, entry],
        allWorkoutLogs: [...state.allWorkoutLogs, entry],
        weeklyWorkout: updateWeeklyLast(state.weeklyWorkout, duration),
      };
      // Add EXP to active monster's evolution progress
      return addEvolutionExp(workoutResult, expEarned);
    }
    case "SYNC_STEPS": {
      return {
        ...state,
        todaySteps: state.todaySteps + action.payload.steps,
      };
    }
    case "SET_STEPS": {
      // Directly set steps to the absolute value from Apple Health / pedometer
      return {
        ...state,
        todaySteps: action.payload.steps,
      };
    }
    case "SYNC_HEALTH_DATA": {
      const { steps, caloriesBurned, workoutMinutes, workoutLogs, stepsExp } = action.payload;
      const now = getLocalTimestamp();
      const newWorkoutEntries: WorkoutLogEntry[] = workoutLogs.map((w, i) => ({
        id: `health-workout-${Date.now()}-${i}`,
        exercise: w.exercise,
        duration: w.duration,
        expEarned: w.expEarned,
        timestamp: now,
      }));
      const totalWorkoutExp = workoutLogs.reduce((sum, w) => sum + w.expEarned, 0);
      const totalExp = stepsExp + totalWorkoutExp;
      let healthResult = {
        ...state,
        todaySteps: state.todaySteps + steps,
        todayCaloriesBurned: state.todayCaloriesBurned + caloriesBurned,
        todayWorkoutMinutes: state.todayWorkoutMinutes + workoutMinutes,
        todayTotalExp: state.todayTotalExp + totalExp,
        todayWorkoutLogs: [...state.todayWorkoutLogs, ...newWorkoutEntries],
        allWorkoutLogs: [...state.allWorkoutLogs, ...newWorkoutEntries],
        weeklyWorkout: updateWeeklyLast(state.weeklyWorkout, workoutMinutes),
      };
      // Add EXP to active monster
      if (totalExp > 0) {
        healthResult = addEvolutionExp(healthResult, totalExp);
      }
      return healthResult;
    }
    case "ADD_RECORD_FOOD": {
      const { name, calories } = action.payload;
      const protein = Math.round(calories * 0.15 / 4); // rough estimate: 15% protein
      const exp = Math.round(calories * 0.05);
      const entry: FoodLogEntry = {
        id: `food-${Date.now()}`,
        name, calories, protein, carbs: 0, fat: 0, sugar: 0, expEarned: exp,
        timestamp: getLocalTimestamp(),
      };
      return {
        ...state,
        todayProtein: state.todayProtein + protein,
        todayCaloriesIn: state.todayCaloriesIn + calories,
        todayMealCount: state.todayMealCount + 1,
        todayTotalExp: state.todayTotalExp + exp,
        todayFoodLogs: [...state.todayFoodLogs, entry],
        weeklyCalories: updateWeeklyLast(state.weeklyCalories, calories),
        weeklyProtein: updateWeeklyLast(state.weeklyProtein, protein),
      };
    }
    case "ADD_RECORD_WORKOUT": {
      const { name, duration } = action.payload;
      const exp = Math.round(duration * 5);
      const caloriesBurned = Math.round(duration * 7.5);
      const entry: WorkoutLogEntry = {
        id: `workout-${Date.now()}`,
        exercise: name, duration, expEarned: exp,
        timestamp: getLocalTimestamp(),
      };
      return {
        ...state,
        todayWorkoutMinutes: state.todayWorkoutMinutes + duration,
        todayCaloriesBurned: state.todayCaloriesBurned + caloriesBurned,
        todayTotalExp: state.todayTotalExp + exp,
        todayWorkoutLogs: [...state.todayWorkoutLogs, entry],
        allWorkoutLogs: [...state.allWorkoutLogs, entry],
        weeklyWorkout: updateWeeklyLast(state.weeklyWorkout, duration),
      };
    }
    case "ADD_MONSTER": {
      if (state.monsters.length >= 3) return state; // Max 3 monsters
      return {
        ...state,
        monsters: [...state.monsters, action.payload],
        activeMonsterIndex: state.monsters.length, // Auto-select the newly added monster
      };
    }
    case "SET_ACTIVE_MONSTER": {
      const idx = action.payload.index;
      if (idx < 0 || idx >= state.monsters.length) return state;
      return { ...state, activeMonsterIndex: idx };
    }
    case "SET_MONSTERS": {
      return {
        ...state,
        monsters: action.payload,
      };
    }
    case "REMOVE_MONSTER": {
      const rmIdx = action.payload.monsterIndex;
      if (rmIdx < 0 || rmIdx >= state.monsters.length) return state;
      const newMonsters = state.monsters.filter((_, i) => i !== rmIdx);
      let newActiveIdx = state.activeMonsterIndex;
      if (newMonsters.length === 0) {
        newActiveIdx = 0;
      } else if (rmIdx === state.activeMonsterIndex) {
        newActiveIdx = 0;
      } else if (rmIdx < state.activeMonsterIndex) {
        newActiveIdx = state.activeMonsterIndex - 1;
      }
      return { ...state, monsters: newMonsters, activeMonsterIndex: newActiveIdx };
    }
    case "EVOLVE_MONSTER": {
      const idx = action.payload.monsterIndex;
      if (idx < 0 || idx >= state.monsters.length) return state;
      const monster = state.monsters[idx];
      if (monster.stage >= 3) return state; // Max stage reached
      const newStage = monster.stage + 1;
      // Stats boost on evolution
      const hpBoost = 50;
      const statBoost = 5;
      const newEvolutionMax = newStage === 2 ? 1500 : 9999; // Stage 2→3 needs 1500, stage 3 is max
      const updatedMonster: MonsterData = {
        ...monster,
        stage: newStage,
        evolutionProgress: 0,
        evolutionMax: newEvolutionMax,
        maxHp: monster.maxHp + hpBoost,
        currentHp: monster.currentHp + hpBoost,
        strength: monster.strength + statBoost,
        defense: monster.defense + statBoost,
        agility: monster.agility + statBoost,
        status: newStage === 2 ? "Trained" : "Champion",
      };
      const newMonsters = [...state.monsters];
      newMonsters[idx] = updatedMonster;
      return { ...state, monsters: newMonsters };
    }
    case "HYDRATE":
      return action.payload;
    case "DAILY_RESET": {
      // Shift weekly arrays left, reset today's data but keep monsters and allWorkoutLogs
      return {
        ...initialState,
        weeklyCalories: [...state.weeklyCalories.slice(1), 0],
        weeklyProtein: [...state.weeklyProtein.slice(1), 0],
        weeklyCarbs: [...(state.weeklyCarbs || [0,0,0,0,0,0,0]).slice(1), 0],
        weeklyFat: [...(state.weeklyFat || [0,0,0,0,0,0,0]).slice(1), 0],
        weeklyWorkout: [...state.weeklyWorkout.slice(1), 0],
        lastResetDate: getToday(),
        monsters: state.monsters,
        allWorkoutLogs: state.allWorkoutLogs,
      };
    }
    case "FULL_RESET":
      return initialState;
    default:
      return state;
  }
}

/** Add EXP to the active monster's evolution progress and level */
function addEvolutionExp(state: ActivityState, exp: number): ActivityState {
  if (state.monsters.length === 0) return state;
  const activeIdx = state.activeMonsterIndex;
  if (activeIdx < 0 || activeIdx >= state.monsters.length) return state;
  const monsters = [...state.monsters];
  const m = { ...monsters[activeIdx] };
  // Add to evolution progress (cap at evolutionMax)
  m.evolutionProgress = Math.min((m.evolutionProgress || 0) + exp, m.evolutionMax);
  // Add to level EXP
  m.currentExp = (m.currentExp || 0) + exp;
  // Level up logic
  while (m.currentExp >= m.expToNextLevel) {
    m.currentExp -= m.expToNextLevel;
    m.level += 1;
    m.expToNextLevel = Math.round(m.expToNextLevel * 1.2);
    m.maxHp += 10;
    m.currentHp = m.maxHp;
    m.strength += 2;
    m.defense += 2;
    m.agility += 2;
  }
  monsters[activeIdx] = m;
  return { ...state, monsters };
}

function updateWeeklyLast(arr: number[], add: number): number[] {
  const copy = [...arr];
  copy[copy.length - 1] = (copy[copy.length - 1] || 0) + add;
  return copy;
}

// ── Context ────────────────────────────────────────────────────────────────

interface ActivityContextType {
  state: ActivityState;
  logFood: (entry: Omit<FoodLogEntry, "id" | "timestamp">) => void;
  logWorkout: (entry: Omit<WorkoutLogEntry, "id" | "timestamp">) => void;
  syncSteps: (steps: number) => void;
  setSteps: (steps: number) => void;
  syncHealthData: (data: { steps: number; caloriesBurned: number; workoutMinutes: number; workoutLogs: Omit<WorkoutLogEntry, "id" | "timestamp">[]; stepsExp: number }) => void;
  addRecordFood: (name: string, calories: number) => void;
  addRecordWorkout: (name: string, duration: number) => void;
  addMonster: (monster: MonsterData) => void;
  setMonsters: (monsters: MonsterData[]) => void;
  removeMonster: (monsterIndex: number) => void;
  evolveMonster: (monsterIndex: number) => void;
  setActiveMonster: (index: number) => void;
  checkEvolution: () => { ready: boolean; monsterIndex: number; monsterName: string; newStage: number } | null;
  resetForNewUser: () => void;
  switchUser: (userId: string) => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | null>(null);

const STORAGE_KEY_PREFIX = "@fitmonster_activity_";

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function ActivityProvider({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const [state, dispatch] = useReducer(activityReducer, initialState);
  const isHydrated = useRef(false);
  const currentUserId = useRef<string | null>(null);

  // Load user data when userId changes
  useEffect(() => {
    if (!userId) {
      // No user logged in — reset to initial state
      dispatch({ type: "FULL_RESET" });
      isHydrated.current = false;
      currentUserId.current = null;
      return;
    }

    if (userId === currentUserId.current && isHydrated.current) {
      // Same user, already loaded
      return;
    }

    currentUserId.current = userId;
    isHydrated.current = false;

    (async () => {
      try {
        const key = getStorageKey(userId);
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const saved: ActivityState = JSON.parse(raw);
          // Ensure monsters and allWorkoutLogs arrays exist (migration)
          if (!saved.monsters) saved.monsters = [];
          if (!saved.allWorkoutLogs) saved.allWorkoutLogs = [];
          if (saved.activeMonsterIndex === undefined) saved.activeMonsterIndex = 0;
          // Check if we need a daily reset
          if (saved.lastResetDate !== getToday()) {
            dispatch({ type: "HYDRATE", payload: saved });
            dispatch({ type: "DAILY_RESET" });
          } else {
            dispatch({ type: "HYDRATE", payload: saved });
          }
        } else {
          // No local data — try to recover monsters from server
          dispatch({ type: "FULL_RESET" });
          try {
            const apiBase = getApiBaseUrl();
            if (apiBase) {
              const headers: Record<string, string> = { "Content-Type": "application/json" };
              if (Platform.OS !== "web") {
                const token = await Auth.getSessionToken();
                if (token) headers["Authorization"] = `Bearer ${token}`;
              }
              if (!headers["Authorization"]) {
                const localAuthRaw = await AsyncStorage.getItem("@fitmonster_local_auth");
                if (localAuthRaw) {
                  const localUser = JSON.parse(localAuthRaw);
                  if (localUser.openId) headers["Authorization"] = `Bearer ${localUser.openId}`;
                }
              }
              const resp = await fetch(`${apiBase}/api/trpc/monsters.list?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{json:null}}))}`, {
                method: "GET",
                headers,
                credentials: "include",
              });
              if (resp.ok) {
                const data = await resp.json();
                const serverMonsters = data?.[0]?.result?.data?.json;
                if (Array.isArray(serverMonsters) && serverMonsters.length > 0) {
                  console.log(`[Activity] Recovered ${serverMonsters.length} monsters from server`);
                  const recovered: MonsterData[] = serverMonsters.map((m: any) => ({
                    name: m.name || "Monster",
                    type: m.monsterType || m.type || "bodybuilder",
                    level: m.level || 1,
                    currentHp: m.currentHp || 100,
                    maxHp: m.maxHp || 100,
                    currentExp: m.currentExp || 0,
                    expToNextLevel: m.expToNextLevel || 100,
                    strength: m.strength || 10,
                    defense: m.defense || 10,
                    agility: m.agility || 10,
                    evolutionProgress: m.evolutionProgress || 0,
                    evolutionMax: 100,
                    status: m.status || "rookie",
                    stage: m.evolutionStage || m.stage || 1,
                  }));
                  dispatch({ type: "SET_MONSTERS", payload: recovered });
                  const activeIdx = serverMonsters.findIndex((m: any) => m.isActive);
                  if (activeIdx >= 0) {
                    dispatch({ type: "SET_ACTIVE_MONSTER", payload: { index: activeIdx } });
                  }
                }
              }
            }
          } catch (recoverErr) {
            console.log("[Activity] Server monster recovery failed (non-critical):", recoverErr);
          }
        }
      } catch (e) {
        console.log("Failed to load activity state:", e);
        dispatch({ type: "FULL_RESET" });
      }
      isHydrated.current = true;
    })();
  }, [userId]);

  // FIX 16: Debounce AsyncStorage persist (500ms) to avoid writing on every state change
  useEffect(() => {
    if (!isHydrated.current || !currentUserId.current) return;
    const key = getStorageKey(currentUserId.current);
    const timer = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  // Sync monsters to server whenever they change (for social features)
  const lastSyncedMonstersRef = useRef<string>("");
  const hasInitialSyncRef = useRef(false);
  useEffect(() => {
    if (!isHydrated.current || !userId || state.monsters.length === 0) return;
    // Only skip sync if monsters haven't changed AND we've already done initial sync
    const monstersKey = JSON.stringify(state.monsters.map(m => ({ name: m.name, type: m.type, level: m.level, stage: m.stage })));
    if (monstersKey === lastSyncedMonstersRef.current && hasInitialSyncRef.current) return;
    lastSyncedMonstersRef.current = monstersKey;
    hasInitialSyncRef.current = true;

    const syncToServer = async () => {
      try {
        const apiBase = getApiBaseUrl();
        if (!apiBase) return;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (Platform.OS !== "web") {
          const token = await Auth.getSessionToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
        // For local login users: add X-User-Id and X-Open-Id headers
        if (!headers["Authorization"]) {
          try {
            const localAuthRaw = await AsyncStorage.getItem("@fitmonster_local_auth");
            if (localAuthRaw) {
              const localUser = JSON.parse(localAuthRaw);
              if (localUser.openId) headers["Authorization"] = `Bearer ${localUser.openId}`;
            }
          } catch (_) { /* ignore */ }
        }
        // Use direct fetch to avoid tRPC circular dependency
        const body = JSON.stringify({
          "0": {
            json: {
              monsters: state.monsters.map(m => ({
                name: m.name,
                type: m.type,
                level: m.level,
                currentHp: m.currentHp,
                maxHp: m.maxHp,
                currentExp: m.currentExp,
                expToNextLevel: m.expToNextLevel,
                strength: m.strength,
                defense: m.defense,
                agility: m.agility,
                evolutionProgress: m.evolutionProgress,
                stage: m.stage,
                status: m.status || "rookie",
              })),
              activeIndex: state.activeMonsterIndex,
            },
          },
        });
        const resp = await fetch(`${apiBase}/api/trpc/monsters.sync?batch=1`, {
          method: "POST",
          headers,
          credentials: "include",
          body,
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => 'unknown');
          console.error(`[Activity] Monster sync HTTP ${resp.status}:`, errText);
        } else {
          console.log("[Activity] Monsters synced to server successfully");
        }
      } catch (err) {
        console.log("[Activity] Monster sync failed (non-critical):", err);
      }
    };
    // Debounce: wait 2 seconds after last change
    const timer = setTimeout(syncToServer, 2000);
    return () => clearTimeout(timer);
  }, [state.monsters, state.activeMonsterIndex, userId]);

  const logFood = useCallback((entry: Omit<FoodLogEntry, "id" | "timestamp">) => {
    dispatch({ type: "LOG_FOOD", payload: entry });
  }, []);

  const logWorkout = useCallback((entry: Omit<WorkoutLogEntry, "id" | "timestamp">) => {
    dispatch({ type: "LOG_WORKOUT", payload: entry });
  }, []);

  const syncSteps = useCallback((steps: number) => {
    dispatch({ type: "SYNC_STEPS", payload: { steps } });
  }, []);

  const setSteps = useCallback((steps: number) => {
    dispatch({ type: "SET_STEPS", payload: { steps } });
  }, []);

  const syncHealthData = useCallback((data: { steps: number; caloriesBurned: number; workoutMinutes: number; workoutLogs: Omit<WorkoutLogEntry, "id" | "timestamp">[]; stepsExp: number }) => {
    dispatch({ type: "SYNC_HEALTH_DATA", payload: data });
  }, []);

  const addRecordFood = useCallback((name: string, calories: number) => {
    dispatch({ type: "ADD_RECORD_FOOD", payload: { name, calories } });
  }, []);

  const addRecordWorkout = useCallback((name: string, duration: number) => {
    dispatch({ type: "ADD_RECORD_WORKOUT", payload: { name, duration } });
  }, []);

  const addMonster = useCallback((monster: MonsterData) => {
    dispatch({ type: "ADD_MONSTER", payload: monster });
  }, []);

  const setMonsters = useCallback((monsters: MonsterData[]) => {
    dispatch({ type: "SET_MONSTERS", payload: monsters });
  }, []);

  const removeMonster = useCallback((monsterIndex: number) => {
    dispatch({ type: "REMOVE_MONSTER", payload: { monsterIndex } });
  }, []);

  const evolveMonster = useCallback((monsterIndex: number) => {
    dispatch({ type: "EVOLVE_MONSTER", payload: { monsterIndex } });
  }, []);

  const setActiveMonster = useCallback((index: number) => {
    dispatch({ type: "SET_ACTIVE_MONSTER", payload: { index } });
  }, []);

  const checkEvolution = useCallback(() => {
    if (state.monsters.length === 0) return null;
    const activeIdx = state.activeMonsterIndex;
    if (activeIdx < 0 || activeIdx >= state.monsters.length) return null;
    const m = state.monsters[activeIdx];
    if (m.stage >= 3) return null; // Max stage
    const threshold = m.stage === 1 ? 500 : 1500; // Stage 1→2: 500, Stage 2→3: 1500
    if ((m.evolutionProgress || 0) >= threshold) {
      return { ready: true, monsterIndex: activeIdx, monsterName: m.name, newStage: m.stage + 1 };
    }
    return null;
  }, [state.monsters, state.activeMonsterIndex]);

  const resetForNewUser = useCallback(() => {
    dispatch({ type: "FULL_RESET" });
    isHydrated.current = false;
    currentUserId.current = null;
  }, []);

  const switchUser = useCallback(async (newUserId: string) => {
    // Save current user's data first
    if (currentUserId.current && isHydrated.current) {
      const key = getStorageKey(currentUserId.current);
      await AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
    }
    // The useEffect will handle loading the new user's data
    currentUserId.current = null;
    isHydrated.current = false;
  }, [state]);

  return (
    <ActivityContext.Provider value={{
      state, logFood, logWorkout, syncSteps, setSteps, syncHealthData, addRecordFood, addRecordWorkout,
      addMonster, setMonsters, removeMonster, evolveMonster, setActiveMonster, checkEvolution, resetForNewUser, switchUser,
    }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity(): ActivityContextType {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used within ActivityProvider");
  return ctx;
}
