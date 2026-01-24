import type { Vec2, Bounds } from '../../types/common';
import type { Value } from '../../expressions/types';
import type { EntityTarget } from '../../types/rules';

export interface CellTypeDefinition {
  id: string;
  walkable?: boolean;
  tags?: string[];
  data?: Record<string, unknown>;
}

export interface GridDefinition {
  id: string;
  rows: number;
  cols: number;
  cellSize: Vec2;
  origin: Vec2;
  cellTypes?: Record<string, CellTypeDefinition>;
  initialState?: (number | string)[][];
}

export interface GridState {
  cells: Record<string, string | null>;
  cellData: Record<string, Record<string, unknown>>;
}

export interface GridPlaceAction {
  type: 'grid_place';
  gridId: string;
  entityId: string | EntityTarget;
  row: Value<number>;
  col: Value<number>;
}

export interface GridMoveAction {
  type: 'grid_move';
  gridId: string;
  entityId: string | EntityTarget;
  toRow: Value<number>;
  toCol: Value<number>;
  animate?: boolean;
  duration?: number;
}

export interface GridSwapAction {
  type: 'grid_swap';
  gridId: string;
  cellA: { row: Value<number>; col: Value<number> };
  cellB: { row: Value<number>; col: Value<number> };
  animate?: boolean;
}

export interface GridClearAction {
  type: 'grid_clear';
  gridId: string;
  cells: Array<{ row: number; col: number }>;
  effect?: 'none' | 'fade' | 'explode';
}

export interface GridFillAction {
  type: 'grid_fill';
  gridId: string;
  template: string | string[];
  direction?: 'top' | 'bottom' | 'left' | 'right';
}

export interface GridSetCellDataAction {
  type: 'grid_set_cell_data';
  gridId: string;
  row: Value<number>;
  col: Value<number>;
  key: string;
  value: Value<unknown>;
}

export type GridAction = 
  | GridPlaceAction 
  | GridMoveAction 
  | GridSwapAction 
  | GridClearAction 
  | GridFillAction 
  | GridSetCellDataAction;
