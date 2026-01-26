import type {
  SlotContract,
  SlotImplementation,
} from '@slopcade/shared';
import { getGlobalSlotRegistry } from '@slopcade/shared';

const SYSTEM_ID = 'flappy';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

export const FLAPPY_SLOT_CONTRACTS: Record<string, SlotContract> = {
  jumpForce: {
    name: 'jumpForce',
    kind: 'pure',
    description: 'Calculate jump impulse based on input',
  },
  obstacleSpawner: {
    name: 'obstacleSpawner',
    kind: 'pure',
    description: 'Generate pipe/obstacle gaps at intervals',
  },
  scoring: {
    name: 'scoring',
    kind: 'pure',
    description: 'Points calculation per obstacle passed',
  },
  difficultyScaling: {
    name: 'difficultyScaling',
    kind: 'policy',
    description: 'Adjust gap size and speed over time',
  },
};

interface JumpForceInput {
  currentVelocityY: number;
  isGrounded: boolean;
}

interface JumpForceOutput {
  impulseY: number;
}

export const standardJump: SlotImplementation<JumpForceInput, JumpForceOutput> = {
  id: 'standard_jump',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'jumpForce' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, _input) => {
    return { impulseY: -8 };
  },
};

export const floatyJump: SlotImplementation<JumpForceInput, JumpForceOutput> = {
  id: 'floaty_jump',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'jumpForce' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, _input) => {
    return { impulseY: -6 };
  },
};

interface ObstacleSpawnerInput {
  worldHeight: number;
  minGapY: number;
  maxGapY: number;
  gapSize: number;
  score: number;
  elapsedTime: number;
}

interface ObstacleSpawnerOutput {
  gapCenterY: number;
  gapSize: number;
  pipeWidth: number;
}

export const randomPipes: SlotImplementation<ObstacleSpawnerInput, ObstacleSpawnerOutput> = {
  id: 'random_pipes',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'obstacleSpawner' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { minGapY, maxGapY, gapSize } = input;
    const gapCenterY = minGapY + Math.random() * (maxGapY - minGapY);
    return {
      gapCenterY,
      gapSize,
      pipeWidth: 1.5,
    };
  },
};

export const progressivePipes: SlotImplementation<ObstacleSpawnerInput, ObstacleSpawnerOutput> = {
  id: 'progressive_pipes',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'obstacleSpawner' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { minGapY, maxGapY, gapSize, score } = input;
    const shrinkFactor = Math.min(0.3, score * 0.005);
    const adjustedGapSize = gapSize * (1 - shrinkFactor);
    const minAdjustedGap = 2.5;
    const finalGapSize = Math.max(minAdjustedGap, adjustedGapSize);

    const gapCenterY = minGapY + Math.random() * (maxGapY - minGapY);
    return {
      gapCenterY,
      gapSize: finalGapSize,
      pipeWidth: 1.5,
    };
  },
};

interface ScoringInput {
  obstaclesPassed: number;
  distanceTraveled: number;
}

interface ScoringOutput {
  points: number;
}

export const pointPerPipe: SlotImplementation<ScoringInput, ScoringOutput> = {
  id: 'point_per_pipe',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'scoring' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    return { points: input.obstaclesPassed };
  },
};

export const distanceScoring: SlotImplementation<ScoringInput, ScoringOutput> = {
  id: 'distance_scoring',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'scoring' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    return { points: Math.floor(input.distanceTraveled / 10) };
  },
};

interface DifficultyScalingInput {
  score: number;
  elapsedTime: number;
  baseSpeed: number;
  baseGapSize: number;
}

interface DifficultyScalingOutput {
  speed: number;
  gapSize: number;
}

export const linearDifficulty: SlotImplementation<DifficultyScalingInput, DifficultyScalingOutput> = {
  id: 'linear_difficulty',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'difficultyScaling' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { score, baseSpeed, baseGapSize } = input;
    const speedIncrease = score * 0.02;
    const gapDecrease = score * 0.01;
    const maxSpeed = baseSpeed * 2;
    const minGap = 2.5;

    return {
      speed: Math.min(maxSpeed, baseSpeed + speedIncrease),
      gapSize: Math.max(minGap, baseGapSize - gapDecrease),
    };
  },
};

export const steppedDifficulty: SlotImplementation<DifficultyScalingInput, DifficultyScalingOutput> = {
  id: 'stepped_difficulty',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'difficultyScaling' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { score, baseSpeed, baseGapSize } = input;

    let speedMultiplier = 1.0;
    let gapMultiplier = 1.0;

    if (score >= 500) {
      speedMultiplier = 1.6;
      gapMultiplier = 0.7;
    } else if (score >= 200) {
      speedMultiplier = 1.4;
      gapMultiplier = 0.8;
    } else if (score >= 100) {
      speedMultiplier = 1.2;
      gapMultiplier = 0.9;
    }

    const minGap = 2.5;

    return {
      speed: baseSpeed * speedMultiplier,
      gapSize: Math.max(minGap, baseGapSize * gapMultiplier),
    };
  },
};

function registerIfNotExists(
  registry: ReturnType<typeof getGlobalSlotRegistry>,
  impl: SlotImplementation<unknown, unknown>
): void {
  if (!registry.has(impl.id)) {
    registry.register(impl);
  }
}

export function registerFlappySlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, standardJump as SlotImplementation);
  registerIfNotExists(registry, floatyJump as SlotImplementation);
  registerIfNotExists(registry, randomPipes as SlotImplementation);
  registerIfNotExists(registry, progressivePipes as SlotImplementation);
  registerIfNotExists(registry, pointPerPipe as SlotImplementation);
  registerIfNotExists(registry, distanceScoring as SlotImplementation);
  registerIfNotExists(registry, linearDifficulty as SlotImplementation);
  registerIfNotExists(registry, steppedDifficulty as SlotImplementation);
}
