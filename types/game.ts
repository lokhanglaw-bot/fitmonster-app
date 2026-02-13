export type MonsterType = 'bodybuilder' | 'physique' | 'powerlifter';
export type MonsterStage = 1 | 2 | 3;

export interface Monster {
  id: string;
  name: string;
  type: MonsterType;
  stage: MonsterStage;
  level: number;
  xp: number;
  health: number;
  maxHealth: number;
  happiness: number;
  strength: number;
  agility: number;
  endurance: number;
  imageUrl: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'workout' | 'nutrition' | 'social' | 'daily';
  target: number;
  current: number;
  reward: {
    xp: number;
    items?: string[];
  };
  completed: boolean;
  expiresAt?: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number;
  target: number;
}

export interface GameState {
  userId: string;
  monster: Monster;
  quests: Quest[];
  achievements: Achievement[];
  streak: number;
  lastActiveDate: string;
  totalWorkouts: number;
  totalMealsLogged: number;
  totalBattles: number;
  wins: number;
  losses: number;
}
