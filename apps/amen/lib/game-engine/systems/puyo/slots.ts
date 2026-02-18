import type {
  SlotContract,
  SlotImplementation,
} from '@slopcade/shared';
import { getGlobalSlotRegistry, floodFill } from '@slopcade/shared';

const SYSTEM_ID = 'puyo';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

type PuyoColor = 0 | 1 | 2 | 3 | 4;

interface PuyoPair {
  pivot: { row: number; col: number; color: PuyoColor };
  satellite: { row: number; col: number; color: PuyoColor };
  rotation: 0 | 1 | 2 | 3;
}

interface BoardCell {
  entityId: string | null;
  color: PuyoColor | null;
  isGarbage: boolean;
}

type Board = BoardCell[][];

interface PuyoMatch {
  cells: Array<{ row: number; col: number }>;
  color: PuyoColor;
}

export const PUYO_SLOT_CONTRACTS: Record<string, SlotContract> = {
  pairRotation: {
    name: 'pairRotation',
    kind: 'policy',
    description: 'How puyo pairs rotate (adapted from Tetris)',
  },
  dropSpeed: {
    name: 'dropSpeed',
    kind: 'pure',
    description: 'Falling speed based on level (reuse from Tetris)',
  },
  matchDetection: {
    name: 'matchDetection',
    kind: 'pure',
    description: 'Flood-fill for 4+ connected same-color (adapted from Match3)',
  },
  chainScoring: {
    name: 'chainScoring',
    kind: 'pure',
    description: 'Combo chain multiplier calculation',
  },
  garbageSystem: {
    name: 'garbageSystem',
    kind: 'policy',
    description: 'Attack opponent with garbage blocks (multiplayer)',
  },
};

interface PairRotationInput {
  pair: PuyoPair;
  board: Board;
  rows: number;
  cols: number;
  direction: 'clockwise' | 'counterclockwise';
}

interface PairRotationOutput {
  success: boolean;
  newRotation: 0 | 1 | 2 | 3;
  newPivot: { row: number; col: number };
  newSatellite: { row: number; col: number };
}

const ROTATION_OFFSETS: Record<0 | 1 | 2 | 3, { row: number; col: number }> = {
  0: { row: -1, col: 0 },
  1: { row: 0, col: 1 },
  2: { row: 1, col: 0 },
  3: { row: 0, col: -1 },
};

function isCellBlocked(board: Board, row: number, col: number, rows: number, cols: number): boolean {
  if (col < 0 || col >= cols || row >= rows) return true;
  if (row < 0) return false;
  return board[row]?.[col]?.color !== null;
}

export const standardPairRotation: SlotImplementation<
  PairRotationInput,
  PairRotationOutput
> = {
  id: 'standard_pair_rotation',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'pairRotation' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { pair, board, rows, cols, direction } = input;
    const oldRotation = pair.rotation;
    const newRotation = (direction === 'clockwise'
      ? (oldRotation + 1) % 4
      : (oldRotation + 3) % 4) as 0 | 1 | 2 | 3;

    const offset = ROTATION_OFFSETS[newRotation];
    const newSatelliteRow = pair.pivot.row + offset.row;
    const newSatelliteCol = pair.pivot.col + offset.col;

    if (!isCellBlocked(board, newSatelliteRow, newSatelliteCol, rows, cols)) {
      return {
        success: true,
        newRotation,
        newPivot: { row: pair.pivot.row, col: pair.pivot.col },
        newSatellite: { row: newSatelliteRow, col: newSatelliteCol },
      };
    }

    const kickOffsets = [
      { row: 0, col: direction === 'clockwise' ? -1 : 1 },
      { row: 0, col: direction === 'clockwise' ? 1 : -1 },
    ];

    for (const kick of kickOffsets) {
      const kickedPivotRow = pair.pivot.row + kick.row;
      const kickedPivotCol = pair.pivot.col + kick.col;
      const kickedSatelliteRow = kickedPivotRow + offset.row;
      const kickedSatelliteCol = kickedPivotCol + offset.col;

      if (
        !isCellBlocked(board, kickedPivotRow, kickedPivotCol, rows, cols) &&
        !isCellBlocked(board, kickedSatelliteRow, kickedSatelliteCol, rows, cols)
      ) {
        return {
          success: true,
          newRotation,
          newPivot: { row: kickedPivotRow, col: kickedPivotCol },
          newSatellite: { row: kickedSatelliteRow, col: kickedSatelliteCol },
        };
      }
    }

    return {
      success: false,
      newRotation: oldRotation,
      newPivot: { row: pair.pivot.row, col: pair.pivot.col },
      newSatellite: { row: pair.satellite.row, col: pair.satellite.col },
    };
  },
};

