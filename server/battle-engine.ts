import { getDb } from "./db";
import {
  battles,
  battleRounds,
  monsters,
  workouts,
  foodLogs,
  profiles,
  monsterCaring,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { BattleMove, FitnessBonuses, RoundResult } from "../types/game";
import { RPS_RESOLUTION, BATTLE_CONFIG, BODY_TYPE_ATTACK_MOD } from "../types/game";
import type { BodyType } from "../types/game";

// ── Fitness bonus calculation ──────────────────────────────────
export async function buildFitnessBonus(
  userId: number,
  date: string
): Promise<FitnessBonuses> {
  const db = await getDb();
  if (!db) {
    return defaultBonus();
  }

  const todayStart = new Date(`${date}T00:00:00`);
  const todayEnd = new Date(`${date}T23:59:59`);

  // Today's workouts
  const todayWorkouts = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.createdAt, todayStart),
        lte(workouts.createdAt, todayEnd)
      )
    );

  // Today's food
  const todayFood = await db
    .select()
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.userId, userId),
        gte(foodLogs.createdAt, todayStart),
        lte(foodLogs.createdAt, todayEnd)
      )
    );

  // Profile
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  // Monster
  const [monster] = await db
    .select()
    .from(monsters)
    .where(eq(monsters.userId, userId))
    .limit(1);

  // Caring state
  const [caring] = await db
    .select()
    .from(monsterCaring)
    .where(eq(monsterCaring.userId, userId))
    .limit(1);

  const workedOut = todayWorkouts.length > 0;
  const totalProtein = todayFood.reduce((s, f) => s + (f.protein ?? 0), 0);
  const proteinTarget = (profile?.weight ?? 70) * 0.7;
  const proteinMet = totalProtein >= proteinTarget;
  const steps10k = (profile?.totalSteps ?? 0) >= 10000;
  const fatScore = monster?.fatScore ?? 50;
  const gender = (profile?.gender as "male" | "female") ?? "male";
  const fatLimit = gender === "female" ? 25 : 20;
  const bodyFatLow = fatScore < fatLimit;
  const peakState =
    (caring?.fullness ?? 0) >= 80 && (caring?.energy ?? 0) >= 80;

  // Streak: count consecutive workout days
  const recentWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.createdAt))
    .limit(50);

  let streak = 0;
  const seenDates = new Set<string>();
  let lastDate = "";
  for (const w of recentWorkouts) {
    const d = w.createdAt.toISOString().split("T")[0];
    if (seenDates.has(d)) continue;
    if (lastDate && daysBetween(d, lastDate) > 1) break;
    seenDates.add(d);
    streak++;
    lastDate = d;
  }
  const streak7days = streak >= 7;

  let damageMultiplier = 1.0;
  if (workedOut) damageMultiplier += 0.15;
  if (streak7days) damageMultiplier += 0.2;
  if (peakState) damageMultiplier += 0.08;

  const extraHp = proteinMet ? 15 : 0;
  const tieBreakAdvantage = steps10k;

  return {
    workedOut,
    proteinMet,
    steps10k,
    bodyFatLow,
    peakState,
    streak7days,
    damageMultiplier,
    extraHp,
    tieBreakAdvantage,
  };
}

function defaultBonus(): FitnessBonuses {
  return {
    workedOut: false,
    proteinMet: false,
    steps10k: false,
    bodyFatLow: false,
    peakState: false,
    streak7days: false,
    damageMultiplier: 1.0,
    extraHp: 0,
    tieBreakAdvantage: false,
  };
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db2 = new Date(b);
  return Math.abs(Math.round((da.getTime() - db2.getTime()) / 86400000));
}

// ── Base damage formula ────────────────────────────────────────
function baseDamage(muscleScore: number, level: number): number {
  return muscleScore / 10 + level * 2 + (Math.random() * 9 + 1);
}

function bodyTypeAttackMod(bodyType: string): number {
  return BODY_TYPE_ATTACK_MOD[bodyType as BodyType] ?? 1.0;
}

