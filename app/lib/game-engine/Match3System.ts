import type { EntityManager } from './EntityManager';
import type { GodotBridge } from '../godot/types';
import type { IGameStateMutator } from './rules/types';
import type {
  Match3Definition,
  Match3State,
  Match3Phase,
  Match3Match,
  Match3PieceType,
} from '@slopcade/shared';
import {
  createMatch3State,
  cellToWorld,
  worldToCell,
  isAdjacent,
  findMatches,
  getUniqueCellsFromMatches,
  applyGravity,
  getEmptyCellsAtTop,
  hasValidMoves,
  swapCells,
  selectRandomPieceType,
} from '@slopcade/shared';

export interface Match3SystemCallbacks {
  onMatchFound?: (matches: Match3Match[], cascadeLevel: number) => void;
  onPiecesCleared?: (count: number, cascadeLevel: number) => void;
  onCascadeComplete?: (totalCascades: number, totalCleared: number) => void;
  onNoMoves?: () => void;
  onBoardReady?: () => void;
}

export class Match3System {
  private definition: Match3Definition;
  private state: Match3State;
  private entityManager: EntityManager;
  private bridge: GodotBridge | undefined;
  private mutator: IGameStateMutator | undefined;
  private callbacks: Match3SystemCallbacks;
  
  private totalClearedThisCascade = 0;
  
  private readonly SWAP_DURATION: number;
  private readonly FALL_DURATION: number;
  private readonly CLEAR_DELAY: number;
  private readonly MIN_MATCH: number;

  constructor(
    definition: Match3Definition,
    entityManager: EntityManager,
    callbacks: Match3SystemCallbacks = {}
  ) {
    this.definition = definition;
    this.state = createMatch3State(definition);
    this.entityManager = entityManager;
    this.callbacks = callbacks;
    
    this.SWAP_DURATION = definition.swapDuration ?? 0.2;
    this.FALL_DURATION = 1 / (definition.fallSpeed ?? 8);
    this.CLEAR_DELAY = definition.clearDelay ?? 0.15;
    this.MIN_MATCH = definition.minMatch ?? 3;
  }

  setBridge(bridge: GodotBridge): void {
    this.bridge = bridge;
  }

  setMutator(mutator: IGameStateMutator): void {
    this.mutator = mutator;
  }

  getState(): Match3State {
    return this.state;
  }

  getDefinition(): Match3Definition {
    return this.definition;
  }

  initialize(): void {
    this.state = createMatch3State(this.definition);
    this.fillBoard();
    
    while (findMatches(this.state, this.MIN_MATCH).length > 0) {
      this.shuffleBoard();
    }
    
    this.state.phase = 'idle';
    this.callbacks.onBoardReady?.();
  }

  private fillBoard(): void {
    for (let r = 0; r < this.definition.rows; r++) {
      for (let c = 0; c < this.definition.cols; c++) {
        this.spawnPieceAt(r, c);
      }
    }
  }

