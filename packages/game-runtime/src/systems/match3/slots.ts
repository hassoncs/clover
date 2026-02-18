import type {
  SlotContract,
  SlotImplementation,
} from '@slopcade/shared';
import { getGlobalSlotRegistry } from '@slopcade/shared';

const SYSTEM_ID = 'match3';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

interface BoardCell {
  entityId: string | null;
  pieceType: number;
  row: number;
  col: number;
}

type Board = BoardCell[][];

interface Match {
  cells: Array<{ row: number; col: number }>;
  pieceType: number;
}

export const MATCH3_SLOT_CONTRACTS: Record<string, SlotContract> = {
  matchDetection: {
    name: 'matchDetection',
    kind: 'pure',
    description: 'Detects matches on the board and returns matched cell groups',
  },
  swapRule: {
    name: 'swapRule',
    kind: 'policy',
    description: 'Validates whether a swap between two cells is allowed',
  },
  scoring: {
    name: 'scoring',
    kind: 'pure',
    description: 'Calculates score for a match based on size and cascade level',
  },
  pieceSpawner: {
    name: 'pieceSpawner',
    kind: 'pure',
    description: 'Determines which piece type to spawn at a given position',
  },
  feedback: {
    name: 'feedback',
    kind: 'hook',
    description: 'Provides visual/audio feedback for game events via tags and behaviors',
  },
};

interface MatchDetectionInput {
  board: Board;
  rows: number;
  cols: number;
  minMatch: number;
}

type MatchDetectionOutput = Match[];

function findHorizontalAndVerticalMatches(
  board: Board,
  rows: number,
  cols: number,
  minMatch: number
): Match[] {
  const matches: Match[] = [];

  for (let row = 0; row < rows; row++) {
    let runStart = 0;
    let runType = board[row][0]?.pieceType ?? -1;

    for (let col = 1; col <= cols; col++) {
      const currentType = col < cols ? board[row][col]?.pieceType ?? -1 : -1;

      if (currentType !== runType || col === cols) {
        if (runType >= 0 && col - runStart >= minMatch) {
          const cells: Array<{ row: number; col: number }> = [];
          for (let c = runStart; c < col; c++) {
            cells.push({ row, col: c });
          }
          matches.push({ cells, pieceType: runType });
        }
        runStart = col;
        runType = currentType;
      }
    }
  }

  for (let col = 0; col < cols; col++) {
    let runStart = 0;
    let runType = board[0]?.[col]?.pieceType ?? -1;

    for (let row = 1; row <= rows; row++) {
      const currentType = row < rows ? board[row]?.[col]?.pieceType ?? -1 : -1;

      if (currentType !== runType || row === rows) {
        if (runType >= 0 && row - runStart >= minMatch) {
          const cells: Array<{ row: number; col: number }> = [];
          for (let r = runStart; r < row; r++) {
            cells.push({ row: r, col });
          }
          matches.push({ cells, pieceType: runType });
        }
        runStart = row;
        runType = currentType;
      }
    }
  }

  return matches;
}

export const standardMatchDetection: SlotImplementation<
  MatchDetectionInput,
  MatchDetectionOutput
> = {
  id: 'standard_3_match',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'matchDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    return findHorizontalAndVerticalMatches(
      input.board,
      input.rows,
      input.cols,
      input.minMatch
    );
  },
};

export const diagonalMatchDetection: SlotImplementation<
  MatchDetectionInput,
  MatchDetectionOutput
