import type { GameSystemDefinition } from '../types';
import type { GridDefinition, GridState } from './types';
import { findConnectedGroups, findLineMatches, floodFill } from './match-utils';

export const GRID_SYSTEM_ID = 'grid';
export const GRID_VERSION = { major: 1, minor: 0, patch: 0 };

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function buildGridFromState(state: GridState, def: GridDefinition): (string | null)[][] {
  const grid: (string | null)[][] = [];
  for (let row = 0; row < def.rows; row++) {
    const rowArr: (string | null)[] = [];
    for (let col = 0; col < def.cols; col++) {
      rowArr.push(state.cells[cellKey(row, col)] ?? null);
    }
    grid.push(rowArr);
  }
  return grid;
}

export const gridSystem: GameSystemDefinition<Record<string, GridDefinition>, Record<string, GridState>> = {
  id: GRID_SYSTEM_ID,
  version: GRID_VERSION,
  actionTypes: ['grid_place', 'grid_move', 'grid_swap', 'grid_clear', 'grid_fill', 'grid_set_cell_data'],
  behaviorTypes: ['grid_snap', 'grid_gravity'],
  expressionFunctions: {
    gridRows: (args, ctx) => {
      if (args.length < 1) throw new Error('gridRows(gridId) requires 1 argument');
      const gridId = String(args[0]);
      const defs = (ctx.variables['__gridDefs'] as unknown as Record<string, GridDefinition>) ?? {};
      return defs[gridId]?.rows ?? 0;
    },
    
    gridCols: (args, ctx) => {
      if (args.length < 1) throw new Error('gridCols(gridId) requires 1 argument');
      const gridId = String(args[0]);
      const defs = (ctx.variables['__gridDefs'] as unknown as Record<string, GridDefinition>) ?? {};
      return defs[gridId]?.cols ?? 0;
    },
    
    gridCellAt: (args, ctx) => {
      if (args.length < 3) throw new Error('gridCellAt(gridId, row, col) requires 3 arguments');
      const gridId = String(args[0]);
      const row = Number(args[1]);
      const col = Number(args[2]);
      const states = (ctx.variables['__gridStates'] as unknown as Record<string, GridState>) ?? {};
      const state = states[gridId];
      if (!state) return '';
      return state.cells[cellKey(row, col)] ?? '';
    },
    
    gridIsOccupied: (args, ctx) => {
      if (args.length < 3) throw new Error('gridIsOccupied(gridId, row, col) requires 3 arguments');
      const gridId = String(args[0]);
      const row = Number(args[1]);
      const col = Number(args[2]);
      const states = (ctx.variables['__gridStates'] as unknown as Record<string, GridState>) ?? {};
      const state = states[gridId];
      if (!state) return false;
      return state.cells[cellKey(row, col)] !== null && state.cells[cellKey(row, col)] !== undefined;
    },
    
    gridCountOccupied: (args, ctx) => {
      if (args.length < 1) throw new Error('gridCountOccupied(gridId) requires 1 argument');
      const gridId = String(args[0]);
      const states = (ctx.variables['__gridStates'] as unknown as Record<string, GridState>) ?? {};
      const state = states[gridId];
      if (!state) return 0;
      let count = 0;
      for (const cell of Object.values(state.cells)) {
        if (cell !== null && cell !== undefined) count++;
      }
      return count;
    },
    
    gridCellToWorld: (args, ctx) => {
      if (args.length < 3) throw new Error('gridCellToWorld(gridId, row, col) requires 3 arguments');
      const gridId = String(args[0]);
      const row = Number(args[1]);
      const col = Number(args[2]);
      const defs = (ctx.variables['__gridDefs'] as unknown as Record<string, GridDefinition>) ?? {};
      const def = defs[gridId];
      if (!def) return { x: 0, y: 0 };
      return {
        x: def.origin.x + col * def.cellSize.x + def.cellSize.x / 2,
        y: def.origin.y + row * def.cellSize.y + def.cellSize.y / 2,
      };
    },
    
    gridHasMatch: (args, ctx) => {
      if (args.length < 2) throw new Error('gridHasMatch(gridId, minSize) requires 2 arguments');
      const gridId = String(args[0]);
      const minSize = Number(args[1]);
      const states = (ctx.variables['__gridStates'] as unknown as Record<string, GridState>) ?? {};
      const defs = (ctx.variables['__gridDefs'] as unknown as Record<string, GridDefinition>) ?? {};
      const state = states[gridId];
      const def = defs[gridId];
      if (!state || !def) return false;
      const grid = buildGridFromState(state, def);
      const groups = findConnectedGroups(
        grid,
        minSize,
        (a, b) => a !== null && b !== null && a === b
      );
      return groups.length > 0;
    },
    
    gridMatchCount: (args, ctx) => {
      if (args.length < 2) throw new Error('gridMatchCount(gridId, minSize) requires 2 arguments');
      const gridId = String(args[0]);
      const minSize = Number(args[1]);
      const states = (ctx.variables['__gridStates'] as unknown as Record<string, GridState>) ?? {};
      const defs = (ctx.variables['__gridDefs'] as unknown as Record<string, GridDefinition>) ?? {};
      const state = states[gridId];
      const def = defs[gridId];
      if (!state || !def) return 0;
      const grid = buildGridFromState(state, def);
      const groups = findConnectedGroups(
        grid,
        minSize,
        (a, b) => a !== null && b !== null && a === b
      );
      return groups.length;
    },
    
    gridConnectedAt: (args, ctx) => {
      if (args.length < 3) throw new Error('gridConnectedAt(gridId, row, col) requires 3 arguments');
      const gridId = String(args[0]);
      const row = Number(args[1]);
      const col = Number(args[2]);
      const states = (ctx.variables['__gridStates'] as unknown as Record<string, GridState>) ?? {};
      const defs = (ctx.variables['__gridDefs'] as unknown as Record<string, GridDefinition>) ?? {};
      const state = states[gridId];
      const def = defs[gridId];
      if (!state || !def) return 0;
      const grid = buildGridFromState(state, def);
      if (row < 0 || row >= def.rows || col < 0 || col >= def.cols) return 0;
      const startCell = grid[row]?.[col];
      if (startCell === null || startCell === undefined) return 0;
      const connected = floodFill(
        grid,
        row,
        col,
        (cell, start) => cell !== null && start !== null && cell === start
      );
      return connected.length;
    },
    
    gridHasLineMatch: (args, ctx) => {
      if (args.length < 2) throw new Error('gridHasLineMatch(gridId, length) requires 2 arguments');
      const gridId = String(args[0]);
      const length = Number(args[1]);
      const states = (ctx.variables['__gridStates'] as unknown as Record<string, GridState>) ?? {};
      const defs = (ctx.variables['__gridDefs'] as unknown as Record<string, GridDefinition>) ?? {};
      const state = states[gridId];
      const def = defs[gridId];
      if (!state || !def) return false;
      const grid = buildGridFromState(state, def);
      const visited = new Set<string>();
      for (let row = 0; row < def.rows; row++) {
        for (let col = 0; col < def.cols; col++) {
          const cellValue = grid[row]?.[col];
          if (cellValue === null || cellValue === undefined) continue;
          const key = `${row},${col},${cellValue}`;
          if (visited.has(key)) continue;
          visited.add(key);
          const matches = findLineMatches(
            grid,
            length,
            (cell) => cell === cellValue
          );
          if (matches.length > 0) return true;
        }
      }
      return false;
    },
  },
};

export * from './types';
export * from './helpers';
export * from './match-utils';
