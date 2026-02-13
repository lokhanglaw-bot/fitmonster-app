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

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  type: WorkoutType;
  caloriesPerMinute: number;
  xpReward: number;
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
}
