import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

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
}

const WorkoutTimerContext = createContext<WorkoutTimerContextType>({
  activeWorkout: null,
  elapsedSeconds: 0,
  startWorkout: () => {},
  pauseWorkout: () => {},
  resumeWorkout: () => {},
  finishWorkout: () => null,
  cancelWorkout: () => {},
});

export function useWorkoutTimer() {
  return useContext(WorkoutTimerContext);
}

// ── Provider ───────────────────────────────────────────────────────────────

export function WorkoutTimerProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    return workout;
  }, [activeWorkout]);

  const cancelWorkout = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveWorkout(null);
    setElapsedSeconds(0);
  }, []);

  return (
    <WorkoutTimerContext.Provider
      value={{
        activeWorkout,
        elapsedSeconds,
        startWorkout,
        pauseWorkout,
        resumeWorkout,
        finishWorkout,
        cancelWorkout,
      }}
    >
      {children}
    </WorkoutTimerContext.Provider>
  );
}