// ── Resolve a single RPS round ─────────────────────────────────
export function resolveRound(
  p1Move: BattleMove,
  p2Move: BattleMove,
  p1Muscle: number,
  p1Level: number,
  p1Bonus: FitnessBonuses,
  p2Muscle: number,
  p2Level: number,
  p2Bonus: FitnessBonuses,
  p1BodyType: string,
  p2BodyType: string
): { p1Damage: number; p2Damage: number; result: RoundResult } {
  const result = RPS_RESOLUTION[p1Move][p2Move];
  const p1Base =
    baseDamage(p1Muscle, p1Level) *
    p1Bonus.damageMultiplier *
    bodyTypeAttackMod(p1BodyType);
  const p2Base =
    baseDamage(p2Muscle, p2Level) *
    p2Bonus.damageMultiplier *
    bodyTypeAttackMod(p2BodyType);

  let p1Damage = 0;
  let p2Damage = 0;

  if (result === "p1win") {
    // p1 hits p2
    p2Damage = p1Move === "counter" ? p2Base * 2.0 : p1Base * 1.5;
  } else if (result === "p2win") {
    // p2 hits p1
    p1Damage = p2Move === "counter" ? p1Base * 2.0 : p2Base * 1.5;
  } else {
    // draw — check tie-break advantage
    if (
      p1Bonus.tieBreakAdvantage &&
      !p2Bonus.tieBreakAdvantage &&
      p1Move === "evade"
    ) {
      p2Damage = p1Base * 0.8;
      return { p1Damage: 0, p2Damage: +p2Damage.toFixed(1), result: "p1win" };
    }
    if (
      p2Bonus.tieBreakAdvantage &&
      !p1Bonus.tieBreakAdvantage &&
      p2Move === "evade"
    ) {
      p1Damage = p2Base * 0.8;
      return { p1Damage: +p1Damage.toFixed(1), p2Damage: 0, result: "p2win" };
    }
    // Normal draw
    p1Damage = p2Base * 0.5;
    p2Damage = p1Base * 0.5;
  }

  return {
    p1Damage: +p1Damage.toFixed(1),
    p2Damage: +p2Damage.toFixed(1),
    result,
  };
}

// ── In-memory round state while battle is live ─────────────────
const pendingRounds = new Map<
  number,
  {
    p1Move: BattleMove | null;
    p2Move: BattleMove | null;
    timer: ReturnType<typeof setTimeout> | null;
  }
>();

// ── Create a new RPS battle ────────────────────────────────────
export async function createRPSBattle(
  challengerId: number,
  opponentId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date().toISOString().split("T")[0];

  // Get both monsters
  const [challengerMonster] = await db
    .select()
    .from(monsters)
    .where(eq(monsters.userId, challengerId))
    .limit(1);
  const [opponentMonster] = await db
    .select()
    .from(monsters)
    .where(eq(monsters.userId, opponentId))
    .limit(1);

  if (!challengerMonster || !opponentMonster) {
    throw new Error("Both players must have monsters");
  }

  // Build fitness bonuses
  const p1Bonus = await buildFitnessBonus(challengerId, today);
  const p2Bonus = await buildFitnessBonus(opponentId, today);

  // Calculate initial HP
  const p1Hp =
    BATTLE_CONFIG.BASE_HP +
    challengerMonster.level * BATTLE_CONFIG.HP_PER_LEVEL +
    p1Bonus.extraHp;
  const p2Hp =
    BATTLE_CONFIG.BASE_HP +
    opponentMonster.level * BATTLE_CONFIG.HP_PER_LEVEL +
    p2Bonus.extraHp;

  // Insert battle
  const result = await db.insert(battles).values({
    challengerId,
    opponentId,
    challengerMonsterId: challengerMonster.id,
    opponentMonsterId: opponentMonster.id,
    battleType: "pvp",
    status: "active",
    player1Hp: p1Hp,
    player2Hp: p2Hp,
    currentRound: 0,
    player1FitnessBonus: p1Bonus,
    player2FitnessBonus: p2Bonus,
    startedAt: new Date(),
  });

  const battleId = result[0].insertId;

  return {
    battleId,
    challengerMonster,
    opponentMonster,
    p1Bonus,
    p2Bonus,
    p1Hp,
    p2Hp,
  };
}

// ── Submit a move for a round ──────────────────────────────────
export async function submitMove(
  battleId: number,
  userId: number,
  move: BattleMove
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get battle
  const [battle] = await db
    .select()
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);

  if (!battle || battle.status !== "active") {
    throw new Error("Battle not active");
  }

  const isPlayer1 = userId === battle.challengerId;
  const isPlayer2 = userId === battle.opponentId;
  if (!isPlayer1 && !isPlayer2) throw new Error("Not a participant");

  // Get or create pending round
  let pending = pendingRounds.get(battleId);
  if (!pending) {
    pending = { p1Move: null, p2Move: null, timer: null };
    pendingRounds.set(battleId, pending);
  }

  // Set move
  if (isPlayer1) pending.p1Move = move;
  if (isPlayer2) pending.p2Move = move;

  // If both moves are in, resolve immediately
  if (pending.p1Move && pending.p2Move) {
    if (pending.timer) clearTimeout(pending.timer);
    return await resolveAndRecordRound(battleId, battle);
  }

  // Start timeout if first move
  if (!pending.timer) {
    pending.timer = setTimeout(async () => {
      const p = pendingRounds.get(battleId);
      if (p) {
        // Default move for timeout
        if (!p.p1Move) p.p1Move = BATTLE_CONFIG.DEFAULT_MOVE;
        if (!p.p2Move) p.p2Move = BATTLE_CONFIG.DEFAULT_MOVE;
        await resolveAndRecordRound(battleId, battle);
      }
    }, BATTLE_CONFIG.ROUND_TIMEOUT_MS);
  }

  return { status: "waiting", move };
}

