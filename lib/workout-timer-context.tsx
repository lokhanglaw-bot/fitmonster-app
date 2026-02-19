import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { AppState, AppStateStatus, Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

// ── Constants ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "fitmonster_active_workout";
const NOTIFICATION_ID = "workout-active-notification";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ActiveWorkout {
  exerciseName: string;
  exerciseIcon: string;
  exerciseMet: number;
  bonus: "none" | "outdoor" | "gym";
  startTime: number;       // Date.now() when workout started
  pausedDuration: number;  // total ms spent paused
  pauseStartTime: number | null; // Date.now() when paused, null if running
  isRunning: boolean;
}

interface WorkoutTimerContextType {
  activeWorkout: ActiveWorkout | null;
  elapsedSeconds: number;
  isRestored: boolean; // true if workout was restored from storage after app kill
  startWorkout: (params: {
    exerciseName: string;
    exerciseIcon: string;
    exerciseMet: number;
    bonus: "none" | "outdoor" | "gym";
  }) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  finishWorkout: () => ActiveWorkout | null;
  cancelWorkout: () => void;
  clearRestored: () => void;
}

const WorkoutTimerContext = createContext<WorkoutTimerContextType>({
  activeWorkout: null,
  elapsedSeconds: 0,
  isRestored: false,
  startWorkout: () => {},
  pauseWorkout: () => {},
  resumeWorkout: () => {},
  finishWorkout: () => null,
  cancelWorkout: () => {},
  clearRestored: () => {},
});

export function useWorkoutTimer() {
  return useContext(WorkoutTimerContext);
}

// ── Persistence helpers ───────────────────────────────────────────────────

async function persistWorkout(workout: ActiveWorkout | null) {
  try {
    if (workout) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(workout));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn("[WorkoutTimer] Failed to persist workout:", e);
  }
}

async function loadPersistedWorkout(): Promise<ActiveWorkout | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const workout = JSON.parse(json) as ActiveWorkout;
    // Sanity check: if startTime is more than 24 hours ago, discard it
    const MAX_WORKOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - workout.startTime > MAX_WORKOUT_MS) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return workout;
  } catch (e) {
    console.warn("[WorkoutTimer] Failed to load persisted workout:", e);
    return null;
  }
}

// ── Notification helpers ──────────────────────────────────────────────────

async function showWorkoutNotification(exerciseName: string, exerciseIcon: string) {
  if (Platform.OS === "web") return;
  try {
    // Request permission if not granted
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") return;
    }

    // Cancel any existing workout notification
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});

    // Schedule an immediate sticky notification
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: `${exerciseIcon} ${exerciseName}`,
        body: "Workout in progress... Tap to return.",
        sticky: true, // Android: notification cannot be swiped away
        autoDismiss: false,
        data: { type: "workout-active" },
      },
      trigger: null, // Show immediately
    });
  } catch (e) {
    console.warn("[WorkoutTimer] Failed to show notification:", e);
  }
}

async function cancelWorkoutNotification() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});
    // Also dismiss from notification center
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID).catch(() => {});
  } catch (e) {
    console.warn("[WorkoutTimer] Failed to cancel notification:", e);
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function WorkoutTimerProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRestored, setIsRestored] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedRef = useRef(false);

  // Calculate elapsed seconds from startTime (resilient to background/sleep)
  const calcElapsed = useCallback((workout: ActiveWorkout): number => {
    const now = Date.now();
    let totalPaused = workout.pausedDuration;
    if (workout.pauseStartTime !== null) {
      // Currently paused — add time since pause started
      totalPaused += now - workout.pauseStartTime;
    }
    const elapsedMs = now - workout.startTime - totalPaused;
    return Math.max(0, Math.floor(elapsedMs / 1000));
  }, []);

  // ── Restore from AsyncStorage on mount ──────────────────────────────────
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadPersistedWorkout().then((persisted) => {
      if (persisted) {
        setActiveWorkout(persisted);
        setElapsedSeconds(calcElapsed(persisted));
        setIsRestored(true);
        // Re-show notification in case it was cleared
        showWorkoutNotification(persisted.exerciseName, persisted.exerciseIcon);
      }
    });
  }, [calcElapsed]);

  // ── Persist whenever activeWorkout changes ──────────────────────────────
  useEffect(() => {
    // Skip the initial null state before loading
    if (!hasLoadedRef.current) return;
    persistWorkout(activeWorkout);
  }, [activeWorkout]);

  // Tick every second to update display
  useEffect(() => {
    if (activeWorkout && activeWorkout.isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calcElapsed(activeWorkout));
      }, 1000);
    } else if (activeWorkout && !activeWorkout.isRunning) {
      // Paused — show frozen time
      setElapsedSeconds(calcElapsed(activeWorkout));
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeWorkout, calcElapsed]);

  // When app comes back from background, recalculate elapsed time
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && activeWorkout) {
        setElapsedSeconds(calcElapsed(activeWorkout));
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [activeWorkout, calcElapsed]);

  const startWorkout = useCallback((params: {
    exerciseName: string;
    exerciseIcon: string;
    exerciseMet: number;
    bonus: "none" | "outdoor" | "gym";
  }) => {
    const workout: ActiveWorkout = {
      ...params,
      startTime: Date.now(),
      pausedDuration: 0,
      pauseStartTime: null,
      isRunning: true,
    };
    setActiveWorkout(workout);
    setElapsedSeconds(0);
    setIsRestored(false);
    // Show notification & persist
    showWorkoutNotification(params.exerciseName, params.exerciseIcon);
  }, []);

  const pauseWorkout = useCallback(() => {
    setActiveWorkout((prev) => {
      if (!prev || !prev.isRunning) return prev;
      return {
        ...prev,
        isRunning: false,
        pauseStartTime: Date.now(),
      };
    });
  }, []);

  const resumeWorkout = useCallback(() => {
    setActiveWorkout((prev) => {
      if (!prev || prev.isRunning || prev.pauseStartTime === null) return prev;
      const additionalPaused = Date.now() - prev.pauseStartTime;
      return {
        ...prev,
        isRunning: true,
        pausedDuration: prev.pausedDuration + additionalPaused,
        pauseStartTime: null,
      };
    });
  }, []);

  const finishWorkout = useCallback((): ActiveWorkout | null => {
    const workout = activeWorkout;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveWorkout(null);
    setElapsedSeconds(0);
    setIsRestored(false);
    // Clear notification & persisted state
    cancelWorkoutNotification();
    return workout;
  }, [activeWorkout]);

  const cancelWorkout = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveWorkout(null);
    setElapsedSeconds(0);
    setIsRestored(false);
    // Clear notification & persisted state
    cancelWorkoutNotification();
  }, []);

  const clearRestored = useCallback(() => {
    setIsRestored(false);
  }, []);

  return (
    <WorkoutTimerContext.Provider
      value={{
        activeWorkout,
        elapsedSeconds,
        isRestored,
        startWorkout,
        pauseWorkout,
        resumeWorkout,
        finishWorkout,
        cancelWorkout,
        clearRestored,
      }}
    >
      {children}
    </WorkoutTimerContext.Provider>
  );
}
