import type {
  SlotContract,
  SlotImplementation,
} from '@slopcade/shared';
import { getGlobalSlotRegistry } from '@slopcade/shared';

const SYSTEM_ID = 'tetris';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface PieceState {
  type: TetrominoType;
  rotation: number;
  x: number;
  y: number;
}

interface BoardState {
  grid: (TetrominoType | null)[][];
  rows: number;
  cols: number;
}

export const TETRIS_SLOT_CONTRACTS: Record<string, SlotContract> = {
  rotationRule: {
    name: 'rotationRule',
    kind: 'policy',
    description: 'Determines how pieces rotate, including wall kick behavior',
  },
  lineClearing: {
    name: 'lineClearing',
    kind: 'pure',
    description: 'Detects and returns indices of completed lines to clear',
  },
  pieceSpawner: {
    name: 'pieceSpawner',
    kind: 'pure',
    description: 'Determines which piece type to spawn next',
  },
  dropSpeed: {
    name: 'dropSpeed',
    kind: 'pure',
    description: 'Calculates drop speed based on level and score',
  },
};

interface RotationRuleInput {
  piece: PieceState;
  board: BoardState;
  direction: 'clockwise' | 'counterclockwise';
}

interface RotationRuleOutput {
  success: boolean;
  newRotation: number;
  newX: number;
  newY: number;
}

const TETROMINO_SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
};

const WALL_KICK_OFFSETS: Record<string, Array<{ x: number; y: number }>> = {
  '0>1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '1>0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '1>2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '2>1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '2>3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '3>2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '3>0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '0>3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
};

function getShape(type: TetrominoType, rotation: number): number[][] {
  return TETROMINO_SHAPES[type][rotation % 4];
}

function checkCollision(
  board: BoardState,
  type: TetrominoType,
  rotation: number,
  x: number,
  y: number
): boolean {
  const shape = getShape(type, rotation);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const boardX = x + col;
        const boardY = y + row;
        if (boardX < 0 || boardX >= board.cols || boardY >= board.rows) {
          return true;
        }
        if (boardY >= 0 && board.grid[boardY][boardX] !== null) {
          return true;
        }
      }
    }
  }
  return false;
}

export const standardRotation: SlotImplementation<
  RotationRuleInput,
  RotationRuleOutput
> = {
  id: 'standard_rotation',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'rotationRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { piece, board, direction } = input;
    const oldRotation = piece.rotation;
    const newRotation = direction === 'clockwise'
      ? (oldRotation + 1) % 4
      : (oldRotation + 3) % 4;

    const kickKey = `${oldRotation}>${newRotation}`;
    const offsets = WALL_KICK_OFFSETS[kickKey] || [{ x: 0, y: 0 }];

    for (const offset of offsets) {
      const newX = piece.x + offset.x;
      const newY = piece.y + offset.y;
      if (!checkCollision(board, piece.type, newRotation, newX, newY)) {
        return { success: true, newRotation, newX, newY };
      }
    }

    return { success: false, newRotation: oldRotation, newX: piece.x, newY: piece.y };
  },
};

export const noWallKickRotation: SlotImplementation<
  RotationRuleInput,
  RotationRuleOutput
> = {
  id: 'no_wall_kick_rotation',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'rotationRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { piece, board, direction } = input;
    const newRotation = direction === 'clockwise'
      ? (piece.rotation + 1) % 4
      : (piece.rotation + 3) % 4;

    if (!checkCollision(board, piece.type, newRotation, piece.x, piece.y)) {
      return { success: true, newRotation, newX: piece.x, newY: piece.y };
    }

    return { success: false, newRotation: piece.rotation, newX: piece.x, newY: piece.y };
  },
};

interface LineClearingInput {
  board: BoardState;
}

interface LineClearingOutput {
  clearedLines: number[];
  linesCleared: number;
}

export const standardLineClearing: SlotImplementation<
  LineClearingInput,
  LineClearingOutput
> = {
  id: 'standard_line_clear',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'lineClearing' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board } = input;
    const clearedLines: number[] = [];

    for (let row = 0; row < board.rows; row++) {
      let isComplete = true;
      for (let col = 0; col < board.cols; col++) {
        if (board.grid[row][col] === null) {
          isComplete = false;
          break;
        }
      }
      if (isComplete) {
        clearedLines.push(row);
      }
    }

    return { clearedLines, linesCleared: clearedLines.length };
  },
};

interface PieceSpawnerInput {
  history: TetrominoType[];
  bag: TetrominoType[];
}

interface PieceSpawnerOutput {
  nextPiece: TetrominoType;
  updatedBag: TetrominoType[];
}

const ALL_TETROMINOS: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const random7BagSpawner: SlotImplementation<
  PieceSpawnerInput,
  PieceSpawnerOutput
> = {
  id: 'random_7_bag',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'pieceSpawner' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    let bag = [...input.bag];

    if (bag.length === 0) {
      bag = shuffleArray(ALL_TETROMINOS);
    }

    const nextPiece = bag.shift()!;
    return { nextPiece, updatedBag: bag };
  },
};

export const pureRandomSpawner: SlotImplementation<
  PieceSpawnerInput,
  PieceSpawnerOutput
> = {
  id: 'pure_random',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'pieceSpawner' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const nextPiece = ALL_TETROMINOS[Math.floor(Math.random() * ALL_TETROMINOS.length)];
    return { nextPiece, updatedBag: input.bag };
  },
};

interface DropSpeedInput {
  level: number;
  score: number;
  linesCleared: number;
}

interface DropSpeedOutput {
  framesPerDrop: number;
  cellsPerSecond: number;
}

export const levelBasedDropSpeed: SlotImplementation<
  DropSpeedInput,
  DropSpeedOutput
> = {
  id: 'level_based_speed',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'dropSpeed' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { level } = input;
    const baseFrames = 48;
    const minFrames = 1;
    const framesPerDrop = Math.max(minFrames, baseFrames - (level - 1) * 5);
    const cellsPerSecond = 60 / framesPerDrop;
    return { framesPerDrop, cellsPerSecond };
  },
};

export const fixedDropSpeed: SlotImplementation<
  DropSpeedInput,
  DropSpeedOutput
> = {
  id: 'fixed_speed',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'dropSpeed' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: () => {
    return { framesPerDrop: 30, cellsPerSecond: 2 };
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

export function registerTetrisSlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, standardRotation as SlotImplementation);
  registerIfNotExists(registry, noWallKickRotation as SlotImplementation);
  registerIfNotExists(registry, standardLineClearing as SlotImplementation);
  registerIfNotExists(registry, random7BagSpawner as SlotImplementation);
  registerIfNotExists(registry, pureRandomSpawner as SlotImplementation);
  registerIfNotExists(registry, levelBasedDropSpeed as SlotImplementation);
  registerIfNotExists(registry, fixedDropSpeed as SlotImplementation);
}
