import type { LevelDefinition, AngryBurnsLevelOverrides, GameEntity } from '../../types';
import type { SeededRandom } from '../SeededRandom';
import {
  createSeededRandomWithSubstreams,
  seedFromObject,
} from '../SeededRandom';

export const GENERATOR_ID = 'angry-burns-generator';
export const GENERATOR_VERSION = '1.0.0';

// World configuration constants (matching base game)
const WORLD_WIDTH = 20;
const WORLD_HEIGHT = 12;
const GROUND_Y = 11.5;
const GROUND_HEIGHT = 1;
const RIGHT_WALL_X = 19.75;

// Launcher configuration
const LAUNCHER_X = 3;
const LAUNCHER_Y = 9;

// Tower build region
const TOWER_MIN_X = 12;
const TOWER_MAX_X = 18;

// Block dimensions (from base game templates)
const BLOCK_WIDTH = 0.8;
const BLOCK_HEIGHT = 0.4;
const BLOCK_GAP = 0.05; // Small gap for stability
const TOTAL_BLOCK_SPACING = BLOCK_WIDTH + BLOCK_GAP;

// Target dimensions
const TARGET_RADIUS = 0.35;

/**
 * Parameters for generating an Angry Burns level.
 */
export interface GenerateAngryBurnsLevelParams {
  /** Seed for deterministic generation (string or number) */
  seed: string | number;
  /** Pack identifier */
  packId: string;
  /** Level identifier within the pack */
  levelId: string;
  /** Difficulty from 0 (easiest) to 1 (hardest) */
  difficulty01: number;
  /** Optional level index for additional variation */
  levelIndex?: number;
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
}

/**
 * Difficulty parameters derived from difficulty01.
 */
interface DerivedDifficulty {
  towerRows: number; // 3-9
  towerColumns: number; // 2-5
  targetCount: number; // 1-4
  lives: number; // 5-3
  stoneRatio: number; // 0.3-0.7 (more stone = harder)
  woodRatio: number; // 0.3-0.5
  glassRatio: number; // 0.2-0.4
}

/**
 * Linear interpolation helper.
 */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * Convert a seed to a number for RNG initialization.
 */
function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') {
    return seed;
  }
  return seedFromObject(seed);
}

/**
 * Generate difficulty parameters from difficulty01.
 */
function deriveDifficulty(difficulty01: number, levelIndex?: number): DerivedDifficulty {
  // Clamp difficulty to [0, 1]
  const t = Math.max(0, Math.min(1, difficulty01));

  // Add level index influence for progression within a pack
  const levelOffset = levelIndex !== undefined ? levelIndex * 0.02 : 0;
  const adjustedT = Math.max(0, Math.min(1, t + levelOffset));

  return {
    towerRows: Math.round(lerp(3, 9, adjustedT)),
    towerColumns: Math.round(lerp(2, 5, adjustedT)),
    targetCount: Math.round(lerp(1, 4, adjustedT)),
    lives: Math.round(lerp(5, 3, adjustedT)),
    stoneRatio: lerp(0.3, 0.7, adjustedT),
    woodRatio: lerp(0.4, 0.3, adjustedT),
    glassRatio: lerp(0.3, 0.2, adjustedT),
  };
}

/**
 * Generate a unique entity ID using the IDs substream.
 */
function generateEntityId(rng: ReturnType<SeededRandom['ids']>, prefix: string): string {
  const num = rng.nextInt(1000, 9999);
  return `${prefix}-${num}`;
}

/**
 * Get a block template based on material probabilities.
 */
function selectBlockTemplate(
  rng: ReturnType<SeededRandom['stream']>,
  difficulty: DerivedDifficulty
): 'woodBlock' | 'stoneBlock' | 'glassBlock' {
  const rand = rng.next();
  const stoneThreshold = difficulty.stoneRatio;
  const woodThreshold = stoneThreshold + difficulty.woodRatio;

  if (rand < stoneThreshold) {
    return 'stoneBlock';
  } else if (rand < woodThreshold) {
    return 'woodBlock';
  }
  return 'glassBlock';
}

