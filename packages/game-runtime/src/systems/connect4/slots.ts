import type {
  SlotContract,
  SlotImplementation,
} from '@slopcade/shared';
import { getGlobalSlotRegistry, findLineMatches } from '@slopcade/shared';

const SYSTEM_ID = 'connect4';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

type Player = 1 | 2;
type Cell = 0 | Player;
type Board = Cell[][];

interface WinResult {
  winner: Player | null;
  winningCells: Array<{ row: number; col: number }> | null;
  isDraw: boolean;
}

export const CONNECT4_SLOT_CONTRACTS: Record<string, SlotContract> = {
  dropRule: {
    name: 'dropRule',
    kind: 'pure',
    description: 'Gravity-based column drop logic',
  },
  winDetection: {
    name: 'winDetection',
    kind: 'pure',
    description: 'Detect 4-in-a-row (horizontal, vertical, diagonal)',
  },
  turnManager: {
    name: 'turnManager',
    kind: 'policy',
    description: 'Player alternation logic',
  },
  aiOpponent: {
    name: 'aiOpponent',
    kind: 'policy',
    description: 'Computer opponent difficulty levels',
  },
};

interface DropRuleInput {
  board: Board;
  column: number;
  rows: number;
  cols: number;
}

interface DropRuleOutput {
  row: number | null;
  isValid: boolean;
}

export const standardDrop: SlotImplementation<DropRuleInput, DropRuleOutput> = {
  id: 'standard_drop',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'dropRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board, column, rows, cols } = input;

    if (column < 0 || column >= cols) {
      return { row: null, isValid: false };
    }

    for (let row = rows - 1; row >= 0; row--) {
      if (board[row][column] === 0) {
        return { row, isValid: true };
      }
    }

    return { row: null, isValid: false };
  },
};

export const instantDrop: SlotImplementation<DropRuleInput, DropRuleOutput> = {
  id: 'instant_drop',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'dropRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board, column, rows, cols } = input;

    if (column < 0 || column >= cols) {
      return { row: null, isValid: false };
    }

    for (let row = rows - 1; row >= 0; row--) {
      if (board[row][column] === 0) {
        return { row, isValid: true };
      }
    }

    return { row: null, isValid: false };
  },
};

interface WinDetectionInput {
  board: Board;
  rows: number;
  cols: number;
  winLength: number;
}

type WinDetectionOutput = WinResult;

export const fourInRowDetection: SlotImplementation<WinDetectionInput, WinDetectionOutput> = {
  id: 'four_in_row_detection',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'winDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board, rows, cols, winLength } = input;

    const directions = [
      { dRow: 0, dCol: 1 },
      { dRow: 1, dCol: 0 },
      { dRow: 1, dCol: 1 },
      { dRow: 1, dCol: -1 },
    ];

    const matches = findLineMatches(board, winLength, (cell) => cell !== 0, directions);

    if (matches.length > 0) {
      const firstMatch = matches[0];
      const winner = board[firstMatch.cells[0].row][firstMatch.cells[0].col] as Player;
      return {
        winner,
        winningCells: firstMatch.cells,
        isDraw: false,
      };
    }

    let isFull = true;
    for (let col = 0; col < cols; col++) {
      if (board[0][col] === 0) {
        isFull = false;
        break;
      }
    }

    return {
      winner: null,
      winningCells: null,
      isDraw: isFull,
    };
  },
};

export const fiveInRowDetection: SlotImplementation<WinDetectionInput, WinDetectionOutput> = {
  id: 'five_in_row_detection',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'winDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board, rows, cols } = input;
    const winLength = 5;

    const directions = [
      { dRow: 0, dCol: 1 },
      { dRow: 1, dCol: 0 },
      { dRow: 1, dCol: 1 },
      { dRow: 1, dCol: -1 },
    ];

    const matches = findLineMatches(board, winLength, (cell) => cell !== 0, directions);

    if (matches.length > 0) {
      const firstMatch = matches[0];
      const winner = board[firstMatch.cells[0].row][firstMatch.cells[0].col] as Player;
      return {
        winner,
        winningCells: firstMatch.cells,
        isDraw: false,
      };
    }

    let isFull = true;
    for (let col = 0; col < cols; col++) {
      if (board[0][col] === 0) {
        isFull = false;
        break;
      }
    }

    return {
      winner: null,
      winningCells: null,
      isDraw: isFull,
    };
  },
};

interface TurnManagerInput {
  currentPlayer: Player;
  moveCount: number;
  timeRemaining?: number;
}

interface TurnManagerOutput {
  nextPlayer: Player;
  isValidTurn: boolean;
}

export const alternatingTurns: SlotImplementation<TurnManagerInput, TurnManagerOutput> = {
  id: 'alternating_turns',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'turnManager' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { currentPlayer } = input;
    return {
      nextPlayer: currentPlayer === 1 ? 2 : 1,
      isValidTurn: true,
    };
  },
};

export const timedTurns: SlotImplementation<TurnManagerInput, TurnManagerOutput> = {
  id: 'timed_turns',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'turnManager' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { currentPlayer, timeRemaining } = input;

    if (timeRemaining !== undefined && timeRemaining <= 0) {
      return {
        nextPlayer: currentPlayer === 1 ? 2 : 1,
        isValidTurn: false,
      };
    }

    return {
      nextPlayer: currentPlayer === 1 ? 2 : 1,
      isValidTurn: true,
    };
  },
};

interface AIOpponentInput {
  board: Board;
  rows: number;
  cols: number;
  aiPlayer: Player;
  winLength: number;
}

interface AIOpponentOutput {
  column: number;
}

