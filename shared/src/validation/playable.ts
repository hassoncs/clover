import type { GameDefinition, Match3Config, TetrisConfig } from '../types/GameDefinition';

export interface PlayableValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MATCH3_CONSTRAINTS = {
  MIN_ROWS: 4,
  MAX_ROWS: 12,
  MIN_COLS: 4,
  MAX_COLS: 12,
  MIN_PIECE_TEMPLATES: 3,
  MAX_PIECE_TEMPLATES: 6,
  MIN_MATCH_MIN: 3,
  MIN_MATCH_MAX: 5,
} as const;

const TETRIS_CONSTRAINTS = {
  MIN_BOARD_WIDTH: 10,
  MAX_BOARD_WIDTH: 20,
  MIN_BOARD_HEIGHT: 15,
  MAX_BOARD_HEIGHT: 25,
  REQUIRED_PIECE_TEMPLATES: 7,
  MIN_DROP_SPEED: 0.1,
} as const;

export function validateMatch3Playability(config: Match3Config): PlayableValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.pieceTemplates || config.pieceTemplates.length < MATCH3_CONSTRAINTS.MIN_PIECE_TEMPLATES) {
    errors.push(
      `Match3: At least ${MATCH3_CONSTRAINTS.MIN_PIECE_TEMPLATES} piece templates required, got ${config.pieceTemplates?.length ?? 0}`
    );
  }

  if (config.pieceTemplates && config.pieceTemplates.length > MATCH3_CONSTRAINTS.MAX_PIECE_TEMPLATES) {
    warnings.push(
      `Match3: More than ${MATCH3_CONSTRAINTS.MAX_PIECE_TEMPLATES} piece templates may reduce match frequency`
    );
  }

  if (config.rows < MATCH3_CONSTRAINTS.MIN_ROWS || config.rows > MATCH3_CONSTRAINTS.MAX_ROWS) {
    errors.push(
      `Match3: rows must be between ${MATCH3_CONSTRAINTS.MIN_ROWS} and ${MATCH3_CONSTRAINTS.MAX_ROWS}, got ${config.rows}`
    );
  }

  if (config.cols < MATCH3_CONSTRAINTS.MIN_COLS || config.cols > MATCH3_CONSTRAINTS.MAX_COLS) {
    errors.push(
      `Match3: cols must be between ${MATCH3_CONSTRAINTS.MIN_COLS} and ${MATCH3_CONSTRAINTS.MAX_COLS}, got ${config.cols}`
    );
  }

  if (config.minMatch !== undefined) {
    if (config.minMatch < MATCH3_CONSTRAINTS.MIN_MATCH_MIN || config.minMatch > MATCH3_CONSTRAINTS.MIN_MATCH_MAX) {
      errors.push(
        `Match3: minMatch must be between ${MATCH3_CONSTRAINTS.MIN_MATCH_MIN} and ${MATCH3_CONSTRAINTS.MIN_MATCH_MAX}, got ${config.minMatch}`
      );
    }
  }

  if (config.cellSize !== undefined && config.cellSize <= 0) {
    errors.push(`Match3: cellSize must be positive, got ${config.cellSize}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateTetrisPlayability(config: TetrisConfig): PlayableValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.boardWidth < TETRIS_CONSTRAINTS.MIN_BOARD_WIDTH) {
    errors.push(
      `Tetris: boardWidth must be at least ${TETRIS_CONSTRAINTS.MIN_BOARD_WIDTH}, got ${config.boardWidth}`
    );
  } else if (config.boardWidth > TETRIS_CONSTRAINTS.MAX_BOARD_WIDTH) {
    errors.push(
      `Tetris: boardWidth must be at most ${TETRIS_CONSTRAINTS.MAX_BOARD_WIDTH}, got ${config.boardWidth}`
    );
  }

  if (config.boardHeight < TETRIS_CONSTRAINTS.MIN_BOARD_HEIGHT) {
    errors.push(
      `Tetris: boardHeight must be at least ${TETRIS_CONSTRAINTS.MIN_BOARD_HEIGHT}, got ${config.boardHeight}`
    );
  } else if (config.boardHeight > TETRIS_CONSTRAINTS.MAX_BOARD_HEIGHT) {
    errors.push(
      `Tetris: boardHeight must be at most ${TETRIS_CONSTRAINTS.MAX_BOARD_HEIGHT}, got ${config.boardHeight}`
    );
  }

  if (!config.pieceTemplates || config.pieceTemplates.length !== TETRIS_CONSTRAINTS.REQUIRED_PIECE_TEMPLATES) {
    errors.push(
      `Tetris: pieceTemplates must have exactly ${TETRIS_CONSTRAINTS.REQUIRED_PIECE_TEMPLATES} items (I, O, T, S, Z, J, L), got ${config.pieceTemplates?.length ?? 0}`
    );
  }

  if (config.initialDropSpeed !== undefined && config.initialDropSpeed < TETRIS_CONSTRAINTS.MIN_DROP_SPEED) {
    errors.push(
      `Tetris: initialDropSpeed must be at least ${TETRIS_CONSTRAINTS.MIN_DROP_SPEED}, got ${config.initialDropSpeed}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validatePlayable(gameDef: GameDefinition): PlayableValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (gameDef.match3) {
    const match3Result = validateMatch3Playability(gameDef.match3);
    errors.push(...match3Result.errors);
    warnings.push(...match3Result.warnings);
  }

  if (gameDef.tetris) {
    const tetrisResult = validateTetrisPlayability(gameDef.tetris);
    errors.push(...tetrisResult.errors);
    warnings.push(...tetrisResult.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
