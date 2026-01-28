import { generateSlopeggleLevel, verifyDeterminism } from "../SlopeggleLevelGenerator";
import type { SlopeggleLevelOverlay } from "../types";

/**
 * Example: Generate levels with different difficulty settings
 */
export function generateExampleLevels(): {
  easy: SlopeggleLevelOverlay;
  medium: SlopeggleLevelOverlay;
  hard: SlopeggleLevelOverlay;
  extreme: SlopeggleLevelOverlay;
} {
  return {
    easy: generateSlopeggleLevel({
      seed: "slopeggle-easy-seed",
      packId: "slopeggle-basic-v1",
      levelId: "1",
      difficultyTier: "easy",
    }),

    medium: generateSlopeggleLevel({
      seed: "slopeggle-medium-seed",
      packId: "slopeggle-basic-v1",
      levelId: "2",
      difficultyTier: "medium",
    }),

    hard: generateSlopeggleLevel({
      seed: "slopeggle-hard-seed",
      packId: "slopeggle-basic-v1",
      levelId: "3",
      difficultyTier: "hard",
    }),

    extreme: generateSlopeggleLevel({
      seed: "slopeggle-extreme-seed",
      packId: "slopeggle-challenge-v1",
      levelId: "boss",
      difficultyTier: "extreme",
    }),
  };
}

/**
 * Example: Verify determinism of the generator
 */
export function demonstrateDeterminism(): void {
  const params = {
    seed: 12345,
    packId: "test-pack",
    levelId: "test-level",
    difficultyTier: "medium" as const,
  };

  const result = verifyDeterminism(params);

  console.log("Determinism verification:");
  console.log("  Deterministic:", result.deterministic);
  console.log("  Orange count (level 1):", result.overlay1.pegs.filter((p) => p.isOrange).length);
  console.log("  Orange count (level 2):", result.overlay2.pegs.filter((p) => p.isOrange).length);

  if (!result.deterministic) {
    throw new Error("Generator is not deterministic!");
  }
}

/**
 * Example: Generate level with custom parameters
 */
export function generateCustomLevel(): SlopeggleLevelOverlay {
  return generateSlopeggleLevel({
    seed: "custom-level-seed",
    packId: "my-custom-pack",
    levelId: "special",
    difficultyTier: "medium",
    title: "Lucky Shot",
    description: "A challenging layout with hidden orange paths",
    orangeCount: 12,
    lives: 8,
    hasBucket: true,
    hasPortals: true,
    bucketAmplitude: 4.5,
    bucketFrequency: 0.3,
    minOrangeAccessibility: 5,
  });
}

/**
 * Example: Generate multiple levels from same pack with different seeds
 */
export function generatePackLevels(count: number, baseSeed: string): SlopeggleLevelOverlay[] {
  return Array.from({ length: count }, (_, i) =>
    generateSlopeggleLevel({
      seed: `${baseSeed}-${i + 1}`,
      packId: "procedural-pack",
      levelId: String(i + 1),
      difficultyTier: i < 3 ? "easy" : i < 6 ? "medium" : "hard",
      ordinal: i + 1,
    })
  );
}

/**
 * Example output for documentation
 */
export function getExampleJSON(): string {
  const level = generateSlopeggleLevel({
    seed: 42,
    packId: "demo-pack",
    levelId: "demo",
    difficultyTier: "easy",
  });

  return JSON.stringify(
    {
      schemaVersion: level.schemaVersion,
      packId: level.packId,
      levelId: level.levelId,
      generatorId: level.generatorId,
      generatorVersion: level.generatorVersion,
      seed: level.seed,
      title: level.title,
      description: level.description,
      difficulty: level.difficulty,
      pegs: level.pegs.slice(0, 5).map((p) => ({
        x: p.x.toFixed(3),
        y: p.y.toFixed(3),
        isOrange: p.isOrange,
      })),
      lives: level.lives,
      totalPegs: level.pegs.length,
      orangePegs: level.pegs.filter((p) => p.isOrange).length,
      dynamicElements: level.dynamicElements?.map((e) => ({
        type: e.type,
        motion: e.motion ? { type: e.motion.type, amplitude: e.motion.amplitude } : null,
      })),
    },
    null,
    2
  );
}
