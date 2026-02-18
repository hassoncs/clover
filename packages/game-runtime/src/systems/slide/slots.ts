import type {
  SlotContract,
  SlotImplementation,
} from '@slopcade/shared';
import { getGlobalSlotRegistry } from '@slopcade/shared';

const SYSTEM_ID = 'slide';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

export const SLIDE_SLOT_CONTRACTS: Record<string, SlotContract> = {
  slideRule: {
    name: 'slideRule',
    kind: 'policy',
    description: 'How tiles move on input (4-direction, 8-direction)',
  },
  mergeLogic: {
    name: 'mergeLogic',
    kind: 'pure',
    description: 'What happens when tiles collide (2048, Threes-style)',
  },
  tileSpawner: {
    name: 'tileSpawner',
    kind: 'pure',
    description: 'Where and what value new tiles spawn',
  },
  scoring: {
    name: 'scoring',
    kind: 'pure',
    description: 'Points per merge',
  },
};

type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

interface Tile {
  id: string;
  value: number;
  position: { row: number; col: number };
  mergedThisTurn: boolean;
}

interface SlideRuleInput {
  direction: Direction;
  gridSize: number;
}

interface SlideRuleOutput {
  isValidDirection: boolean;
  traversalOrder: Array<{ row: number; col: number }>;
  moveVector: { row: number; col: number };
}

export const fourDirectionSlide: SlotImplementation<SlideRuleInput, SlideRuleOutput> = {
  id: 'four_direction_slide',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'slideRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { direction, gridSize } = input;
    const validDirections = ['up', 'down', 'left', 'right'];

    if (!validDirections.includes(direction)) {
      return {
        isValidDirection: false,
        traversalOrder: [],
        moveVector: { row: 0, col: 0 },
      };
    }

    const traversalOrder: Array<{ row: number; col: number }> = [];
    let moveVector: { row: number; col: number };

    switch (direction) {
      case 'up':
        moveVector = { row: -1, col: 0 };
        for (let col = 0; col < gridSize; col++) {
          for (let row = 0; row < gridSize; row++) {
            traversalOrder.push({ row, col });
          }
        }
        break;
      case 'down':
        moveVector = { row: 1, col: 0 };
        for (let col = 0; col < gridSize; col++) {
          for (let row = gridSize - 1; row >= 0; row--) {
            traversalOrder.push({ row, col });
          }
        }
        break;
      case 'left':
        moveVector = { row: 0, col: -1 };
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            traversalOrder.push({ row, col });
          }
        }
        break;
      case 'right':
        moveVector = { row: 0, col: 1 };
        for (let row = 0; row < gridSize; row++) {
          for (let col = gridSize - 1; col >= 0; col--) {
            traversalOrder.push({ row, col });
          }
        }
        break;
      default:
        moveVector = { row: 0, col: 0 };
    }

    return {
      isValidDirection: true,
      traversalOrder,
      moveVector,
    };
  },
};

