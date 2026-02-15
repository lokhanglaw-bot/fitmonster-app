import React, { createContext, useContext, useCallback, useEffect, useReducer, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FoodLogEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  expEarned: number;
  timestamp: string; // ISO string
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
  weeklyWorkout: number[];   // minutes per day
  // Date tracking
  lastResetDate: string;     // YYYY-MM-DD
  // Monster team
  monsters: MonsterData[];
  // All-time workout logs (for history)
  allWorkoutLogs: WorkoutLogEntry[];
}

const getToday = () => new Date().toISOString().split("T")[0];

const initialState: ActivityState = {
  todayProtein: 0,
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
  weeklyWorkout: [0, 0, 0, 0, 0, 0, 0],
  lastResetDate: getToday(),
  monsters: [],
  allWorkoutLogs: [],
};

// ── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOG_FOOD"; payload: Omit<FoodLogEntry, "id" | "timestamp"> }
  | { type: "LOG_WORKOUT"; payload: Omit<WorkoutLogEntry, "id" | "timestamp"> }
  | { type: "SYNC_STEPS"; payload: { steps: number } }
  | { type: "ADD_RECORD_FOOD"; payload: { name: string; calories: number } }
  | { type: "ADD_RECORD_WORKOUT"; payload: { name: string; duration: number } }
  | { type: "ADD_MONSTER"; payload: MonsterData }
  | { type: "SET_MONSTERS"; payload: MonsterData[] }
  | { type: "HYDRATE"; payload: ActivityState }
  | { type: "DAILY_RESET" }
  | { type: "FULL_RESET" };

function activityReducer(state: ActivityState, action: Action): ActivityState {
  switch (action.type) {
    case "LOG_FOOD": {
      const { name, calories, protein, carbs, fat, expEarned } = action.payload;
      const entry: FoodLogEntry = {
        id: `food-${Date.now()}`,
        name, calories, protein, carbs, fat, expEarned,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        todayProtein: state.todayProtein + protein,
        todayCaloriesIn: state.todayCaloriesIn + calories,
        todayMealCount: state.todayMealCount + 1,
        todayTotalExp: state.todayTotalExp + expEarned,
        todayFoodLogs: [...state.todayFoodLogs, entry],
        weeklyCalories: updateWeeklyLast(state.weeklyCalories, calories),
        weeklyProtein: updateWeeklyLast(state.weeklyProtein, protein),
      };
    }
    case "LOG_WORKOUT": {
      const { exercise, duration, expEarned } = action.payload;
      const caloriesBurned = Math.round(duration * 7.5); // rough estimate
      const entry: WorkoutLogEntry = {
        id: `workout-${Date.now()}`,
        exercise, duration, expEarned,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        todayWorkoutMinutes: state.todayWorkoutMinutes + duration,
        todayCaloriesBurned: state.todayCaloriesBurned + caloriesBurned,
        todayTotalExp: state.todayTotalExp + expEarned,
        todayWorkoutLogs: [...state.todayWorkoutLogs, entry],
        allWorkoutLogs: [...state.allWorkoutLogs, entry],
        weeklyWorkout: updateWeeklyLast(state.weeklyWorkout, duration),
      };
    }
    case "SYNC_STEPS": {
      return {
        ...state,
        todaySteps: state.todaySteps + action.payload.steps,
      };
    }
    case "ADD_RECORD_FOOD": {
      const { name, calories } = action.payload;
      const protein = Math.round(calories * 0.15 / 4); // rough estimate: 15% protein
      const exp = Math.round(calories * 0.05);
      const entry: FoodLogEntry = {
        id: `food-${Date.now()}`,
        name, calories, protein, carbs: 0, fat: 0, expEarned: exp,
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
      return {
        ...state,
        monsters: [...state.monsters, action.payload],
      };
    }
    case "SET_MONSTERS": {
      return {
        ...state,
        monsters: action.payload,
      };
    }
    case "HYDRATE":
      return action.payload;
    case "DAILY_RESET": {
      // Shift weekly arrays left, reset today's data but keep monsters and allWorkoutLogs
      return {
        ...initialState,
        weeklyCalories: [...state.weeklyCalories.slice(1), 0],
        weeklyProtein: [...state.weeklyProtein.slice(1), 0],
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
  addRecordFood: (name: string, calories: number) => void;
  addRecordWorkout: (name: string, duration: number) => void;
  addMonster: (monster: MonsterData) => void;
  setMonsters: (monsters: MonsterData[]) => void;
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
          // Check if we need a daily reset
          if (saved.lastResetDate !== getToday()) {
            dispatch({ type: "HYDRATE", payload: saved });
            dispatch({ type: "DAILY_RESET" });
          } else {
            dispatch({ type: "HYDRATE", payload: saved });
          }
        } else {
          // New user — start with clean state
          dispatch({ type: "FULL_RESET" });
        }
      } catch (e) {
        console.log("Failed to load activity state:", e);
        dispatch({ type: "FULL_RESET" });
      }
      isHydrated.current = true;
    })();
  }, [userId]);

  // Persist to AsyncStorage on every state change (after hydration)
  useEffect(() => {
    if (!isHydrated.current || !currentUserId.current) return;
    const key = getStorageKey(currentUserId.current);
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const logFood = useCallback((entry: Omit<FoodLogEntry, "id" | "timestamp">) => {
    dispatch({ type: "LOG_FOOD", payload: entry });
  }, []);

  const logWorkout = useCallback((entry: Omit<WorkoutLogEntry, "id" | "timestamp">) => {
    dispatch({ type: "LOG_WORKOUT", payload: entry });
  }, []);

  const syncSteps = useCallback((steps: number) => {
    dispatch({ type: "SYNC_STEPS", payload: { steps } });
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
      state, logFood, logWorkout, syncSteps, addRecordFood, addRecordWorkout,
      addMonster, setMonsters, resetForNewUser, switchUser,
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
