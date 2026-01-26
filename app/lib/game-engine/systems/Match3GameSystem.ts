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
  type AssetSheet,
  type Match3Config,
  type GridConfig,
} from "@slopcade/shared";

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

export class Match3GameSystem {
  private config: Match3Config;
  private gridConfig: GridConfig;
  private entityManager: EntityManager;
  private bridge: GodotBridge | null = null;
  private callbacks: Match3Callbacks;
  private sheetMetadata: AssetSheet | null = null;

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

  private highlightEntityId: string | null = null;
  private hoverEntityId: string | null = null;

  private readonly MIN_MATCH: number;
  private readonly SWAP_DURATION: number;
  private readonly FALL_DURATION: number;
  private readonly CLEAR_DELAY: number;

  constructor(
    config: Match3Config,
    entityManager: EntityManager,
    callbacks: Match3Callbacks = {},
  ) {
    this.config = config;
    this.gridConfig = gridConfigFromMatch3(config);
    this.entityManager = entityManager;
    this.callbacks = callbacks;

    this.MIN_MATCH = config.minMatch ?? 3;
    this.SWAP_DURATION = config.swapDuration ?? 0.15;
    this.FALL_DURATION = config.fallDuration ?? 0.1;
    this.CLEAR_DELAY = config.clearDelay ?? 0.1;
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
      this.selectedCell = { row, col };
      this.phase = "selected";
      this.showHighlight(row, col);
    } else {
      if (this.selectedCell.row === row && this.selectedCell.col === col) {
        this.selectedCell = null;
        this.phase = "idle";
        this.hideHighlight();
      } else if (gridIsAdjacent(this.selectedCell, { row, col })) {
        this.startSwap(this.selectedCell, { row, col });
      } else {
        this.selectedCell = { row, col };
        this.showHighlight(row, col);
      }
    }
  }

  handleMouseMove(worldX: number, worldY: number): void {
    if (this.phase !== "idle" && this.phase !== "selected") {
      this.hideHoverHighlight();
      return;
    }

    const cell = this.worldToCellPos(worldX, worldY);
    if (!cell) {
      this.hideHoverHighlight();
      return;
    }

    const { row, col } = cell;
    const boardCell = this.board[row]?.[col];

    if (!boardCell?.entityId) {
      this.hideHoverHighlight();
      return;
    }

    if (this.hoverCell?.row !== row || this.hoverCell?.col !== col) {
      this.hoverCell = { row, col };
      this.showHoverHighlight(row, col);
    }
  }

  private showHoverHighlight(row: number, col: number): void {
    const pos = this.cellToWorldPos(row, col);

    if (!this.hoverEntityId) {
      let id: string;

      if (this.bridge) {
        id = this.bridge.spawnEntity("hover_highlight", pos.x, pos.y);
      } else {
        id = `match3_hover_${Date.now()}`;
      }

      this.entityManager.createEntity({
        id,
        name: "Hover Highlight",
        template: "hover_highlight",
        transform: {
          x: pos.x,
          y: pos.y,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
        layer: 9,
        tags: ["match3_ui"],
      });
      this.hoverEntityId = id;
    } else {
      const entity = this.entityManager.getEntity(this.hoverEntityId);
      if (entity) {
        entity.transform.x = pos.x;
        entity.transform.y = pos.y;
        if (this.bridge) {
          this.bridge.setPosition(this.hoverEntityId, pos.x, pos.y);
        }
      }
    }
  }

  private hideHoverHighlight(): void {
    this.hoverCell = null;
    if (this.hoverEntityId) {
      const entity = this.entityManager.getEntity(this.hoverEntityId);
      if (entity) {
        entity.transform.x = -1000;
        entity.transform.y = -1000;
        if (this.bridge) {
          this.bridge.setPosition(this.hoverEntityId, -1000, -1000);
        }
      }
    }
  }

  private showHighlight(row: number, col: number): void {
    const pos = this.cellToWorldPos(row, col);

    if (!this.highlightEntityId) {
      let id: string;

      if (this.bridge) {
        id = this.bridge.spawnEntity("selection_highlight", pos.x, pos.y);
      } else {
        id = `match3_highlight_${Date.now()}`;
      }

      this.entityManager.createEntity({
        id,
        name: "Selection Highlight",
        template: "selection_highlight",
        transform: {
          x: pos.x,
          y: pos.y,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
        layer: 10,
        tags: ["match3_ui"],
      });
      this.highlightEntityId = id;
    } else {
      const entity = this.entityManager.getEntity(this.highlightEntityId);
      if (entity) {
        entity.transform.x = pos.x;
        entity.transform.y = pos.y;
        if (this.bridge) {
          this.bridge.setPosition(this.highlightEntityId, pos.x, pos.y);
        }
      }
    }
  }

  private hideHighlight(): void {
    if (this.highlightEntityId) {
      const entity = this.entityManager.getEntity(this.highlightEntityId);
      if (entity) {
        entity.transform.x = -1000;
        entity.transform.y = -1000;
        if (this.bridge) {
          this.bridge.setPosition(this.highlightEntityId, -1000, -1000);
        }
      }
    }
    this.hideHoverHighlight();
  }

  private startSwap(
    a: { row: number; col: number },
    b: { row: number; col: number },
  ): void {
    this.phase = "swapping";
    this.swapCells = { a, b };
    this.hideHighlight();
    this.selectedCell = null;
    this.cascadeCount = 0;
    this.totalClearedThisTurn = 0;

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
    const matches = this.findMatches();

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

      this.swapCells = null;
      this.phase = "idle";

      return;
    }

    this.cascadeCount++;
    const uniqueCells = this.getUniqueCells(matches);

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

    const points = uniqueCells.length * 10 * this.cascadeCount;
    this.callbacks.onScoreAdd?.(points);
    this.callbacks.onMatchFound?.(uniqueCells.length, this.cascadeCount);

    this.phase = "clearing";
    this.phaseTimer = this.CLEAR_DELAY;
  }

  private findMatches(): Array<Array<{ row: number; col: number }>> {
    const matches: Array<Array<{ row: number; col: number }>> = [];

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
            matches.push(cells);
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
            matches.push(cells);
          }
          runStart = row;
          runType = currentType;
        }
      }
    }

    return matches;
  }

  private getUniqueCells(
    matches: Array<Array<{ row: number; col: number }>>,
  ): Array<{ row: number; col: number }> {
    const seen = new Set<string>();
    const result: Array<{ row: number; col: number }> = [];

    for (const match of matches) {
      for (const cell of match) {
        const key = `${cell.row},${cell.col}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(cell);
        }
      }
    }

    return result;
  }

  private performClearing(): void {
    const matches = this.findMatches();
    const cellsToClear = this.getUniqueCells(matches);

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

    if (this.highlightEntityId) {
      if (this.bridge) {
        this.bridge.destroyEntity(this.highlightEntityId);
      }
      this.entityManager.destroyEntity(this.highlightEntityId);
    }

    if (this.hoverEntityId) {
      if (this.bridge) {
        this.bridge.destroyEntity(this.hoverEntityId);
      }
      this.entityManager.destroyEntity(this.hoverEntityId);
    }
  }

  getPhase(): Match3Phase {
    return this.phase;
  }

  isIdle(): boolean {
    return this.phase === "idle" || this.phase === "selected";
  }
}
