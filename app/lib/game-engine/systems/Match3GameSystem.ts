/**
 * Match-3 Game System Plugin
 *
 * This system plugs into the game engine to provide Match-3 mechanics.
 * It reads configuration from GameDefinition.match3 and manages:
 * - Board initialization (spawning piece entities)
 * - Tap input handling for selection/swap
 * - Match detection algorithm
 * - Piece clearing and gravity
 * - Score tracking
 *
 * The system uses the standard EntityManager for all entity operations,
 * so rendering and asset swapping work normally.
 */

import type { EntityManager } from "../EntityManager";
import type { GodotBridge } from "../../godot/types";
import {
  selectVariantByIndex,
  gridCellToWorld,
  gridWorldToCell,
  gridIsAdjacent,
  gridConfigFromMatch3,
  getGlobalSlotRegistry,
  type AssetSheet,
  type Match3Config,
  type GridConfig,
  type EventBus,
  type SlotImplementation,
} from "@slopcade/shared";
import { registerMatch3SlotImplementations } from "./match3/slots";

export type { Match3Config };

export type Match3Phase =
  | "idle"
  | "selected"
  | "swapping"
  | "checking"
  | "clearing"
  | "falling"
  | "spawning";

interface BoardCell {
  entityId: string | null;
  pieceType: number;
  row: number;
  col: number;
}

interface PendingAnimation {
  entityId: string;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  duration: number;
  elapsed: number;
}

export interface Match3Callbacks {
  onScoreAdd?: (points: number) => void;
  onMatchFound?: (count: number, cascadeLevel: number) => void;
  onBoardReady?: () => void;
  onNoMoves?: () => void;
}

interface MatchDetectionInput {
  board: BoardCell[][];
  rows: number;
  cols: number;
  minMatch: number;
}

interface Match {
  cells: Array<{ row: number; col: number }>;
  pieceType: number;
}

interface ScoringInput {
  matchSize: number;
  cascadeLevel: number;
  pieceType?: number;
}

export class Match3GameSystem {
  private config: Match3Config;
  private gridConfig: GridConfig;
  private entityManager: EntityManager;
  private bridge: GodotBridge | null = null;
  private callbacks: Match3Callbacks;
  private sheetMetadata: AssetSheet | null = null;
  private eventBus: EventBus | null = null;

  private board: BoardCell[][] = [];
  private phase: Match3Phase = "idle";
  private selectedCell: { row: number; col: number } | null = null;
  private swapCells: {
    a: { row: number; col: number };
    b: { row: number; col: number };
  } | null = null;
  private hoverCell: { row: number; col: number } | null = null;

  private pendingAnimations: PendingAnimation[] = [];
  private phaseTimer = 0;
  private cascadeCount = 0;
  private totalClearedThisTurn = 0;
  private totalScoreThisTurn = 0;

  private readonly MIN_MATCH: number;
  private readonly SWAP_DURATION: number;
  private readonly FALL_DURATION: number;
  private readonly CLEAR_DELAY: number;

  private matchDetectionImpl: SlotImplementation<MatchDetectionInput, Match[]> | null = null;
  private scoringImpl: SlotImplementation<ScoringInput, number> | null = null;

  constructor(
    config: Match3Config,
    entityManager: EntityManager,
    callbacks: Match3Callbacks = {},
    eventBus?: EventBus,
  ) {
    this.config = config;
    this.gridConfig = gridConfigFromMatch3(config);
    this.entityManager = entityManager;
    this.callbacks = callbacks;
    this.eventBus = eventBus ?? null;

    this.MIN_MATCH = config.minMatch ?? 3;
    this.SWAP_DURATION = config.swapDuration ?? 0.15;
    this.FALL_DURATION = config.fallDuration ?? 0.1;
    this.CLEAR_DELAY = config.clearDelay ?? 0.1;

    registerMatch3SlotImplementations();
    const registry = getGlobalSlotRegistry();

    const matchDetectionId = config.matchDetection ?? 'standard_3_match';
    const matchDetectionImpl = registry.get(matchDetectionId);
    if (matchDetectionImpl) {
      this.matchDetectionImpl = matchDetectionImpl as SlotImplementation<MatchDetectionInput, Match[]>;
    }

    const scoringId = config.scoring ?? 'cascade_multiplier';
    const scoringImpl = registry.get(scoringId);
    if (scoringImpl) {
      this.scoringImpl = scoringImpl as SlotImplementation<ScoringInput, number>;
    }
  }