export const eightDirectionSlide: SlotImplementation<SlideRuleInput, SlideRuleOutput> = {
  id: 'eight_direction_slide',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'slideRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { direction, gridSize } = input;
    const validDirections = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];

    if (!validDirections.includes(direction)) {
      return {
        isValidDirection: false,
        traversalOrder: [],
        moveVector: { row: 0, col: 0 },
      };
    }

    const traversalOrder: Array<{ row: number; col: number }> = [];
    let moveVector: { row: number; col: number };

    switch (direction) {
      case 'up':
        moveVector = { row: -1, col: 0 };
        for (let col = 0; col < gridSize; col++) {
          for (let row = 0; row < gridSize; row++) {
            traversalOrder.push({ row, col });
          }
        }
        break;
      case 'down':
        moveVector = { row: 1, col: 0 };
        for (let col = 0; col < gridSize; col++) {
          for (let row = gridSize - 1; row >= 0; row--) {
            traversalOrder.push({ row, col });
          }
        }
        break;
      case 'left':
        moveVector = { row: 0, col: -1 };
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            traversalOrder.push({ row, col });
          }
        }
        break;
      case 'right':
        moveVector = { row: 0, col: 1 };
        for (let row = 0; row < gridSize; row++) {
          for (let col = gridSize - 1; col >= 0; col--) {
            traversalOrder.push({ row, col });
          }
        }
        break;
      case 'up-left':
        moveVector = { row: -1, col: -1 };
        for (let diag = 0; diag < gridSize * 2 - 1; diag++) {
          for (let row = 0; row < gridSize; row++) {
            const col = diag - row;
            if (col >= 0 && col < gridSize) {
              traversalOrder.push({ row, col });
            }
          }
        }
        break;
      case 'up-right':
        moveVector = { row: -1, col: 1 };
        for (let diag = 0; diag < gridSize * 2 - 1; diag++) {
          for (let row = 0; row < gridSize; row++) {
            const col = gridSize - 1 - diag + row;
            if (col >= 0 && col < gridSize) {
              traversalOrder.push({ row, col });
            }
          }
        }
        break;
      case 'down-left':
        moveVector = { row: 1, col: -1 };
        for (let diag = 0; diag < gridSize * 2 - 1; diag++) {
          for (let row = gridSize - 1; row >= 0; row--) {
            const col = diag - (gridSize - 1 - row);
            if (col >= 0 && col < gridSize) {
              traversalOrder.push({ row, col });
            }
          }
        }
        break;
      case 'down-right':
        moveVector = { row: 1, col: 1 };
        for (let diag = 0; diag < gridSize * 2 - 1; diag++) {
          for (let row = gridSize - 1; row >= 0; row--) {
            const col = gridSize - 1 - diag + (gridSize - 1 - row);
            if (col >= 0 && col < gridSize) {
              traversalOrder.push({ row, col });
            }
          }
        }
        break;
      default:
        moveVector = { row: 0, col: 0 };
    }

    return {
      isValidDirection: true,
      traversalOrder,
      moveVector,
    };
  },
};

interface MergeLogicInput {
  tileA: Tile;
  tileB: Tile;
}

interface MergeLogicOutput {
  canMerge: boolean;
  resultValue: number;
  destroyTileId: string | null;
}

export const standard2048Merge: SlotImplementation<MergeLogicInput, MergeLogicOutput> = {
  id: 'standard_2048_merge',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'mergeLogic' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { tileA, tileB } = input;

    if (tileA.mergedThisTurn || tileB.mergedThisTurn) {
      return { canMerge: false, resultValue: 0, destroyTileId: null };
    }

    if (tileA.value === tileB.value) {
      return {
        canMerge: true,
        resultValue: tileA.value * 2,
        destroyTileId: tileB.id,
      };
    }

    return { canMerge: false, resultValue: 0, destroyTileId: null };
  },
};

export const threesMerge: SlotImplementation<MergeLogicInput, MergeLogicOutput> = {
  id: 'threes_merge',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'mergeLogic' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { tileA, tileB } = input;

    if (tileA.mergedThisTurn || tileB.mergedThisTurn) {
      return { canMerge: false, resultValue: 0, destroyTileId: null };
    }

    const valA = tileA.value;
    const valB = tileB.value;

    if ((valA === 1 && valB === 2) || (valA === 2 && valB === 1)) {
      return {
        canMerge: true,
        resultValue: 3,
        destroyTileId: tileB.id,
      };
    }

    if (valA >= 3 && valB >= 3 && valA === valB) {
      return {
        canMerge: true,
        resultValue: valA + valB,
        destroyTileId: tileB.id,
      };
    }

    return { canMerge: false, resultValue: 0, destroyTileId: null };
  },
};

interface TileSpawnerInput {
  grid: Array<Array<Tile | null>>;
  gridSize: number;
  currentScore: number;
  moveCount: number;
}