function getValidColumns(board: Board, cols: number): number[] {
  const valid: number[] = [];
  for (let col = 0; col < cols; col++) {
    if (board[0][col] === 0) {
      valid.push(col);
    }
  }
  return valid;
}

function simulateDrop(board: Board, column: number, player: Player, rows: number): Board {
  const newBoard = board.map(row => [...row]) as Board;
  for (let row = rows - 1; row >= 0; row--) {
    if (newBoard[row][column] === 0) {
      newBoard[row][column] = player;
      break;
    }
  }
  return newBoard;
}

function checkWinForPlayer(board: Board, player: Player, rows: number, cols: number, winLength: number): boolean {
  const directions = [
    { dRow: 0, dCol: 1 },
    { dRow: 1, dCol: 0 },
    { dRow: 1, dCol: 1 },
    { dRow: 1, dCol: -1 },
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col] !== player) continue;

      for (const { dRow, dCol } of directions) {
        let count = 1;
        for (let i = 1; i < winLength; i++) {
          const r = row + dRow * i;
          const c = col + dCol * i;
          if (r < 0 || r >= rows || c < 0 || c >= cols) break;
          if (board[r][c] !== player) break;
          count++;
        }
        if (count >= winLength) return true;
      }
    }
  }
  return false;
}

export const randomAI: SlotImplementation<AIOpponentInput, AIOpponentOutput> = {
  id: 'random_ai',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'aiOpponent' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board, cols } = input;
    const validColumns = getValidColumns(board, cols);

    if (validColumns.length === 0) {
      return { column: 0 };
    }

    const randomIndex = Math.floor(Math.random() * validColumns.length);
    return { column: validColumns[randomIndex] };
  },
};

export const smartAI: SlotImplementation<AIOpponentInput, AIOpponentOutput> = {
  id: 'smart_ai',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'aiOpponent' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board, rows, cols, aiPlayer, winLength } = input;
    const validColumns = getValidColumns(board, cols);

    if (validColumns.length === 0) {
      return { column: 0 };
    }

    const opponent: Player = aiPlayer === 1 ? 2 : 1;

    for (const col of validColumns) {
      const testBoard = simulateDrop(board, col, aiPlayer, rows);
      if (checkWinForPlayer(testBoard, aiPlayer, rows, cols, winLength)) {
        return { column: col };
      }
    }

    for (const col of validColumns) {
      const testBoard = simulateDrop(board, col, opponent, rows);
      if (checkWinForPlayer(testBoard, opponent, rows, cols, winLength)) {
        return { column: col };
      }
    }

    const centerCol = Math.floor(cols / 2);
    if (validColumns.includes(centerCol)) {
      return { column: centerCol };
    }

    const randomIndex = Math.floor(Math.random() * validColumns.length);
    return { column: validColumns[randomIndex] };
  },
};

function evaluateBoard(board: Board, player: Player, rows: number, cols: number, winLength: number): number {
  const opponent: Player = player === 1 ? 2 : 1;

  if (checkWinForPlayer(board, player, rows, cols, winLength)) return 1000;
  if (checkWinForPlayer(board, opponent, rows, cols, winLength)) return -1000;

  let score = 0;
  const centerCol = Math.floor(cols / 2);
  for (let row = 0; row < rows; row++) {
    if (board[row][centerCol] === player) score += 3;
    if (board[row][centerCol] === opponent) score -= 3;
  }

  return score;
}

function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  player: Player,
  rows: number,
  cols: number,
  winLength: number,
  alpha: number,
  beta: number
): number {
  const opponent: Player = player === 1 ? 2 : 1;

  if (checkWinForPlayer(board, player, rows, cols, winLength)) return 1000 - depth;
  if (checkWinForPlayer(board, opponent, rows, cols, winLength)) return -1000 + depth;

  const validColumns = getValidColumns(board, cols);
  if (validColumns.length === 0 || depth === 0) {
    return evaluateBoard(board, player, rows, cols, winLength);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const col of validColumns) {
      const newBoard = simulateDrop(board, col, player, rows);
      const evalScore = minimax(newBoard, depth - 1, false, player, rows, cols, winLength, alpha, beta);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const col of validColumns) {
      const newBoard = simulateDrop(board, col, opponent, rows);
      const evalScore = minimax(newBoard, depth - 1, true, player, rows, cols, winLength, alpha, beta);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export const minimaxAI: SlotImplementation<AIOpponentInput, AIOpponentOutput> = {
  id: 'minimax_ai',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'aiOpponent' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { board, rows, cols, aiPlayer, winLength } = input;
    const validColumns = getValidColumns(board, cols);

    if (validColumns.length === 0) {
      return { column: 0 };
    }

    const depth = 4;
    let bestColumn = validColumns[0];
    let bestScore = -Infinity;

    for (const col of validColumns) {
      const newBoard = simulateDrop(board, col, aiPlayer, rows);
      const score = minimax(newBoard, depth - 1, false, aiPlayer, rows, cols, winLength, -Infinity, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestColumn = col;
      }
    }

    return { column: bestColumn };
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

export function registerConnect4SlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, standardDrop as SlotImplementation);
  registerIfNotExists(registry, instantDrop as SlotImplementation);
  registerIfNotExists(registry, fourInRowDetection as SlotImplementation);
  registerIfNotExists(registry, fiveInRowDetection as SlotImplementation);
  registerIfNotExists(registry, alternatingTurns as SlotImplementation);
  registerIfNotExists(registry, timedTurns as SlotImplementation);
  registerIfNotExists(registry, randomAI as SlotImplementation);
  registerIfNotExists(registry, smartAI as SlotImplementation);
  registerIfNotExists(registry, minimaxAI as SlotImplementation);
}
