/**
 * Monster Expression System
 *
 * Maps caring state (fullness, energy, mood) to expression variants.
 * Each monster type × stage has 4 expression images:
 *   - hungry: fullness < 30
 *   - tired: energy < 30
 *   - happy: overall good state (fullness > 60 && energy > 60)
 *   - peak: peak state buff active (fullness > 80 && energy > 80)
 *
 * Falls back to the default (neutral) image when no special expression applies.
 */

export type MonsterExpression = "default" | "hungry" | "tired" | "happy" | "peak";

// ── Expression images (require at build time) ──────────────────────────────

const EXPRESSION_IMAGES: Record<string, Record<number, Record<Exclude<MonsterExpression, "default">, any>>> = {
  bodybuilder: {
    1: {
      hungry: require("@/assets/monsters/expressions/bodybuilder-stage1-hungry.png"),
      tired: require("@/assets/monsters/expressions/bodybuilder-stage1-tired.png"),
      happy: require("@/assets/monsters/expressions/bodybuilder-stage1-happy.png"),
      peak: require("@/assets/monsters/expressions/bodybuilder-stage1-peak.png"),
    },
    2: {
      hungry: require("@/assets/monsters/expressions/bodybuilder-stage2-hungry.png"),
      tired: require("@/assets/monsters/expressions/bodybuilder-stage2-tired.png"),
      happy: require("@/assets/monsters/expressions/bodybuilder-stage2-happy.png"),
      peak: require("@/assets/monsters/expressions/bodybuilder-stage2-peak.png"),
    },
    3: {
      hungry: require("@/assets/monsters/expressions/bodybuilder-stage3-hungry.png"),
      tired: require("@/assets/monsters/expressions/bodybuilder-stage3-tired.png"),
      happy: require("@/assets/monsters/expressions/bodybuilder-stage3-happy.png"),
      peak: require("@/assets/monsters/expressions/bodybuilder-stage3-peak.png"),
    },
  },
  physique: {
    1: {
      hungry: require("@/assets/monsters/expressions/physique-stage1-hungry.png"),
      tired: require("@/assets/monsters/expressions/physique-stage1-tired.png"),
      happy: require("@/assets/monsters/expressions/physique-stage1-happy.png"),
      peak: require("@/assets/monsters/expressions/physique-stage1-peak.png"),
    },
    2: {
      hungry: require("@/assets/monsters/expressions/physique-stage2-hungry.png"),
      tired: require("@/assets/monsters/expressions/physique-stage2-tired.png"),
      happy: require("@/assets/monsters/expressions/physique-stage2-happy.png"),
      peak: require("@/assets/monsters/expressions/physique-stage2-peak.png"),
    },
    3: {
      hungry: require("@/assets/monsters/expressions/physique-stage3-hungry.png"),
      tired: require("@/assets/monsters/expressions/physique-stage3-tired.png"),
      happy: require("@/assets/monsters/expressions/physique-stage3-happy.png"),
      peak: require("@/assets/monsters/expressions/physique-stage3-peak.png"),
    },
  },
  powerlifter: {
    1: {
      hungry: require("@/assets/monsters/expressions/powerlifter-stage1-hungry.png"),
      tired: require("@/assets/monsters/expressions/powerlifter-stage1-tired.png"),
      happy: require("@/assets/monsters/expressions/powerlifter-stage1-happy.png"),
      peak: require("@/assets/monsters/expressions/powerlifter-stage1-peak.png"),
    },
    2: {
      hungry: require("@/assets/monsters/expressions/powerlifter-stage2-hungry.png"),
      tired: require("@/assets/monsters/expressions/powerlifter-stage2-tired.png"),
      happy: require("@/assets/monsters/expressions/powerlifter-stage2-happy.png"),
      peak: require("@/assets/monsters/expressions/powerlifter-stage2-peak.png"),
    },
    3: {
      hungry: require("@/assets/monsters/expressions/powerlifter-stage3-hungry.png"),
      tired: require("@/assets/monsters/expressions/powerlifter-stage3-tired.png"),
      happy: require("@/assets/monsters/expressions/powerlifter-stage3-happy.png"),
      peak: require("@/assets/monsters/expressions/powerlifter-stage3-peak.png"),
    },
  },
  bodybuilder2: {
    1: {
      hungry: require("@/assets/monsters/expressions/bodybuilder2-stage1-hungry.png"),
      tired: require("@/assets/monsters/expressions/bodybuilder2-stage1-tired.png"),
      happy: require("@/assets/monsters/expressions/bodybuilder2-stage1-happy.png"),
      peak: require("@/assets/monsters/expressions/bodybuilder2-stage1-peak.png"),
    },
    2: {
      hungry: require("@/assets/monsters/expressions/bodybuilder2-stage2-hungry.png"),
      tired: require("@/assets/monsters/expressions/bodybuilder2-stage2-tired.png"),
      happy: require("@/assets/monsters/expressions/bodybuilder2-stage2-happy.png"),
      peak: require("@/assets/monsters/expressions/bodybuilder2-stage2-peak.png"),
    },
    3: {
      hungry: require("@/assets/monsters/expressions/bodybuilder2-stage3-hungry.png"),
      tired: require("@/assets/monsters/expressions/bodybuilder2-stage3-tired.png"),
      happy: require("@/assets/monsters/expressions/bodybuilder2-stage3-happy.png"),
      peak: require("@/assets/monsters/expressions/bodybuilder2-stage3-peak.png"),
    },
  },
  physique2: {
    1: {
      hungry: require("@/assets/monsters/expressions/physique2-stage1-hungry.png"),
      tired: require("@/assets/monsters/expressions/physique2-stage1-tired.png"),
      happy: require("@/assets/monsters/expressions/physique2-stage1-happy.png"),
      peak: require("@/assets/monsters/expressions/physique2-stage1-peak.png"),
    },
    2: {
      hungry: require("@/assets/monsters/expressions/physique2-stage2-hungry.png"),
      tired: require("@/assets/monsters/expressions/physique2-stage2-tired.png"),
      happy: require("@/assets/monsters/expressions/physique2-stage2-happy.png"),
      peak: require("@/assets/monsters/expressions/physique2-stage2-peak.png"),
    },
    3: {
      hungry: require("@/assets/monsters/expressions/physique2-stage3-hungry.png"),
      tired: require("@/assets/monsters/expressions/physique2-stage3-tired.png"),
      happy: require("@/assets/monsters/expressions/physique2-stage3-happy.png"),
      peak: require("@/assets/monsters/expressions/physique2-stage3-peak.png"),
    },
  },
  powerlifter2: {
    1: {
      hungry: require("@/assets/monsters/expressions/powerlifter2-stage1-hungry.png"),
      tired: require("@/assets/monsters/expressions/powerlifter2-stage1-tired.png"),
      happy: require("@/assets/monsters/expressions/powerlifter2-stage1-happy.png"),
      peak: require("@/assets/monsters/expressions/powerlifter2-stage1-peak.png"),
    },
    2: {
      hungry: require("@/assets/monsters/expressions/powerlifter2-stage2-hungry.png"),
      tired: require("@/assets/monsters/expressions/powerlifter2-stage2-tired.png"),
      happy: require("@/assets/monsters/expressions/powerlifter2-stage2-happy.png"),
      peak: require("@/assets/monsters/expressions/powerlifter2-stage2-peak.png"),
    },
    3: {
      hungry: require("@/assets/monsters/expressions/powerlifter2-stage3-hungry.png"),
      tired: require("@/assets/monsters/expressions/powerlifter2-stage3-tired.png"),
      happy: require("@/assets/monsters/expressions/powerlifter2-stage3-happy.png"),
      peak: require("@/assets/monsters/expressions/powerlifter2-stage3-peak.png"),
    },
  },
};

