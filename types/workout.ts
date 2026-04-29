export type WorkoutType = 
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'sports'
  | 'other';

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'fullBody';

// v2.0 Set Types
export type SetType = 'warmup' | 'working' | 'failure' | 'drop' | 'super';

export const SET_TYPE_LABELS: Record<SetType, { en: string; zh: string; color: string }> = {
  warmup: { en: 'Warm-up', zh: '熱身', color: '#F59E0B' },
  working: { en: 'Working', zh: '正式', color: '#0a7ea4' },
  failure: { en: 'To Failure', zh: '力竭', color: '#EF4444' },
  drop: { en: 'Drop Set', zh: '遞減', color: '#8B5CF6' },
  super: { en: 'Superset', zh: '超級組', color: '#EC4899' },
};

// v2.0 Rest Timer Presets
export const REST_TIMER_PRESETS: Record<string, { seconds: number; label: string }> = {
  strength: { seconds: 90, label: '力量 90s' },
  hypertrophy: { seconds: 60, label: '增肌 60s' },
  superset: { seconds: 30, label: '超級組 30s' },
  custom: { seconds: 0, label: '自訂' },
};

export interface Exercise {
  id: string;
  name: string;
  nameZh?: string;
  category: ExerciseCategory;
  muscleGroup: string;
  secondaryMuscles?: string;
  equipment?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  type: WorkoutType;
  caloriesPerMinute: number;
  xpReward: number;
  isCompound?: boolean;
}

// v2.0 Workout Set (per-set tracking)
export interface WorkoutSetData {
  id?: number;
  setNumber: number;
  setType: SetType;
  weight?: number; // kg
  reps?: number;
  duration?: number; // seconds
  rpe?: number; // 1-10
  isPR: boolean;
  notes?: string;
}

// v2.0 Exercise Block (groups sets for one exercise)
export interface ExerciseBlock {
  exerciseId?: number;
  exerciseName: string;
  exerciseNameZh?: string;
  category: ExerciseCategory;
  muscleGroup: string;
  sets: WorkoutSetData[];
  lastSession?: {
    date: string;
    sets: WorkoutSetData[];
  };
}

// v2.0 Personal Record
export interface PersonalRecord {
  id: number;
  exerciseName: string;
  recordType: 'weight' | 'reps' | 'volume' | 'duration';
  value: number;
  previousValue?: number;
  achievedAt: Date;
}

// v2.0 Muscle Group Heat Map Data
export interface MuscleGroupVolume {
  muscleGroup: string;
  totalSets: number;
  totalVolume: number; // weight × reps
  lastWorked?: string;
  intensity: number; // 0-1 for heat map coloring
}

export interface WorkoutLog {
  id: string;
  userId: string;
  exercise: Exercise;
  duration: number; // in minutes
  reps?: number;
  sets?: number;
  weight?: number; // in kg
  caloriesBurned: number;
  xpEarned: number;
  notes?: string;
  createdAt: Date;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  exercises: WorkoutLog[];
  totalCalories: number;
  totalXp: number;
  completed: boolean;
  // v2.0 set tracking
  exerciseBlocks?: ExerciseBlock[];
}