export const quickTurnRotation: SlotImplementation<
  PairRotationInput,
  PairRotationOutput
> = {
  id: 'quick_turn',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'pairRotation' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { pair, board, rows, cols } = input;
    const newRotation = ((pair.rotation + 2) % 4) as 0 | 1 | 2 | 3;

    const offset = ROTATION_OFFSETS[newRotation];
    const newSatelliteRow = pair.pivot.row + offset.row;
    const newSatelliteCol = pair.pivot.col + offset.col;

    if (!isCellBlocked(board, newSatelliteRow, newSatelliteCol, rows, cols)) {
      return {
        success: true,
        newRotation,
        newPivot: { row: pair.pivot.row, col: pair.pivot.col },
        newSatellite: { row: newSatelliteRow, col: newSatelliteCol },
      };
    }

    return {
      success: false,
      newRotation: pair.rotation,
      newPivot: { row: pair.pivot.row, col: pair.pivot.col },
      newSatellite: { row: pair.satellite.row, col: pair.satellite.col },
    };
  },
};

interface DropSpeedInput {
  level: number;
  score: number;
}

interface DropSpeedOutput {
  framesPerDrop: number;
  cellsPerSecond: number;
}

export const levelBasedDropSpeed: SlotImplementation<
  DropSpeedInput,
  DropSpeedOutput
> = {
  id: 'level_based_drop',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'dropSpeed' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { level } = input;
    const baseFrames = 48;
    const minFrames = 2;
    const framesPerDrop = Math.max(minFrames, baseFrames - (level - 1) * 4);
    const cellsPerSecond = 60 / framesPerDrop;
    return { framesPerDrop, cellsPerSecond };
  },
};

export const fixedDropSpeed: SlotImplementation<
  DropSpeedInput,
  DropSpeedOutput
> = {
  id: 'fixed_drop',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'dropSpeed' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: () => {
    return { framesPerDrop: 30, cellsPerSecond: 2 };
  },
};

interface MatchDetectionInput {
  board: Board;
  rows: number;
  cols: number;
  minMatch: number;
}

type MatchDetectionOutput = PuyoMatch[];

export const fourConnectedMatch: SlotImplementation<
  MatchDetectionInput,
  MatchDetectionOutput
> = {
  id: 'four_connected_match',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'matchDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board, minMatch } = input;
    const matches: PuyoMatch[] = [];
    const visited = new Set<string>();

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cell = board[row][col];
        const key = `${row},${col}`;
        if (cell.color === null || cell.isGarbage || visited.has(key)) continue;

        const connectedCells = floodFill(
          board,
          row,
          col,
          (c, start) => c.color === start.color && !c.isGarbage && !start.isGarbage
        );

        for (const pos of connectedCells) {
          visited.add(`${pos.row},${pos.col}`);
        }

        if (connectedCells.length >= minMatch) {
          matches.push({ cells: connectedCells, color: cell.color });
        }
      }
    }

    return matches;
  },
};

export const fiveConnectedMatch: SlotImplementation<
  MatchDetectionInput,
  MatchDetectionOutput
