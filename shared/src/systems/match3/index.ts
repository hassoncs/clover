import type { GameSystemDefinition } from '../types';
import type { Match3Definition, Match3State, Match3Cell, Match3Match, Match3Phase } from './types';

export const MATCH3_SYSTEM_ID = 'match3';
export const MATCH3_VERSION = { major: 1, minor: 0, patch: 0 };

function createEmptyBoard(rows: number, cols: number): Match3Cell[][] {
  const board: Match3Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    board[r] = [];
    for (let c = 0; c < cols; c++) {
      board[r][c] = { entityId: null, pieceTypeId: null, row: r, col: c };
    }
  }
  return board;
}

export function createMatch3State(def: Match3Definition): Match3State {
  return {
    phase: 'idle',
    board: createEmptyBoard(def.rows, def.cols),
    selectedCell: null,
    swapA: null,
    swapB: null,
    pendingClears: [],
    cascadeCount: 0,
    animationTimer: 0,
    locked: false,
  };
}

export function cellToWorld(def: Match3Definition, row: number, col: number): { x: number; y: number } {
  return {
    x: def.origin.x + col * def.cellSize.x + def.cellSize.x / 2,
    y: def.origin.y + row * def.cellSize.y + def.cellSize.y / 2,
  };
}

export function worldToCell(def: Match3Definition, x: number, y: number): { row: number; col: number } | null {
  const col = Math.floor((x - def.origin.x) / def.cellSize.x);
  const row = Math.floor((y - def.origin.y) / def.cellSize.y);
  if (row < 0 || row >= def.rows || col < 0 || col >= def.cols) {
    return null;
  }
  return { row, col };
}

export function isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function findMatches(state: Match3State, minMatch: number = 3): Match3Match[] {
  const matches: Match3Match[] = [];
  const rows = state.board.length;
  const cols = state.board[0]?.length ?? 0;

  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    let runType = state.board[r][0]?.pieceTypeId;
    
    for (let c = 1; c <= cols; c++) {
      const currentType = c < cols ? state.board[r][c]?.pieceTypeId : null;
      
      if (currentType !== runType || c === cols) {
        if (runType && c - runStart >= minMatch) {
          const cells: Array<{ row: number; col: number }> = [];
          for (let i = runStart; i < c; i++) {
            cells.push({ row: r, col: i });
          }
          matches.push({
            cells,
            pieceTypeId: runType,
            isHorizontal: true,
            length: c - runStart,
          });
        }
        runStart = c;
        runType = currentType;
      }
    }
  }

  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    let runType = state.board[0]?.[c]?.pieceTypeId;
    
    for (let r = 1; r <= rows; r++) {
      const currentType = r < rows ? state.board[r]?.[c]?.pieceTypeId : null;
      
      if (currentType !== runType || r === rows) {
        if (runType && r - runStart >= minMatch) {
          const cells: Array<{ row: number; col: number }> = [];
          for (let i = runStart; i < r; i++) {
            cells.push({ row: i, col: c });
          }
          matches.push({
            cells,
            pieceTypeId: runType,
            isHorizontal: false,
            length: r - runStart,
          });
        }
        runStart = r;
        runType = currentType;
      }
    }
  }

  return matches;
}