> = {
  id: 'diagonal_match',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'matchDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const matches = findHorizontalAndVerticalMatches(
      input.board,
      input.rows,
      input.cols,
      input.minMatch
    );

    const { board, rows, cols, minMatch } = input;

    for (let row = 0; row <= rows - minMatch; row++) {
      for (let col = 0; col <= cols - minMatch; col++) {
        const pieceType = board[row]?.[col]?.pieceType ?? -1;
        if (pieceType < 0) continue;

        let count = 1;
        for (let d = 1; d < Math.min(rows - row, cols - col); d++) {
          if (board[row + d]?.[col + d]?.pieceType === pieceType) {
            count++;
          } else {
            break;
          }
        }

        if (count >= minMatch) {
          const cells: Array<{ row: number; col: number }> = [];
          for (let d = 0; d < count; d++) {
            cells.push({ row: row + d, col: col + d });
          }
          matches.push({ cells, pieceType });
        }
      }
    }

    for (let row = 0; row <= rows - minMatch; row++) {
      for (let col = minMatch - 1; col < cols; col++) {
        const pieceType = board[row]?.[col]?.pieceType ?? -1;
        if (pieceType < 0) continue;

        let count = 1;
        for (let d = 1; d < Math.min(rows - row, col + 1); d++) {
          if (board[row + d]?.[col - d]?.pieceType === pieceType) {
            count++;
          } else {
            break;
          }
        }

        if (count >= minMatch) {
          const cells: Array<{ row: number; col: number }> = [];
          for (let d = 0; d < count; d++) {
            cells.push({ row: row + d, col: col - d });
          }
          matches.push({ cells, pieceType });
        }
      }
    }

    return matches;
  },
};

interface SwapRuleInput {
  cellA: { row: number; col: number };
  cellB: { row: number; col: number };
  board: Board;
}

type SwapRuleOutput = boolean;

export const adjacentOnlySwapRule: SlotImplementation<
  SwapRuleInput,
  SwapRuleOutput
> = {
  id: 'adjacent_only',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'swapRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { cellA, cellB } = input;
    const rowDiff = Math.abs(cellA.row - cellB.row);
    const colDiff = Math.abs(cellA.col - cellB.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  },
};

interface ScoringInput {
  matchSize: number;
  cascadeLevel: number;
  pieceType?: number;
}

type ScoringOutput = number;

export const cascadeMultiplierScoring: SlotImplementation<
  ScoringInput,
  ScoringOutput
> = {
  id: 'cascade_multiplier',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'scoring' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    return input.matchSize * 10 * input.cascadeLevel;
  },
};

export const fixedScoreScoring: SlotImplementation<ScoringInput, ScoringOutput> = {
  id: 'fixed_score',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'scoring' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    return input.matchSize * 10;
  },
};

interface PieceSpawnerInput {
  row: number;
  col: number;
  pieceTypeCount: number;
  board: Board;
}

type PieceSpawnerOutput = number;

export const randomUniformPieceSpawner: SlotImplementation<
  PieceSpawnerInput,
  PieceSpawnerOutput
> = {
  id: 'random_uniform',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'pieceSpawner' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    return Math.floor(Math.random() * input.pieceTypeCount);
  },
};

interface FeedbackInput {
  event: 'match_found' | 'cascade_complete' | 'no_moves' | 'swap_invalid';
  entityIds?: string[];
  data?: Record<string, unknown>;
}

interface FeedbackOutput {
  tagsToAdd?: Array<{ entityId: string; tag: string }>;
  tagsToRemove?: Array<{ entityId: string; tag: string }>;
}

export const tagsAndConditionalBehaviorsFeedback: SlotImplementation<
  FeedbackInput,
  FeedbackOutput
> = {
  id: 'tags_and_conditional_behaviors',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'feedback' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const result: FeedbackOutput = {};

    switch (input.event) {
      case 'match_found':
        if (input.entityIds) {
          result.tagsToAdd = input.entityIds.map((entityId) => ({
            entityId,
            tag: 'sys.match3:matched',
          }));
        }
        break;
      case 'swap_invalid':
        if (input.entityIds) {
          result.tagsToAdd = input.entityIds.map((entityId) => ({
            entityId,
            tag: 'sys.match3:invalid_swap',
          }));
        }
        break;
    }

    return result;
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

export function registerMatch3SlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, standardMatchDetection as SlotImplementation);
  registerIfNotExists(registry, diagonalMatchDetection as SlotImplementation);
  registerIfNotExists(registry, adjacentOnlySwapRule as SlotImplementation);
  registerIfNotExists(registry, cascadeMultiplierScoring as SlotImplementation);
  registerIfNotExists(registry, fixedScoreScoring as SlotImplementation);
  registerIfNotExists(registry, randomUniformPieceSpawner as SlotImplementation);
  registerIfNotExists(registry, tagsAndConditionalBehaviorsFeedback as SlotImplementation);
}