  private shuffleBoard(): void {
    const rows = this.definition.rows;
    const cols = this.definition.cols;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pieceTypeId = selectRandomPieceType(this.definition.pieceTypes);
        this.state.board[r][c].pieceTypeId = pieceTypeId;
      }
    }
  }

  private spawnPieceAt(row: number, col: number, aboveBoard = false): string {
    const pieceTypeId = selectRandomPieceType(this.definition.pieceTypes);
    const pieceType = this.definition.pieceTypes.find(pt => pt.id === pieceTypeId);
    
    if (!pieceType) {
      throw new Error(`Piece type ${pieceTypeId} not found`);
    }

    const worldPos = cellToWorld(this.definition, row, col);
    const spawnY = aboveBoard 
      ? this.definition.origin.y - this.definition.cellSize.y 
      : worldPos.y;

    const entity = this.entityManager.createEntity({
      id: `match3_${row}_${col}_${Date.now()}`,
      name: `Piece ${row},${col}`,
      template: pieceType.templateId,
      transform: {
        x: worldPos.x,
        y: spawnY,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
      tags: ['match3_piece', `piece_${pieceTypeId}`],
    });

    this.state.board[row][col] = {
      entityId: entity.id,
      pieceTypeId,
      row,
      col,
    };

    return entity.id;
  }

  handleTap(worldX: number, worldY: number): void {
    if (this.state.phase !== 'idle') {
      return;
    }

    const cell = worldToCell(this.definition, worldX, worldY);
    if (!cell) return;

    const { row, col } = cell;
    const boardCell = this.state.board[row]?.[col];
    if (!boardCell?.entityId) return;

    if (this.state.selectedCell) {
      if (this.state.selectedCell.row === row && this.state.selectedCell.col === col) {
        this.state.selectedCell = null;
        return;
      }

      if (isAdjacent(this.state.selectedCell, cell)) {
        this.startSwap(this.state.selectedCell, cell);
      } else {
        this.state.selectedCell = cell;
      }
    } else {
      this.state.selectedCell = cell;
    }
  }

  handleSwipe(fromX: number, fromY: number, toX: number, toY: number): void {
    if (this.state.phase !== 'idle') return;

    const fromCell = worldToCell(this.definition, fromX, fromY);
    const toCell = worldToCell(this.definition, toX, toY);
    
    if (!fromCell || !toCell) return;
    if (!isAdjacent(fromCell, toCell)) return;

    this.startSwap(fromCell, toCell);
  }

  private startSwap(cellA: { row: number; col: number }, cellB: { row: number; col: number }): void {
    this.state.phase = 'swapping';
    this.state.swapA = cellA;
    this.state.swapB = cellB;
    this.state.selectedCell = null;
    this.state.animationTimer = this.SWAP_DURATION;

    const entityA = this.state.board[cellA.row][cellA.col].entityId;
    const entityB = this.state.board[cellB.row][cellB.col].entityId;
    
    if (entityA && entityB) {
      const posA = cellToWorld(this.definition, cellA.row, cellA.col);
      const posB = cellToWorld(this.definition, cellB.row, cellB.col);
      
      this.animateEntityTo(entityA, posB.x, posB.y, this.SWAP_DURATION);
      this.animateEntityTo(entityB, posA.x, posA.y, this.SWAP_DURATION);
    }
  }

  private animateEntityTo(entityId: string, x: number, y: number, duration: number): void {
    const entity = this.entityManager.getEntity(entityId);
    if (!entity) return;

    entity.transform.x = x;
    entity.transform.y = y;

    if (this.bridge) {
      this.bridge.setPosition(entityId, x, y);
    }
  }

  update(dt: number): void {
    if (this.state.phase === 'idle') return;

    this.state.animationTimer -= dt;

    switch (this.state.phase) {
      case 'swapping':
        if (this.state.animationTimer <= 0) {
          this.finishSwap();
        }
        break;

      case 'checking':
        this.checkForMatches();
        break;

      case 'clearing':
        if (this.state.animationTimer <= 0) {
          this.clearMatches();
        }
        break;

      case 'falling':
        if (this.state.animationTimer <= 0) {
          this.finishFalling();
        }
        break;

      case 'spawning':
        if (this.state.animationTimer <= 0) {
          this.finishSpawning();
        }
        break;
    }
  }

  private finishSwap(): void {
    if (!this.state.swapA || !this.state.swapB) {
      this.state.phase = 'idle';
      return;
    }

    swapCells(
      this.state,
      this.state.swapA.row,
      this.state.swapA.col,
      this.state.swapB.row,
      this.state.swapB.col
    );

    this.state.cascadeCount = 0;
    this.totalClearedThisCascade = 0;
    this.state.phase = 'checking';
  }

  private checkForMatches(): void {
    const matches = findMatches(this.state, this.MIN_MATCH);

    if (matches.length === 0) {
      if (this.state.cascadeCount === 0 && this.state.swapA && this.state.swapB) {
        swapCells(
          this.state,
          this.state.swapA.row,
          this.state.swapA.col,
          this.state.swapB.row,
          this.state.swapB.col
        );

        const entityA = this.state.board[this.state.swapA.row][this.state.swapA.col].entityId;
        const entityB = this.state.board[this.state.swapB.row][this.state.swapB.col].entityId;
        
        if (entityA && entityB) {
          const posA = cellToWorld(this.definition, this.state.swapA.row, this.state.swapA.col);
          const posB = cellToWorld(this.definition, this.state.swapB.row, this.state.swapB.col);
          this.animateEntityTo(entityA, posA.x, posA.y, 0);
          this.animateEntityTo(entityB, posB.x, posB.y, 0);
        }
      }

      this.state.swapA = null;
      this.state.swapB = null;
      
      if (this.state.cascadeCount > 0) {
        this.callbacks.onCascadeComplete?.(this.state.cascadeCount, this.totalClearedThisCascade);
        this.mutator?.triggerEvent('match3_cascade_complete', {
          boardId: this.definition.id,
          totalCascades: this.state.cascadeCount,
          totalCleared: this.totalClearedThisCascade,
        });
      }

      if (!hasValidMoves(this.state, this.MIN_MATCH)) {
        this.callbacks.onNoMoves?.();
        this.mutator?.triggerEvent('match3_no_moves', { boardId: this.definition.id });
      }

      this.state.phase = 'idle';
      return;
    }

    this.state.cascadeCount++;
    const cellsToRemove = getUniqueCellsFromMatches(matches);
    this.state.pendingClears = cellsToRemove;
    
    const totalPieces = cellsToRemove.length;
    this.callbacks.onMatchFound?.(matches, this.state.cascadeCount);
    this.mutator?.triggerEvent('match3_match_found', {
      boardId: this.definition.id,
      matches,
      totalPieces,
    });

    const basePoints = totalPieces * 10;
    const cascadeMultiplier = Math.pow(1.5, this.state.cascadeCount - 1);
    const points = Math.round(basePoints * cascadeMultiplier);
    this.mutator?.addScore(points);

    this.state.phase = 'clearing';
    this.state.animationTimer = this.CLEAR_DELAY;
  }

  private clearMatches(): void {
    for (const cell of this.state.pendingClears) {
      const boardCell = this.state.board[cell.row][cell.col];
      if (boardCell.entityId) {
        this.entityManager.destroyEntity(boardCell.entityId);
        boardCell.entityId = null;
        boardCell.pieceTypeId = null;
      }
    }

    const clearedCount = this.state.pendingClears.length;
    this.totalClearedThisCascade += clearedCount;
    
    this.callbacks.onPiecesCleared?.(clearedCount, this.state.cascadeCount);
    this.mutator?.triggerEvent('match3_pieces_cleared', {
      boardId: this.definition.id,
      count: clearedCount,
      cascadeLevel: this.state.cascadeCount,
    });

    this.state.pendingClears = [];

    const moves = applyGravity(this.state);
    
    for (const move of moves) {
      const boardCell = this.state.board[move.to.row][move.to.col];
      if (boardCell.entityId) {
        const targetPos = cellToWorld(this.definition, move.to.row, move.to.col);
        this.animateEntityTo(boardCell.entityId, targetPos.x, targetPos.y, this.FALL_DURATION);
      }
    }

    this.state.phase = 'falling';
    this.state.animationTimer = moves.length > 0 ? this.FALL_DURATION : 0;
  }

  private finishFalling(): void {
    const emptyCells = getEmptyCellsAtTop(this.state);
    
    if (emptyCells.length === 0) {
      this.state.phase = 'checking';
      return;
    }

    for (const cell of emptyCells) {
      const entityId = this.spawnPieceAt(cell.row, cell.col, true);
      
      const targetPos = cellToWorld(this.definition, cell.row, cell.col);
      this.animateEntityTo(entityId, targetPos.x, targetPos.y, this.FALL_DURATION);
    }

    this.state.phase = 'spawning';
    this.state.animationTimer = this.FALL_DURATION;
  }

  private finishSpawning(): void {
    this.state.phase = 'checking';
  }

  destroy(): void {
    for (let r = 0; r < this.definition.rows; r++) {
      for (let c = 0; c < this.definition.cols; c++) {
        const cell = this.state.board[r]?.[c];
        if (cell?.entityId) {
          this.entityManager.destroyEntity(cell.entityId);
        }
      }
    }
  }
}