/**
 * Main level generation function for Angry Burns.
 */
export function generateAngryBurnsLevel(params: GenerateAngryBurnsLevelParams): LevelDefinition {
  const {
    seed,
    packId,
    levelId,
    difficulty01,
    levelIndex,
    title,
    description,
  } = params;

  // Initialize RNG with substream support
  const seedNumber = hashSeed(seed);
  const rng = createSeededRandomWithSubstreams(seedNumber);

  // Derive difficulty parameters
  const difficulty = deriveDifficulty(difficulty01, levelIndex);

  // Get custom substreams for materials and targets
  const materialsRng = rng.stream('materials');
  const targetsRng = rng.stream('targets');

  // Generate all entities
  const entities: GameEntity[] = [];

  // Ground platform (static)
  entities.push({
    id: generateEntityId(rng.ids(), 'ground'),
    name: 'ground',
    template: 'ground',
    transform: {
      x: WORLD_WIDTH / 2,
      y: GROUND_Y,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });

  // Right wall (static)
  entities.push({
    id: generateEntityId(rng.ids(), 'wall'),
    name: 'wall-right',
    template: 'wall',
    transform: {
      x: RIGHT_WALL_X,
      y: WORLD_HEIGHT / 2,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });

  // Launcher cannon (using shared mechanics)
  entities.push({
    id: generateEntityId(rng.ids(), 'cannon'),
    name: 'cannon',
    template: 'cannon',
    transform: {
      x: LAUNCHER_X,
      y: LAUNCHER_Y,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });

  // Generate tower blocks
  const towerStartY = GROUND_Y - (GROUND_HEIGHT / 2) - (BLOCK_HEIGHT / 2);
  const towerCenterX = (TOWER_MIN_X + TOWER_MAX_X) / 2;
  const totalTowerWidth = difficulty.towerColumns * TOTAL_BLOCK_SPACING - BLOCK_GAP;
  const towerStartX = towerCenterX - (totalTowerWidth / 2) + (BLOCK_WIDTH / 2);

  for (let row = 0; row < difficulty.towerRows; row++) {
    const rowY = towerStartY - row * BLOCK_HEIGHT;

    for (let col = 0; col < difficulty.towerColumns; col++) {
      const colX = towerStartX + col * TOTAL_BLOCK_SPACING;

      // Skip some blocks for variety based on layout RNG
      const skipProbability = 0.15;
      if (rng.layout().next() < skipProbability && row > 0) {
        continue;
      }

      // Select block template based on material RNG
      const blockTemplate = selectBlockTemplate(materialsRng, difficulty);

      entities.push({
        id: generateEntityId(rng.ids(), blockTemplate.replace('Block', '')),
        name: `${blockTemplate}-r${row}-c${col}`,
        template: blockTemplate,
        transform: {
          x: colX,
          y: rowY,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      });
    }
  }

  // Generate targets at various positions within/above the tower
  const targetPositions = generateTargetPositions(
    targetsRng,
    difficulty.targetCount,
    difficulty,
    towerStartY,
    towerStartX,
    towerCenterX,
    towerStartX + (difficulty.towerColumns - 1) * TOTAL_BLOCK_SPACING
  );

  for (let i = 0; i < targetPositions.length; i++) {
    const pos = targetPositions[i];
    entities.push({
      id: generateEntityId(rng.ids(), 'target'),
      name: `target-${i}`,
      template: 'target',
      transform: {
        x: pos.x,
        y: pos.y,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });
  }

  // Build game-specific overrides
  const overrides: AngryBurnsLevelOverrides = {
    difficulty01,
    entities,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
  };

  // Estimate duration based on difficulty
  const estimatedDurationSeconds = Math.round(30 + difficulty.towerRows * 10 + difficulty.targetCount * 15);

  // Build the level definition
  const level: LevelDefinition = {
    schemaVersion: 1,
    packId,
    levelId,
    generatorId: GENERATOR_ID,
    generatorVersion: GENERATOR_VERSION,
    seed: String(seed),
    title: title ?? `Level ${levelId}`,
    description: description ?? `Destroy all ${difficulty.targetCount} targets with ${difficulty.lives} shots`,
    generatedAt: Date.now(),
    difficulty: {
      lives: difficulty.lives,
      estimatedDurationSeconds,
    },
    generatorParams: {
      difficulty01,
      levelIndex,
      towerRows: difficulty.towerRows,
      towerColumns: difficulty.towerColumns,
      targetCount: difficulty.targetCount,
      stoneRatio: difficulty.stoneRatio,
      woodRatio: difficulty.woodRatio,
      glassRatio: difficulty.glassRatio,
    },
    overrides: {
      angryBurns: overrides,
    },
  };

  return level;
}

/**
 * Position interface for target placement.
 */
interface TargetPosition {
  x: number;
  y: number;
}

/**
 * Generate target positions within and above the tower structure.
 */
function generateTargetPositions(
  targetsRng: ReturnType<SeededRandom['stream']>,
  targetCount: number,
  difficulty: DerivedDifficulty,
  towerStartY: number,
  towerStartX: number,
  towerCenterX: number,
  towerEndX: number
): TargetPosition[] {
  const positions: TargetPosition[] = [];

  if (targetCount <= 0) {
    return positions;
  }

  // Primary targets: place one in the center of the tower
  if (targetCount >= 1) {
    const midRow = Math.floor(difficulty.towerRows / 2);
    const midY = towerStartY - midRow * BLOCK_HEIGHT - BLOCK_HEIGHT / 2 - TARGET_RADIUS / 2;
    positions.push({ x: towerCenterX, y: midY });
  }

  // Secondary targets: place at corners or edges
  if (targetCount >= 2) {
    const topRow = difficulty.towerRows - 1;
    const topY = towerStartY - topRow * BLOCK_HEIGHT - BLOCK_HEIGHT / 2 - TARGET_RADIUS / 2;
    const sideX = towerStartX - BLOCK_WIDTH / 2;
    positions.push({ x: sideX, y: topY });
  }

  if (targetCount >= 3) {
    const topRow = difficulty.towerRows - 1;
    const topY = towerStartY - topRow * BLOCK_HEIGHT - BLOCK_HEIGHT / 2 - TARGET_RADIUS / 2;
    const sideX = towerEndX + BLOCK_WIDTH / 2;
    positions.push({ x: sideX, y: topY });
  }

  // Additional targets: random positions above the tower
  if (targetCount >= 4) {
    const extraCount = targetCount - 3;
    for (let i = 0; i < extraCount; i++) {
      const randX = targetsRng.range(towerStartX - BLOCK_WIDTH, towerEndX + BLOCK_WIDTH);
      const towerTopY = towerStartY - difficulty.towerRows * BLOCK_HEIGHT;
      const randY = targetsRng.range(towerTopY - 3, towerTopY - 0.5);
      positions.push({ x: randX, y: randY });
    }
  }

  return positions;
}

/**
 * Verify determinism by generating the same level twice.
 */
export function verifyAngryBurnsDeterminism(
  params: GenerateAngryBurnsLevelParams
): { deterministic: boolean; level1: LevelDefinition; level2: LevelDefinition } {
  const level1 = generateAngryBurnsLevel(params);
  const level2 = generateAngryBurnsLevel(params);

  const json1 = JSON.stringify(level1);
  const json2 = JSON.stringify(level2);

  return {
    deterministic: json1 === json2,
    level1,
    level2,
  };
}

/**
 * Result of validated level generation.
 */
export interface ValidatedGenerationResult {
  level: LevelDefinition;
  validation: Awaited<ReturnType<typeof import('../../validation/angryBurnsValidators').validateAngryBurnsLevel>>;
  attempt: number;
}

/**
 * Generate a validated Angry Burns level with automatic retry on validation failure.
 * Uses attempt substreams for deterministic retries.
 *
 * @param params - Level generation parameters
 * @param maxAttempts - Maximum generation attempts (default: 3)
 * @returns Validated level result with validation info
 */
export async function generateValidatedAngryBurnsLevel(
  params: GenerateAngryBurnsLevelParams,
  maxAttempts: number = 3
): Promise<ValidatedGenerationResult> {
  const { validateAngryBurnsLevel } = await import('../../validation/angryBurnsValidators');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptSeed = `${params.seed}:attempt:${attempt}`;
    const level = generateAngryBurnsLevel({ ...params, seed: attemptSeed });
    const entities = level.overrides?.angryBurns?.entities ?? [];

    const validation = validateAngryBurnsLevel(entities);

    if (validation.ok) {
      return { level, validation, attempt };
    }
  }

  const fallback = createFallbackTower(params);
  const fallbackValidation = validateAngryBurnsLevel(fallback.overrides?.angryBurns?.entities ?? []);

  return {
    level: fallback,
    validation: fallbackValidation,
    attempt: maxAttempts + 1,
  };
}

/**
 * Create a known-good fallback tower when generation consistently fails.
 * Simple 3x3 tower with 1 target - always valid.
 */
function createFallbackTower(params: GenerateAngryBurnsLevelParams): LevelDefinition {
  const fallbackEntities: GameEntity[] = [];

  fallbackEntities.push({
    id: 'fallback-ground',
    name: 'ground',
    template: 'ground',
    transform: { x: WORLD_WIDTH / 2, y: GROUND_Y, angle: 0, scaleX: 1, scaleY: 1 },
  });

  fallbackEntities.push({
    id: 'fallback-wall',
    name: 'wall-right',
    template: 'wall',
    transform: { x: RIGHT_WALL_X, y: WORLD_HEIGHT / 2, angle: 0, scaleX: 1, scaleY: 1 },
  });

  fallbackEntities.push({
    id: 'fallback-cannon',
    name: 'cannon',
    template: 'cannon',
    transform: { x: LAUNCHER_X, y: LAUNCHER_Y, angle: 0, scaleX: 1, scaleY: 1 },
  });

  const towerStartY = GROUND_Y - (GROUND_HEIGHT / 2) - (BLOCK_HEIGHT / 2);
  const towerCenterX = (TOWER_MIN_X + TOWER_MAX_X) / 2;

  const blockTemplates: Array<'woodBlock' | 'stoneBlock' | 'glassBlock'> = ['woodBlock', 'woodBlock', 'woodBlock'];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const colX = towerCenterX - BLOCK_WIDTH + col * BLOCK_WIDTH;
      const rowY = towerStartY - row * BLOCK_HEIGHT;
      const template = blockTemplates[(row * 3 + col) % blockTemplates.length];

      fallbackEntities.push({
        id: `fallback-${template}-r${row}-c${col}`,
        name: `${template}-r${row}-c${col}`,
        template,
        transform: { x: colX, y: rowY, angle: 0, scaleX: 1, scaleY: 1 },
      });
    }
  }

  fallbackEntities.push({
    id: 'fallback-target',
    name: 'target-0',
    template: 'target',
    transform: { x: towerCenterX, y: towerStartY - 3 * BLOCK_HEIGHT - TARGET_RADIUS, angle: 0, scaleX: 1, scaleY: 1 },
  });

  const overrides: AngryBurnsLevelOverrides = {
    difficulty01: params.difficulty01,
    entities: fallbackEntities,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
  };

  const level: LevelDefinition = {
    schemaVersion: 1,
    packId: params.packId,
    levelId: params.levelId,
    generatorId: GENERATOR_ID,
    generatorVersion: GENERATOR_VERSION,
    seed: `${params.seed}:fallback`,
    title: params.title ?? `Level ${params.levelId}`,
    description: params.description ?? 'Destroy the target with 5 shots',
    generatedAt: Date.now(),
    difficulty: { lives: 5, estimatedDurationSeconds: 30 },
    generatorParams: {
      difficulty01: params.difficulty01,
      levelIndex: params.levelIndex,
      towerRows: 3,
      towerColumns: 3,
      targetCount: 1,
      stoneRatio: 0,
      woodRatio: 1,
      glassRatio: 0,
    },
    overrides: { angryBurns: overrides },
  };

  return level;
}
