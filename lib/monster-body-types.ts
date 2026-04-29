/**
 * Monster Body Type Image System (v2.0)
 *
 * Maps body types (peak, lean, standard, skinny, fat, obese) to monster images.
 * Falls back to the default monster image when a body-type-specific image is not available.
 *
 * Image naming convention:
 *   assets/monsters/body-types/{monsterType}-stage{1|2|3}-{bodyType}.png
 *
 * For now, most body types fall back to the default image.
 * As body-type-specific images are generated, add them to BODY_TYPE_IMAGES below.
 */

import type { BodyType } from "@/types/game";

// ── Body type images (add as they are generated) ──────────────────────────
// Structure: monsterType -> stage -> bodyType -> require()
// Only populated entries will be used; everything else falls back to default.
const BODY_TYPE_IMAGES: Record<string, Record<number, Partial<Record<BodyType, any>>>> = {
  // Example: when bodybuilder body type images are generated, add them here:
  // bodybuilder: {
  //   1: {
  //     peak: require("@/assets/monsters/body-types/bodybuilder-stage1-peak.png"),
  //     fat: require("@/assets/monsters/body-types/bodybuilder-stage1-fat.png"),
  //   },
  //   ...
  // },
};

// ── Default images (same as monster-expressions.ts) ───────────────────────
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

/**
 * Get the monster image for a specific body type.
 * Falls back to the default monster image if no body-type-specific image exists.
 */
export function getMonsterBodyTypeImage(
  type: string,
  stage: number,
  bodyType: BodyType
): any {
  const normalizedType = type.toLowerCase();
  const clampedStage = Math.max(1, Math.min(3, stage));

  // Try body-type-specific image first
  const bodyTypeImage = BODY_TYPE_IMAGES[normalizedType]?.[clampedStage]?.[bodyType];
  if (bodyTypeImage) return bodyTypeImage;

  // Fall back to default image
  return DEFAULT_IMAGES[normalizedType]?.[clampedStage]
    ?? DEFAULT_IMAGES.bodybuilder[1];
}

/**
 * Get a visual modifier description for the body type.
 * This can be used to apply CSS/style transforms to the base image
 * as a temporary solution before body-type-specific images are available.
 */
export function getBodyTypeTransform(bodyType: BodyType): {
  scaleX: number;
  scaleY: number;
  opacity: number;
} {
  switch (bodyType) {
    case "peak":
      return { scaleX: 1.0, scaleY: 1.0, opacity: 1.0 };
    case "lean":
      return { scaleX: 0.95, scaleY: 1.02, opacity: 1.0 };
    case "standard":
      return { scaleX: 1.0, scaleY: 1.0, opacity: 1.0 };
    case "skinny":
      return { scaleX: 0.88, scaleY: 1.04, opacity: 0.95 };
    case "fat":
      return { scaleX: 1.1, scaleY: 0.96, opacity: 1.0 };
    case "obese":
      return { scaleX: 1.2, scaleY: 0.92, opacity: 1.0 };
    default:
      return { scaleX: 1.0, scaleY: 1.0, opacity: 1.0 };
  }
}
