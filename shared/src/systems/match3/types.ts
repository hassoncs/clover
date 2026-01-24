import type { Vec2 } from '../../types/common';

export interface Match3PieceType {
  id: string;
  templateId: string;
  weight?: number;
}

export interface Match3Definition {
  id: string;
  rows: number;
  cols: number;
  cellSize: Vec2;
  origin: Vec2;
  pieceTypes: Match3PieceType[];
  minMatch?: number;
  swapDuration?: number;
  fallSpeed?: number;
  clearDelay?: number;
}

export type Match3Phase = 
  | 'idle'
  | 'swapping'
  | 'checking'
  | 'clearing'
  | 'falling'
  | 'spawning'
  | 'locked';

export interface Match3Cell {
  entityId: string | null;
  pieceTypeId: string | null;
  row: number;
  col: number;
}

export interface Match3State {
  phase: Match3Phase;
  board: Match3Cell[][];
  selectedCell: { row: number; col: number } | null;
  swapA: { row: number; col: number } | null;
  swapB: { row: number; col: number } | null;
  pendingClears: Array<{ row: number; col: number }>;
  cascadeCount: number;
  animationTimer: number;
  locked: boolean;
}

export interface Match3Match {
  cells: Array<{ row: number; col: number }>;
  pieceTypeId: string;
  isHorizontal: boolean;
  length: number;
}

export interface Match3SwapAction {
  type: 'match3_swap';
  boardId: string;
  cellA: { row: number; col: number };
  cellB: { row: number; col: number };
}

export interface Match3SelectAction {
  type: 'match3_select';
  boardId: string;
  row: number;
  col: number;
}

export interface Match3InitAction {
  type: 'match3_init';
  boardId: string;
}

export type Match3Action = 
  | Match3SwapAction
  | Match3SelectAction
  | Match3InitAction;

export interface Match3Events {
  match3_swap_started: { boardId: string; cellA: { row: number; col: number }; cellB: { row: number; col: number } };
  match3_swap_invalid: { boardId: string; reason: string };
  match3_match_found: { boardId: string; matches: Match3Match[]; totalPieces: number };
  match3_pieces_cleared: { boardId: string; count: number; cascadeLevel: number };
  match3_cascade_complete: { boardId: string; totalCascades: number; totalCleared: number };
  match3_no_moves: { boardId: string };
  match3_board_ready: { boardId: string };
}