  setBridge(bridge: GodotBridge): void {
    this.bridge = bridge;
  }

  setSheetMetadata(metadata: AssetSheet): void {
    this.sheetMetadata = metadata;
  }

  initialize(): void {
    this.board = [];
    for (let row = 0; row < this.config.rows; row++) {
      this.board[row] = [];
      for (let col = 0; col < this.config.cols; col++) {
        this.board[row][col] = {
          entityId: null,
          pieceType: -1,
          row,
          col,
        };
      }
    }

    this.fillBoardWithoutMatches();
    this.phase = "idle";
    this.callbacks.onBoardReady?.();
  }

  private fillBoardWithoutMatches(): void {
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        let pieceType: number;
        let attempts = 0;

        do {
          pieceType = Math.floor(
            Math.random() * this.config.pieceTemplates.length,
          );
          attempts++;
        } while (attempts < 20 && this.wouldCreateMatch(row, col, pieceType));

        this.spawnPieceAt(row, col, pieceType);
      }
    }
  }

  private wouldCreateMatch(
    row: number,
    col: number,
    pieceType: number,
  ): boolean {
    if (col >= 2) {
      const left1 = this.board[row][col - 1]?.pieceType;
      const left2 = this.board[row][col - 2]?.pieceType;
      if (left1 === pieceType && left2 === pieceType) return true;
    }

    if (row >= 2) {
      const up1 = this.board[row - 1]?.[col]?.pieceType;
      const up2 = this.board[row - 2]?.[col]?.pieceType;
      if (up1 === pieceType && up2 === pieceType) return true;
    }

    return false;
  }

  private cellToWorldPos(row: number, col: number): { x: number; y: number } {
    return gridCellToWorld(this.gridConfig, row, col);
  }

  private worldToCellPos(
    worldX: number,
    worldY: number,
  ): { row: number; col: number } | null {
    return gridWorldToCell(this.gridConfig, worldX, worldY);
  }

  private spawnPieceAt(
    row: number,
    col: number,
    pieceType: number,
    aboveBoard = false,
  ): void {
    const template = this.config.pieceTemplates[pieceType];
    const pos = this.cellToWorldPos(row, col);
    const gridHeight = this.gridConfig.rows * this.gridConfig.cellHeight;
    const topOfGrid = gridHeight / 2;
    const spawnY = aboveBoard ? topOfGrid + this.config.cellSize : pos.y;

    let entityId: string;

    if (this.bridge) {
      entityId = this.bridge.spawnEntity(template, pos.x, spawnY);
    } else {
      entityId = `match3_${row}_${col}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 6)}`;
    }

    this.entityManager.createEntity({
      id: entityId,
      name: `Piece ${row},${col}`,
      template,
      transform: {
        x: pos.x,
        y: spawnY,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
      tags: ["match3_piece"],
    });

    if (
      this.config.variantSheet?.enabled &&
      this.sheetMetadata &&
      this.bridge
    ) {
      const result = selectVariantByIndex(
        this.sheetMetadata,
        this.config.variantSheet.groupId ?? "default",
        pieceType,
      );
      if (result) {
        const templateDef = this.entityManager.getTemplate(template);
        let spriteWidth = 1.0;
        let spriteHeight = 1.0;

        if (templateDef?.physics) {
          const physics = templateDef.physics;
          if (physics.shape === "circle" && "radius" in physics) {
            spriteWidth = spriteHeight = physics.radius * 2;
          } else if (
            physics.shape === "box" &&
            "width" in physics &&
            "height" in physics
          ) {
            spriteWidth = physics.width;
            spriteHeight = physics.height;
          }
        }

        this.bridge.setEntityAtlasRegion(
          entityId,
          this.config.variantSheet.atlasUrl,
          result.region.x,
          result.region.y,
          result.region.w,
          result.region.h,
          spriteWidth,
          spriteHeight,
        );
      }
    }

    this.board[row][col] = {
      entityId,
      pieceType,
      row,
      col,
    };

    if (aboveBoard) {
      this.pendingAnimations.push({
        entityId,
        startX: pos.x,
        startY: spawnY,
        targetX: pos.x,
        targetY: pos.y,
        duration: this.FALL_DURATION * (row + 1),
        elapsed: 0,
      });
    }
  }

  handleTap(worldX: number, worldY: number): void {
    if (this.phase !== "idle" && this.phase !== "selected") {
      return;
    }

    const cell = this.worldToCellPos(worldX, worldY);
    if (!cell) return;

    const { row, col } = cell;
    const boardCell = this.board[row]?.[col];
    if (!boardCell?.entityId) return;

    if (this.phase === "idle" || !this.selectedCell) {
      this.clearSelection();
      this.selectedCell = { row, col };
      this.phase = "selected";
      this.entityManager.addTag(boardCell.entityId, "sys.match3:selected");
    } else {
      if (this.selectedCell.row === row && this.selectedCell.col === col) {
        this.clearSelection();
        this.selectedCell = null;
        this.phase = "idle";
      } else if (gridIsAdjacent(this.selectedCell, { row, col })) {
        this.startSwap(this.selectedCell, { row, col });
      } else {
        this.clearSelection();
        this.selectedCell = { row, col };
        this.entityManager.addTag(boardCell.entityId, "sys.match3:selected");
      }
    }
  }

  handleMouseMove(worldX: number, worldY: number): void {
    if (this.phase !== "idle" && this.phase !== "selected") {
      this.clearHover();
      return;
    }

    const cell = this.worldToCellPos(worldX, worldY);
    if (!cell) {
      this.clearHover();
      return;
    }

    const { row, col } = cell;
    const boardCell = this.board[row]?.[col];

    if (!boardCell?.entityId) {
      this.clearHover();
      return;
    }

    if (this.hoverCell?.row !== row || this.hoverCell?.col !== col) {
      this.clearHover();
      const selectedBoardCell = this.selectedCell 
        ? this.board[this.selectedCell.row]?.[this.selectedCell.col] 
        : null;
      if (boardCell.entityId !== selectedBoardCell?.entityId) {
        this.hoverCell = { row, col };
        this.entityManager.addTag(boardCell.entityId, "sys.match3:hovered");
      }
    }
  }

  private clearHover(): void {
    if (this.hoverCell) {
      const boardCell = this.board[this.hoverCell.row]?.[this.hoverCell.col];
      if (boardCell?.entityId) {
        this.entityManager.removeTag(boardCell.entityId, "sys.match3:hovered");
      }
      this.hoverCell = null;
    }
  }

  private clearSelection(): void {
    if (this.selectedCell) {
      const boardCell = this.board[this.selectedCell.row]?.[this.selectedCell.col];
      if (boardCell?.entityId) {
        this.entityManager.removeTag(boardCell.entityId, "sys.match3:selected");
      }
    }
    this.clearHover();
  }

  private startSwap(
    a: { row: number; col: number },
    b: { row: number; col: number },
  ): void {
    this.phase = "swapping";
    this.swapCells = { a, b };
    this.clearSelection();
    this.selectedCell = null;
    this.cascadeCount = 0;
    this.totalClearedThisTurn = 0;
    this.totalScoreThisTurn = 0;

    const cellA = this.board[a.row][a.col];
    const cellB = this.board[b.row][b.col];
    const posA = this.cellToWorldPos(a.row, a.col);
    const posB = this.cellToWorldPos(b.row, b.col);

    if (cellA.entityId) {
      this.pendingAnimations.push({
        entityId: cellA.entityId,
        startX: posA.x,
        startY: posA.y,
        targetX: posB.x,
        targetY: posB.y,
        duration: this.SWAP_DURATION,
        elapsed: 0,
      });
    }

    if (cellB.entityId) {
      this.pendingAnimations.push({
        entityId: cellB.entityId,
        startX: posB.x,
        startY: posB.y,
        targetX: posA.x,
        targetY: posA.y,
        duration: this.SWAP_DURATION,
        elapsed: 0,
      });
    }
  }

  private performSwap(
    a: { row: number; col: number },
    b: { row: number; col: number },
  ): void {
    const cellA = this.board[a.row][a.col];
    const cellB = this.board[b.row][b.col];

    this.board[a.row][a.col] = { ...cellB, row: a.row, col: a.col };
    this.board[b.row][b.col] = { ...cellA, row: b.row, col: b.col };
  }

  update(dt: number): void {
    this.updateAnimations(dt);

    switch (this.phase) {
      case "swapping":
        if (this.pendingAnimations.length === 0) {
          this.finishSwap();
        }
        break;

      case "checking":
        this.checkForMatches();
        break;

      case "clearing":
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) {
          this.performClearing();
        }
        break;

      case "falling":
        if (this.pendingAnimations.length === 0) {
          this.finishFalling();
        }
        break;

      case "spawning":
        if (this.pendingAnimations.length === 0) {
          this.phase = "checking";
        }
        break;
    }
  }

  private updateAnimations(dt: number): void {
    const completed: number[] = [];

    for (let i = 0; i < this.pendingAnimations.length; i++) {
      const anim = this.pendingAnimations[i];
      anim.elapsed += dt;

      const t = Math.min(1, anim.elapsed / anim.duration);
      const eased = this.easeOutQuad(t);

      const x = anim.startX + (anim.targetX - anim.startX) * eased;
      const y = anim.startY + (anim.targetY - anim.startY) * eased;

      const entity = this.entityManager.getEntity(anim.entityId);
      if (entity) {
        entity.transform.x = x;
        entity.transform.y = y;
        if (this.bridge) {
          this.bridge.setPosition(anim.entityId, x, y);
        }
      }

      if (t >= 1) {
        completed.push(i);
      }
    }

    for (let i = completed.length - 1; i >= 0; i--) {
      this.pendingAnimations.splice(completed[i], 1);
    }
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private finishSwap(): void {
    if (!this.swapCells) {
      this.phase = "idle";
      return;
    }

    this.performSwap(this.swapCells.a, this.swapCells.b);
    this.phase = "checking";
  }

  private checkForMatches(): void {
    const matches = this.detectMatches();

    if (matches.length === 0) {
      if (this.cascadeCount === 0 && this.swapCells) {
        this.performSwap(this.swapCells.a, this.swapCells.b);

        const posA = this.cellToWorldPos(
          this.swapCells.a.row,
          this.swapCells.a.col,
        );
        const posB = this.cellToWorldPos(
          this.swapCells.b.row,
          this.swapCells.b.col,
        );
        const cellA = this.board[this.swapCells.a.row][this.swapCells.a.col];
        const cellB = this.board[this.swapCells.b.row][this.swapCells.b.col];

        if (cellA.entityId) {
          this.pendingAnimations.push({
            entityId: cellA.entityId,
            startX: posB.x,
            startY: posB.y,
            targetX: posA.x,
            targetY: posA.y,
            duration: this.SWAP_DURATION,
            elapsed: 0,
          });
        }
        if (cellB.entityId) {
          this.pendingAnimations.push({
            entityId: cellB.entityId,
            startX: posA.x,
            startY: posA.y,
            targetX: posB.x,
            targetY: posB.y,
            duration: this.SWAP_DURATION,
            elapsed: 0,
          });
        }

        this.phase = "swapping";
        this.swapCells = null;
        return;
      }

      if (this.cascadeCount > 0) {
        this.eventBus?.emit("match3:cascade_complete", {
          totalMatches: this.cascadeCount,
          totalScore: this.totalScoreThisTurn,
          totalCleared: this.totalClearedThisTurn,
        });
      }

      this.swapCells = null;
      this.phase = "idle";

      if (!this.hasValidMoves()) {
        this.callbacks.onNoMoves?.();
        this.eventBus?.emit("match3:no_moves", {});
      }

      return;
    }

    this.cascadeCount++;
    const uniqueCells = this.getUniqueCellsFromMatches(matches);

    for (const cell of uniqueCells) {
      const boardCell = this.board[cell.row][cell.col];
      if (boardCell.entityId) {
        const entity = this.entityManager.getEntity(boardCell.entityId);
        if (entity) {
          entity.transform.scaleX = 1.2;
          entity.transform.scaleY = 1.2;
        }
      }
    }

    const points = this.calculateScore(uniqueCells.length, this.cascadeCount);
    this.totalScoreThisTurn += points;
    this.callbacks.onScoreAdd?.(points);
    this.callbacks.onMatchFound?.(uniqueCells.length, this.cascadeCount);

    const pieceIds = uniqueCells
      .map((cell) => this.board[cell.row][cell.col].entityId)
      .filter((id): id is string => id !== null);
    this.eventBus?.emit("match3:match_found", {
      pieces: pieceIds,
      size: uniqueCells.length,
      cascadeLevel: this.cascadeCount,
      points,
    });

    this.phase = "clearing";
    this.phaseTimer = this.CLEAR_DELAY;
  }

  private detectMatches(): Match[] {
    if (this.matchDetectionImpl) {
      return this.matchDetectionImpl.run(null, {
        board: this.board,
        rows: this.config.rows,
        cols: this.config.cols,
        minMatch: this.MIN_MATCH,
      });
    }
    return this.findMatchesLegacy();
  }

  private calculateScore(matchSize: number, cascadeLevel: number): number {
    if (this.scoringImpl) {
      return this.scoringImpl.run(null, { matchSize, cascadeLevel });
    }
    return matchSize * 10 * cascadeLevel;
  }

  private getUniqueCellsFromMatches(
    matches: Match[],
  ): Array<{ row: number; col: number }> {
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

  private findMatchesLegacy(): Match[] {
    const matches: Match[] = [];

    for (let row = 0; row < this.config.rows; row++) {
      let runStart = 0;
      let runType = this.board[row][0]?.pieceType ?? -1;

      for (let col = 1; col <= this.config.cols; col++) {
        const currentType =
          col < this.config.cols ? this.board[row][col]?.pieceType ?? -1 : -1;

        if (currentType !== runType || col === this.config.cols) {
          if (runType >= 0 && col - runStart >= this.MIN_MATCH) {
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

    for (let col = 0; col < this.config.cols; col++) {
      let runStart = 0;
      let runType = this.board[0]?.[col]?.pieceType ?? -1;

      for (let row = 1; row <= this.config.rows; row++) {
        const currentType =
          row < this.config.rows ? this.board[row]?.[col]?.pieceType ?? -1 : -1;

        if (currentType !== runType || row === this.config.rows) {
          if (runType >= 0 && row - runStart >= this.MIN_MATCH) {
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

  private performClearing(): void {
    const matches = this.detectMatches();
    const cellsToClear = this.getUniqueCellsFromMatches(matches);

    for (const cell of cellsToClear) {
      const boardCell = this.board[cell.row][cell.col];
      if (boardCell.entityId) {
        if (this.bridge) {
          this.bridge.destroyEntity(boardCell.entityId);
        }
        this.entityManager.destroyEntity(boardCell.entityId);
        boardCell.entityId = null;
        boardCell.pieceType = -1;
        this.totalClearedThisTurn++;
      }
    }

    this.applyGravity();
    this.phase = "falling";
  }

  private applyGravity(): void {
    for (let col = 0; col < this.config.cols; col++) {
      let writeRow = this.config.rows - 1;

      for (let row = this.config.rows - 1; row >= 0; row--) {
        const cell = this.board[row][col];
        if (cell.pieceType >= 0 && cell.entityId) {
          if (row !== writeRow) {
            const targetPos = this.cellToWorldPos(writeRow, col);
            const currentPos = this.cellToWorldPos(row, col);

            this.pendingAnimations.push({
              entityId: cell.entityId,
              startX: currentPos.x,
              startY: currentPos.y,
              targetX: targetPos.x,
              targetY: targetPos.y,
              duration: this.FALL_DURATION * (writeRow - row),
              elapsed: 0,
            });

            this.board[writeRow][col] = { ...cell, row: writeRow };
            this.board[row][col] = { entityId: null, pieceType: -1, row, col };
          }
          writeRow--;
        }
      }
    }
  }

  private finishFalling(): void {
    const emptyCells = this.getEmptyCellsAtTop();

    if (emptyCells.length === 0) {
      this.phase = "checking";
      return;
    }

    for (const cell of emptyCells) {
      const pieceType = Math.floor(
        Math.random() * this.config.pieceTemplates.length,
      );
      this.spawnPieceAt(cell.row, cell.col, pieceType, true);
    }

    this.phase = "spawning";
  }

  private getEmptyCellsAtTop(): Array<{ row: number; col: number }> {
    const result: Array<{ row: number; col: number }> = [];

    for (let col = 0; col < this.config.cols; col++) {
      for (let row = 0; row < this.config.rows; row++) {
        if (this.board[row][col].pieceType < 0) {
          result.push({ row, col });
        } else {
          break;
        }
      }
    }

    return result;
  }

  destroy(): void {
    this.clearSelection();
    
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        const cell = this.board[row]?.[col];
        if (cell?.entityId) {
          if (this.bridge) {
            this.bridge.destroyEntity(cell.entityId);
          }
          this.entityManager.destroyEntity(cell.entityId);
        }
      }
    }
  }

  getPhase(): Match3Phase {
    return this.phase;
  }

  isIdle(): boolean {
    return this.phase === "idle" || this.phase === "selected";
  }

  private hasValidMoves(): boolean {
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (col < this.config.cols - 1) {
          if (this.wouldCreateMatchAfterSwap(row, col, row, col + 1)) {
            return true;
          }
        }
        if (row < this.config.rows - 1) {
          if (this.wouldCreateMatchAfterSwap(row, col, row + 1, col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private wouldCreateMatchAfterSwap(
    row1: number,
    col1: number,
    row2: number,
    col2: number,
  ): boolean {
    const type1 = this.board[row1][col1].pieceType;
    const type2 = this.board[row2][col2].pieceType;

    if (type1 < 0 || type2 < 0 || type1 === type2) return false;

    this.board[row1][col1].pieceType = type2;
    this.board[row2][col2].pieceType = type1;

    const hasMatch =
      this.checkLineMatch(row1, col1) ||
      this.checkLineMatch(row2, col2);

    this.board[row1][col1].pieceType = type1;
    this.board[row2][col2].pieceType = type2;

    return hasMatch;
  }

  private checkLineMatch(row: number, col: number): boolean {
    const type = this.board[row][col].pieceType;
    if (type < 0) return false;

    let hCount = 1;
    for (let c = col - 1; c >= 0 && this.board[row][c].pieceType === type; c--) hCount++;
    for (let c = col + 1; c < this.config.cols && this.board[row][c].pieceType === type; c++) hCount++;

    let vCount = 1;
    for (let r = row - 1; r >= 0 && this.board[r][col].pieceType === type; r--) vCount++;
    for (let r = row + 1; r < this.config.rows && this.board[r][col].pieceType === type; r++) vCount++;

    return hCount >= this.MIN_MATCH || vCount >= this.MIN_MATCH;
  }
}