// ── Default (neutral) images ────────────────────────────────────────────────

const DEFAULT_IMAGES: Record<string, Record<number, any>> = {
  bodybuilder: {
    1: require("@/assets/monsters/bodybuilder-stage1.png"),
    2: require("@/assets/monsters/bodybuilder-stage2.png"),
    3: require("@/assets/monsters/bodybuilder-stage3.png"),
  },
  physique: {
    1: require("@/assets/monsters/physique-stage1.png"),
    2: require("@/assets/monsters/physique-stage2.png"),
    3: require("@/assets/monsters/physique-stage3.png"),
  },
  powerlifter: {
    1: require("@/assets/monsters/powerlifter-stage1.png"),
    2: require("@/assets/monsters/powerlifter-stage2.png"),
    3: require("@/assets/monsters/powerlifter-stage3.png"),
  },
  bodybuilder2: {
    1: require("@/assets/monsters/bodybuilder2-stage1.png"),
    2: require("@/assets/monsters/bodybuilder2-stage2.png"),
    3: require("@/assets/monsters/bodybuilder2-stage3.png"),
  },
  physique2: {
    1: require("@/assets/monsters/physique2-stage1.png"),
    2: require("@/assets/monsters/physique2-stage2.png"),
    3: require("@/assets/monsters/physique2-stage3.png"),
  },
  powerlifter2: {
    1: require("@/assets/monsters/powerlifter2-stage1.png"),
    2: require("@/assets/monsters/powerlifter2-stage2.png"),
    3: require("@/assets/monsters/powerlifter2-stage3.png"),
  },
};

// ── Expression determination logic ──────────────────────────────────────────

/**
 * Determine which expression to show based on caring state values.
 * Priority order (highest first):
 *   1. peak  — fullness > 80 AND energy > 80 (peak state)
 *   2. hungry — fullness < 30
 *   3. tired  — energy < 30
 *   4. happy  — fullness > 60 AND energy > 60
 *   5. default — neutral expression
 */
export function getMonsterExpression(
  fullness: number,
  energy: number,
  _mood: number,
  peakStateBuff: boolean
): MonsterExpression {
  // Peak state takes highest priority
  if (peakStateBuff || (fullness > 80 && energy > 80)) {
    return "peak";
  }
  // Negative states next
  if (fullness < 30) {
    return "hungry";
  }
  if (energy < 30) {
    return "tired";
  }
  // Positive state
  if (fullness > 60 && energy > 60) {
    return "happy";
  }
  // Neutral
  return "default";
}

/**
 * Get the correct image source for a monster based on type, stage, and expression.
 */
export function getMonsterExpressionImage(
  type: string,
  stage: number,
  expression: MonsterExpression
): any {
  const normalizedType = type.toLowerCase();
  const clampedStage = Math.max(1, Math.min(3, stage));

  if (expression === "default") {
    return DEFAULT_IMAGES[normalizedType]?.[clampedStage]
      ?? DEFAULT_IMAGES.bodybuilder[1];
  }

  return EXPRESSION_IMAGES[normalizedType]?.[clampedStage]?.[expression]
    ?? DEFAULT_IMAGES[normalizedType]?.[clampedStage]
    ?? DEFAULT_IMAGES.bodybuilder[1];
}

/**
 * Convenience function: get the image source directly from caring state.
 */
export function getMonsterImageForCaringState(
  type: string,
  stage: number,
  fullness: number,
  energy: number,
  mood: number,
  peakStateBuff: boolean
): any {
  const expression = getMonsterExpression(fullness, energy, mood, peakStateBuff);
  return getMonsterExpressionImage(type, stage, expression);
}