export function getUniqueCellsFromMatches(matches: Match3Match[]): Array<{ row: number; col: number }> {
  const seen = new Set<string>();
  const result: Array<{ row: number; col: number }> = [];
  
  for (const match of matches) {
    for (const cell of match.cells) {
      const key = `${cell.row},${cell.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cell);
      }
    }
  }
  
  return result;
}

export function applyGravity(state: Match3State): Array<{ from: { row: number; col: number }; to: { row: number; col: number } }> {
  const moves: Array<{ from: { row: number; col: number }; to: { row: number; col: number } }> = [];
  const rows = state.board.length;
  const cols = state.board[0]?.length ?? 0;

  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    
    for (let r = rows - 1; r >= 0; r--) {
      const cell = state.board[r][c];
      if (cell.pieceTypeId !== null) {
        if (r !== writeRow) {
          moves.push({ from: { row: r, col: c }, to: { row: writeRow, col: c } });
          state.board[writeRow][c] = { ...cell, row: writeRow };
          state.board[r][c] = { entityId: null, pieceTypeId: null, row: r, col: c };
        }
        writeRow--;
      }
    }
  }

  return moves;
}

export function getEmptyCellsAtTop(state: Match3State): Array<{ row: number; col: number }> {
  const emptyCells: Array<{ row: number; col: number }> = [];
  const cols = state.board[0]?.length ?? 0;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < state.board.length; r++) {
      if (state.board[r][c].pieceTypeId === null) {
        emptyCells.push({ row: r, col: c });
      } else {
        break;
      }
    }
  }

  return emptyCells;
}

export function hasValidMoves(state: Match3State, minMatch: number = 3): boolean {
  const rows = state.board.length;
  const cols = state.board[0]?.length ?? 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < cols - 1) {
        swapCells(state, r, c, r, c + 1);
        const matches = findMatches(state, minMatch);
        swapCells(state, r, c, r, c + 1);
        if (matches.length > 0) return true;
      }
      if (r < rows - 1) {
        swapCells(state, r, c, r + 1, c);
        const matches = findMatches(state, minMatch);
        swapCells(state, r, c, r + 1, c);
        if (matches.length > 0) return true;
      }
    }
  }

  return false;
}

export function swapCells(state: Match3State, r1: number, c1: number, r2: number, c2: number): void {
  const temp = state.board[r1][c1];
  state.board[r1][c1] = { ...state.board[r2][c2], row: r1, col: c1 };
  state.board[r2][c2] = { ...temp, row: r2, col: c2 };
}

export function selectRandomPieceType(pieceTypes: Array<{ id: string; weight?: number }>): string {
  const totalWeight = pieceTypes.reduce((sum, pt) => sum + (pt.weight ?? 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const pt of pieceTypes) {
    random -= pt.weight ?? 1;
    if (random <= 0) {
      return pt.id;
    }
  }
  
  return pieceTypes[pieceTypes.length - 1].id;
}

export const match3System: GameSystemDefinition<Record<string, Match3Definition>, Record<string, Match3State>> = {
  id: MATCH3_SYSTEM_ID,
  version: MATCH3_VERSION,
  actionTypes: ['match3_swap', 'match3_select', 'match3_init'],
  behaviorTypes: [],
  expressionFunctions: {
    match3Phase: (args, ctx) => {
      if (args.length < 1) throw new Error('match3Phase(boardId) requires 1 argument');
      const boardId = String(args[0]);
      const states = (ctx.variables['__match3States'] as unknown as Record<string, Match3State>) ?? {};
      return states[boardId]?.phase ?? 'idle';
    },
    
    match3CascadeCount: (args, ctx) => {
      if (args.length < 1) throw new Error('match3CascadeCount(boardId) requires 1 argument');
      const boardId = String(args[0]);
      const states = (ctx.variables['__match3States'] as unknown as Record<string, Match3State>) ?? {};
      return states[boardId]?.cascadeCount ?? 0;
    },
    
    match3IsLocked: (args, ctx) => {
      if (args.length < 1) throw new Error('match3IsLocked(boardId) requires 1 argument');
      const boardId = String(args[0]);
      const states = (ctx.variables['__match3States'] as unknown as Record<string, Match3State>) ?? {};
      const state = states[boardId];
      return state ? state.phase !== 'idle' : false;
    },
    
    match3SelectedCell: (args, ctx) => {
      if (args.length < 1) throw new Error('match3SelectedCell(boardId) requires 1 argument');
      const boardId = String(args[0]);
      const states = (ctx.variables['__match3States'] as unknown as Record<string, Match3State>) ?? {};
      const state = states[boardId];
      if (!state?.selectedCell) return '';
      return `${state.selectedCell.row},${state.selectedCell.col}`;
    },

    match3PieceAt: (args, ctx) => {
      if (args.length < 3) throw new Error('match3PieceAt(boardId, row, col) requires 3 arguments');
      const boardId = String(args[0]);
      const row = Number(args[1]);
      const col = Number(args[2]);
      const states = (ctx.variables['__match3States'] as unknown as Record<string, Match3State>) ?? {};
      const state = states[boardId];
      if (!state) return '';
      return state.board[row]?.[col]?.pieceTypeId ?? '';
    },
  },
};

export * from './types';