interface TileSpawnerOutput {
  spawnPosition: { row: number; col: number } | null;
  spawnValue: number;
}

export const random2Or4: SlotImplementation<TileSpawnerInput, TileSpawnerOutput> = {
  id: 'random_2_or_4',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'tileSpawner' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { grid, gridSize } = input;

    const emptyPositions: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (!grid[row]?.[col]) {
          emptyPositions.push({ row, col });
        }
      }
    }

    if (emptyPositions.length === 0) {
      return { spawnPosition: null, spawnValue: 0 };
    }

    const randomIndex = Math.floor(Math.random() * emptyPositions.length);
    const spawnPosition = emptyPositions[randomIndex];
    const spawnValue = Math.random() < 0.9 ? 2 : 4;

    return { spawnPosition, spawnValue };
  },
};

export const always2: SlotImplementation<TileSpawnerInput, TileSpawnerOutput> = {
  id: 'always_2',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'tileSpawner' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { grid, gridSize } = input;

    const emptyPositions: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (!grid[row]?.[col]) {
          emptyPositions.push({ row, col });
        }
      }
    }

    if (emptyPositions.length === 0) {
      return { spawnPosition: null, spawnValue: 0 };
    }

    const randomIndex = Math.floor(Math.random() * emptyPositions.length);
    const spawnPosition = emptyPositions[randomIndex];

    return { spawnPosition, spawnValue: 2 };
  },
};

export const weightedSpawn: SlotImplementation<TileSpawnerInput, TileSpawnerOutput> = {
  id: 'weighted_spawn',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'tileSpawner' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { grid, gridSize, currentScore } = input;

    const emptyPositions: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (!grid[row]?.[col]) {
          emptyPositions.push({ row, col });
        }
      }
    }

    if (emptyPositions.length === 0) {
      return { spawnPosition: null, spawnValue: 0 };
    }

    const randomIndex = Math.floor(Math.random() * emptyPositions.length);
    const spawnPosition = emptyPositions[randomIndex];

    let spawnValue = 2;
    const roll = Math.random();

    if (currentScore >= 10000) {
      if (roll < 0.05) spawnValue = 8;
      else if (roll < 0.2) spawnValue = 4;
    } else if (currentScore >= 5000) {
      if (roll < 0.15) spawnValue = 4;
    } else if (currentScore >= 2000) {
      if (roll < 0.1) spawnValue = 4;
    }

    return { spawnPosition, spawnValue };
  },
};

interface ScoringInput {
  mergedValue: number;
  comboCount: number;
  moveCount: number;
}

interface ScoringOutput {
  points: number;
}

export const mergeValueScoring: SlotImplementation<ScoringInput, ScoringOutput> = {
  id: 'merge_value_scoring',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'scoring' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    return { points: input.mergedValue };
  },
};

export const exponentialScoring: SlotImplementation<ScoringInput, ScoringOutput> = {
  id: 'exponential_scoring',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'scoring' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { mergedValue, comboCount } = input;

    const power = Math.log2(mergedValue);
    const basePoints = Math.pow(2, power);
    const comboMultiplier = 1 + (comboCount * 0.5);

    return { points: Math.floor(basePoints * comboMultiplier) };
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

export function registerSlideSlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, fourDirectionSlide as SlotImplementation);
  registerIfNotExists(registry, eightDirectionSlide as SlotImplementation);
  registerIfNotExists(registry, standard2048Merge as SlotImplementation);
  registerIfNotExists(registry, threesMerge as SlotImplementation);
  registerIfNotExists(registry, random2Or4 as SlotImplementation);
  registerIfNotExists(registry, always2 as SlotImplementation);
  registerIfNotExists(registry, weightedSpawn as SlotImplementation);
  registerIfNotExists(registry, mergeValueScoring as SlotImplementation);
  registerIfNotExists(registry, exponentialScoring as SlotImplementation);
}