// ── Resolve round and record to DB ─────────────────────────────
async function resolveAndRecordRound(battleId: number, battle: any) {
  const db = await getDb();
  if (!db) return null;

  const pending = pendingRounds.get(battleId);
  if (!pending || !pending.p1Move || !pending.p2Move) return null;

  // Get monsters
  const [p1Monster] = await db
    .select()
    .from(monsters)
    .where(eq(monsters.id, battle.challengerMonsterId))
    .limit(1);
  const [p2Monster] = await db
    .select()
    .from(monsters)
    .where(eq(monsters.id, battle.opponentMonsterId))
    .limit(1);

  if (!p1Monster || !p2Monster) return null;

  const p1Bonus = (battle.player1FitnessBonus as FitnessBonuses) ?? defaultBonus();
  const p2Bonus = (battle.player2FitnessBonus as FitnessBonuses) ?? defaultBonus();

  const roundResult = resolveRound(
    pending.p1Move,
    pending.p2Move,
    p1Monster.muscleScore,
    p1Monster.level,
    p1Bonus,
    p2Monster.muscleScore,
    p2Monster.level,
    p2Bonus,
    p1Monster.bodyType,
    p2Monster.bodyType
  );

  const newP1Hp = Math.max(0, battle.player1Hp - roundResult.p1Damage);
  const newP2Hp = Math.max(0, battle.player2Hp - roundResult.p2Damage);
  const newRound = battle.currentRound + 1;

  // Record round
  await db.insert(battleRounds).values({
    battleId,
    roundNumber: newRound,
    player1Move: pending.p1Move,
    player2Move: pending.p2Move,
    player1Damage: roundResult.p1Damage,
    player2Damage: roundResult.p2Damage,
    result: roundResult.result,
    player1HpAfter: newP1Hp,
    player2HpAfter: newP2Hp,
  });

  // Check if battle is over
  const isOver =
    newP1Hp <= 0 ||
    newP2Hp <= 0 ||
    newRound >= BATTLE_CONFIG.MAX_ROUNDS;

  let winnerId: number | null = null;
  if (isOver) {
    if (newP1Hp <= 0 && newP2Hp <= 0) {
      winnerId = null; // draw
    } else if (newP1Hp <= 0) {
      winnerId = battle.opponentId;
    } else if (newP2Hp <= 0) {
      winnerId = battle.challengerId;
    } else {
      // Max rounds reached — higher HP wins
      winnerId =
        newP1Hp > newP2Hp
          ? battle.challengerId
          : newP2Hp > newP1Hp
          ? battle.opponentId
          : null;
    }
  }

  // Update battle
  await db
    .update(battles)
    .set({
      player1Hp: newP1Hp,
      player2Hp: newP2Hp,
      currentRound: newRound,
      ...(isOver
        ? {
            status: "completed" as const,
            winnerId,
            completedAt: new Date(),
            expReward: winnerId ? BATTLE_CONFIG.WIN_EXP : BATTLE_CONFIG.DRAW_EXP,
          }
        : {}),
    })
    .where(eq(battles.id, battleId));

  // Clean up pending round
  pendingRounds.delete(battleId);

  return {
    roundNumber: newRound,
    player1Move: pending.p1Move,
    player2Move: pending.p2Move,
    player1Damage: roundResult.p1Damage,
    player2Damage: roundResult.p2Damage,
    result: roundResult.result,
    player1HpAfter: newP1Hp,
    player2HpAfter: newP2Hp,
    isOver,
    winnerId,
  };
}

// ── Get battle state ───────────────────────────────────────────
export async function getBattleState(battleId: number) {
  const db = await getDb();
  if (!db) return null;

  const [battle] = await db
    .select()
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);

  if (!battle) return null;

  const rounds = await db
    .select()
    .from(battleRounds)
    .where(eq(battleRounds.battleId, battleId))
    .orderBy(battleRounds.roundNumber);

  const [p1Monster] = await db
    .select()
    .from(monsters)
    .where(eq(monsters.id, battle.challengerMonsterId))
    .limit(1);
  const [p2Monster] = await db
    .select()
    .from(monsters)
    .where(eq(monsters.id, battle.opponentMonsterId))
    .limit(1);

  return {
    battle,
    rounds,
    p1Monster,
    p2Monster,
  };
}