> = {
  id: 'five_connected_match',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'matchDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board } = input;
    const matches: PuyoMatch[] = [];
    const visited = new Set<string>();

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cell = board[row][col];
        const key = `${row},${col}`;
        if (cell.color === null || cell.isGarbage || visited.has(key)) continue;

        const connectedCells = floodFill(
          board,
          row,
          col,
          (c, start) => c.color === start.color && !c.isGarbage && !start.isGarbage
        );

        for (const pos of connectedCells) {
          visited.add(`${pos.row},${pos.col}`);
        }

        if (connectedCells.length >= 5) {
          matches.push({ cells: connectedCells, color: cell.color });
        }
      }
    }

    return matches;
  },
};

interface ChainScoringInput {
  chainCount: number;
  groupSizes: number[];
  colorsCleared: number;
}

interface ChainScoringOutput {
  score: number;
  chainPower: number;
  groupBonus: number;
  colorBonus: number;
}

const CHAIN_POWER_TABLE = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512];
const GROUP_BONUS_TABLE = [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10];
const COLOR_BONUS_TABLE = [0, 0, 3, 6, 12, 24];

export const standardChainScoring: SlotImplementation<
  ChainScoringInput,
  ChainScoringOutput
> = {
  id: 'standard_chain_scoring',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'chainScoring' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { chainCount, groupSizes, colorsCleared } = input;

    const puyosCleared = groupSizes.reduce((sum, size) => sum + size, 0);

    const chainPower = CHAIN_POWER_TABLE[Math.min(chainCount, CHAIN_POWER_TABLE.length - 1)];

    let groupBonus = 0;
    for (const size of groupSizes) {
      groupBonus += GROUP_BONUS_TABLE[Math.min(size, GROUP_BONUS_TABLE.length - 1)];
    }

    const colorBonus = COLOR_BONUS_TABLE[Math.min(colorsCleared, COLOR_BONUS_TABLE.length - 1)];

    let multiplier = chainPower + groupBonus + colorBonus;
    if (multiplier === 0) multiplier = 1;
    if (multiplier > 999) multiplier = 999;

    const score = puyosCleared * 10 * multiplier;

    return { score, chainPower, groupBonus, colorBonus };
  },
};

export const simpleChainScoring: SlotImplementation<
  ChainScoringInput,
  ChainScoringOutput
> = {
  id: 'simple_chain_scoring',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'chainScoring' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { chainCount, groupSizes } = input;
    const puyosCleared = groupSizes.reduce((sum, size) => sum + size, 0);
    const score = puyosCleared * 10 * chainCount;

    return { score, chainPower: chainCount, groupBonus: 0, colorBonus: 0 };
  },
};

interface GarbageSystemInput {
  chainPower: number;
  puyosCleared: number;
  targetMargin: number;
}

interface GarbageSystemOutput {
  garbageToSend: number;
  nuisancePoints: number;
}

export const standardGarbage: SlotImplementation<
  GarbageSystemInput,
  GarbageSystemOutput
> = {
  id: 'standard_garbage',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'garbageSystem' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { chainPower, puyosCleared, targetMargin } = input;

    const nuisancePoints = puyosCleared * chainPower;
    const garbageToSend = Math.floor(nuisancePoints / targetMargin);

    return { garbageToSend, nuisancePoints };
  },
};

export const noGarbage: SlotImplementation<
  GarbageSystemInput,
  GarbageSystemOutput
> = {
  id: 'no_garbage',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'garbageSystem' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: () => {
    return { garbageToSend: 0, nuisancePoints: 0 };
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

export function registerPuyoSlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, standardPairRotation as SlotImplementation);
  registerIfNotExists(registry, quickTurnRotation as SlotImplementation);
  registerIfNotExists(registry, levelBasedDropSpeed as SlotImplementation);
  registerIfNotExists(registry, fixedDropSpeed as SlotImplementation);
  registerIfNotExists(registry, fourConnectedMatch as SlotImplementation);
  registerIfNotExists(registry, fiveConnectedMatch as SlotImplementation);
  registerIfNotExists(registry, standardChainScoring as SlotImplementation);
  registerIfNotExists(registry, simpleChainScoring as SlotImplementation);
  registerIfNotExists(registry, standardGarbage as SlotImplementation);
  registerIfNotExists(registry, noGarbage as SlotImplementation);
}
