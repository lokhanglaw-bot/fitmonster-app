export type MonsterType = 'bodybuilder' | 'physique' | 'powerlifter' | 'bodybuilder2' | 'physique2' | 'powerlifter2';
export type MonsterStage = 1 | 2 | 3;

// v2.0 Body Type System
export type BodyType = 'skinny' | 'standard' | 'lean' | 'fat' | 'obese' | 'peak';

export const MALE_FAT_THRESHOLDS = {
  peak: 12,      // < 12% → peak
  lean: 18,      // < 18% → lean
  standard: 25,  // < 25% → standard
  fat: 30,       // < 30% → fat
  obese: 100,    // >= 30% → obese
};

export const FEMALE_FAT_THRESHOLDS = {
  peak: 18,      // < 18% → peak
  lean: 25,      // < 25% → lean
  standard: 32,  // < 32% → standard
  fat: 38,       // < 38% → fat
  obese: 100,    // >= 38% → obese
};

export const BODY_TYPE_LABELS: Record<BodyType, { en: string; zh: string }> = {
  skinny: { en: 'Skinny', zh: '骨感' },
  standard: { en: 'Standard', zh: '標準' },
  lean: { en: 'Lean', zh: '精實' },
  fat: { en: 'Overweight', zh: '肥胖' },
  obese: { en: 'Obese', zh: '過重' },
  peak: { en: 'Peak', zh: '健美' },
};

export const BODY_TYPE_ATTACK_MOD: Record<BodyType, number> = {
  peak: 1.20,
  lean: 1.10,
  standard: 1.0,
  skinny: 0.95,
  fat: 0.90,
  obese: 0.80,
};

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
  // v2.0 body type fields
  muscleScore: number;
  fatScore: number;
  bodyType: BodyType;
}

// v2.0 Battle System - RPS (Rock Paper Scissors)
export type BattleMove = 'powerStrike' | 'evade' | 'counter';
export type RoundResult = 'p1win' | 'p2win' | 'draw';

export const BATTLE_MOVES: Record<BattleMove, { en: string; zh: string; emoji: string }> = {
  powerStrike: { en: 'Power Strike', zh: '猛攻', emoji: '⚔️' },
  evade: { en: 'Evade', zh: '閃避', emoji: '💨' },
  counter: { en: 'Counter', zh: '反擊', emoji: '🛡️' },
};

// RPS resolution: [attacker][defender] → result for attacker
export const RPS_RESOLUTION: Record<BattleMove, Record<BattleMove, RoundResult>> = {
  powerStrike: { powerStrike: 'draw', evade: 'p1win', counter: 'p2win' },
  evade: { powerStrike: 'p2win', evade: 'draw', counter: 'p1win' },
  counter: { powerStrike: 'p1win', evade: 'p2win', counter: 'draw' },
};

export interface FitnessBonuses {
  workedOut: boolean;
  proteinMet: boolean;
  steps10k: boolean;
  bodyFatLow: boolean;
  peakState: boolean;
  streak7days: boolean;
  damageMultiplier: number;
  extraHp: number;
  tieBreakAdvantage: boolean;
}

export interface BattleRound {
  roundNumber: number;
  player1Move: BattleMove;
  player2Move: BattleMove;
  player1Damage: number;
  player2Damage: number;
  result: RoundResult;
  player1HpAfter: number;
  player2HpAfter: number;
}

export interface BattleState {
  battleId: number;
  status: 'waiting' | 'prep' | 'selecting' | 'revealing' | 'finished';
  currentRound: number;
  maxRounds: number;
  player1: {
    userId: number;
    monsterName: string;
    monsterType: MonsterType;
    monsterStage: MonsterStage;
    level: number;
    muscleScore: number;
    bodyType: BodyType;
    hp: number;
    maxHp: number;
    fitnessBonus: FitnessBonuses;
  };
  player2: {
    userId: number;
    monsterName: string;
    monsterType: MonsterType;
    monsterStage: MonsterStage;
    level: number;
    muscleScore: number;
    bodyType: BodyType;
    hp: number;
    maxHp: number;
    fitnessBonus: FitnessBonuses;
  };
  rounds: BattleRound[];
  winnerId: number | null;
  myMove: BattleMove | null;
  timeLeft: number;
}

export const BATTLE_CONFIG = {
  MAX_ROUNDS: 10,
  ROUND_TIMEOUT_MS: 10_000,
  PREP_TIME_MS: 3_000,
  REVEAL_TIME_MS: 1_500,
  BASE_HP: 100,
  HP_PER_LEVEL: 5,
  WIN_EXP: 100,
  LOSE_EXP: 30,
  DRAW_EXP: 50,
  DEFAULT_MOVE: 'powerStrike' as BattleMove,
};

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
