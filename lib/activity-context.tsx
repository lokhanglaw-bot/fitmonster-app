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
};

// ── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOG_FOOD"; payload: Omit<FoodLogEntry, "id" | "timestamp"> }
  | { type: "LOG_WORKOUT"; payload: Omit<WorkoutLogEntry, "id" | "timestamp"> }
  | { type: "SYNC_STEPS"; payload: { steps: number } }
  | { type: "ADD_RECORD_FOOD"; payload: { name: string; calories: number } }
  | { type: "ADD_RECORD_WORKOUT"; payload: { name: string; duration: number } }
  | { type: "HYDRATE"; payload: ActivityState }
  | { type: "DAILY_RESET" };

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
        weeklyWorkout: updateWeeklyLast(state.weeklyWorkout, duration),
      };
    }
    case "HYDRATE":
      return action.payload;
    case "DAILY_RESET": {
      // Shift weekly arrays left, reset today
      return {
        ...initialState,
        weeklyCalories: [...state.weeklyCalories.slice(1), 0],
        weeklyProtein: [...state.weeklyProtein.slice(1), 0],
        weeklyWorkout: [...state.weeklyWorkout.slice(1), 0],
        lastResetDate: getToday(),
      };
    }
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
}

const ActivityContext = createContext<ActivityContextType | null>(null);

const STORAGE_KEY = "@fitmonster_activity";

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(activityReducer, initialState);
  const isHydrated = useRef(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: ActivityState = JSON.parse(raw);
          // Check if we need a daily reset
          if (saved.lastResetDate !== getToday()) {
            dispatch({ type: "HYDRATE", payload: saved });
            dispatch({ type: "DAILY_RESET" });
          } else {
            dispatch({ type: "HYDRATE", payload: saved });
          }
        }
      } catch (e) {
        console.log("Failed to load activity state:", e);
      }
      isHydrated.current = true;
    })();
  }, []);

  // Persist to AsyncStorage on every state change (after hydration)
  useEffect(() => {
    if (!isHydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
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

  return (
    <ActivityContext.Provider value={{ state, logFood, logWorkout, syncSteps, addRecordFood, addRecordWorkout }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity(): ActivityContextType {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used within ActivityProvider");
  return ctx;
}
