import type { EntityManager } from "../../EntityManager";
import type { GodotBridge } from "../../../godot/types";
import {
  gridCellToWorld,
  getGlobalSlotRegistry,
  type AssetSheet,
  type EventBus,
  type SlotImplementation,
  type SlotMachineConfig,
} from "@slopcade/shared";
import { registerSlotMachineSlotImplementations } from "./slots";

export type { SlotMachineConfig };

export type SlotMachinePhase =
  | "idle"
  | "spinning"
  | "evaluating"
  | "awarding"
  | "cascading"
  | "bonus_free_spins"
  | "bonus_pick";

export interface ReelState {
  symbols: number[];
  targetSymbols: number[];
  position: number;
  isSpinning: boolean;
  stopTime?: number;
}

export interface SlotMachineCallbacks {
  onSpinStart?: () => void;
  onSpinComplete?: (wins: SlotWin[], totalPayout: number) => void;
  onWinFound?: (win: SlotWin) => void;
  onBonusTrigger?: (bonusType: 'free_spins' | 'pick_bonus') => void;
  onCascadeComplete?: () => void;
  onBoardReady?: () => void;
}

interface SlotWin {
  symbol: number;
  count: number;
  positions: Array<{ row: number; col: number }>;
  payout: number;
}

interface SymbolWeightingInput {
  reelIndex: number;
  positionIndex: number;
  symbolCount: number;
  weights?: number[];
}

type SymbolWeightingOutput = number;

interface WinDetectionInput {
  grid: number[][];
  rows: number;
  cols: number;
  symbolCount: number;
  paylines?: number[][];
}

interface Win {
  symbol: number;
  count: number;
  positions: Array<{ row: number; col: number }>;
  payout: number;
}

type WinDetectionOutput = Win[];

interface PayoutCalculationInput {
  wins: Win;
  basePayout: number;
  betMultiplier: number;
}

type PayoutCalculationOutput = number;

export class SlotMachineSystem {
  private config: SlotMachineConfig;
  private entityManager: EntityManager;
  private bridge: GodotBridge | null = null;
  private callbacks: SlotMachineCallbacks;
  private sheetMetadata: AssetSheet | null = null;
  private eventBus: EventBus | null = null;

  private reels: ReelState[] = [];
  private grid: number[][] = [];
  private phase: SlotMachinePhase = "idle";
  private currentBet = 0;
  private freeSpinsRemaining = 0;
  private pickBonusSelections: number[] = [];
  private phaseTimer = 0;

  private readonly SPIN_DURATION: number;
  private readonly REEL_STOP_DELAY: number;

  private symbolWeightingImpl: SlotImplementation<SymbolWeightingInput, SymbolWeightingOutput> | null = null;
  private winDetectionImpl: SlotImplementation<WinDetectionInput, WinDetectionOutput> | null = null;
  private payoutCalculationImpl: SlotImplementation<PayoutCalculationInput, PayoutCalculationOutput> | null = null;

  constructor(
    config: SlotMachineConfig,
    entityManager: EntityManager,
    callbacks: SlotMachineCallbacks = {},
    eventBus?: EventBus,
  ) {
    this.config = config;
    this.entityManager = entityManager;
    this.callbacks = callbacks;
    this.eventBus = eventBus ?? null;

    this.SPIN_DURATION = config.spinDuration ?? 2.0;
    this.REEL_STOP_DELAY = config.reelStopDelay ?? 0.3;

    registerSlotMachineSlotImplementations();
    const registry = getGlobalSlotRegistry();

    const symbolWeightingId = 'uniform_weighting';
    const symbolWeightingImpl = registry.get(symbolWeightingId);
    if (symbolWeightingImpl) {
      this.symbolWeightingImpl = symbolWeightingImpl as SlotImplementation<SymbolWeightingInput, SymbolWeightingOutput>;
    }

    const winDetectionId = 'all_ways_win';
    const winDetectionImpl = registry.get(winDetectionId);
    if (winDetectionImpl) {
      this.winDetectionImpl = winDetectionImpl as SlotImplementation<WinDetectionInput, WinDetectionOutput>;
    }

    const payoutCalculationId = 'standard_payout';
    const payoutCalculationImpl = registry.get(payoutCalculationId);
    if (payoutCalculationImpl) {
      this.payoutCalculationImpl = payoutCalculationImpl as SlotImplementation<PayoutCalculationInput, PayoutCalculationOutput>;
    }
  }

  setBridge(bridge: GodotBridge): void {
    this.bridge = bridge;
  }

  setSheetMetadata(metadata: AssetSheet): void {
    this.sheetMetadata = metadata;
  }

  initialize(): void {
    this.reels = [];
    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      const symbols: number[] = [];
      for (let row = 0; row < this.config.rows; row++) {
        const symbolIndex = this.selectSymbol(reelIndex, row);
        symbols.push(symbolIndex);
      }

      this.reels[reelIndex] = {
        symbols,
        targetSymbols: [...symbols],
        position: 0,
        isSpinning: false,
      };
    }

    this.buildGridFromReels();
    this.phase = "idle";
    this.callbacks.onBoardReady?.();
  }

  private selectSymbol(reelIndex: number, positionIndex: number): number {
    if (this.symbolWeightingImpl) {
      return this.symbolWeightingImpl.run(null, {
        reelIndex,
        positionIndex,
        symbolCount: this.config.symbolTemplates.length,
      });
    }

    return Math.floor(Math.random() * this.config.symbolTemplates.length);
  }

  private buildGridFromReels(): void {
    this.grid = [];
    for (let row = 0; row < this.config.rows; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.config.reels; col++) {
        this.grid[row][col] = this.reels[col].symbols[row];
      }
    }
  }

  startSpin(bet: number = 1): boolean {
    if (this.phase !== "idle") {
      return false;
    }

    if (bet <= 0) {
      bet = 1;
    }

    this.currentBet = bet;
    this.generateSpinTargets();

    if (this.freeSpinsRemaining > 0) {
      this.freeSpinsRemaining--;
      this.phase = "spinning";
    } else {
      this.phase = "spinning";
    }

    this.startReelAnimations();
    this.callbacks.onSpinStart?.();

    return true;
  }

  private generateSpinTargets(): void {
    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      const targetSymbols: number[] = [];
      for (let row = 0; row < this.config.rows; row++) {
        targetSymbols.push(this.selectSymbol(reelIndex, row));
      }
      this.reels[reelIndex].targetSymbols = targetSymbols;
    }
  }

  private startReelAnimations(): void {
    const now = Date.now() / 1000;

    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      this.reels[reelIndex].isSpinning = true;
      this.reels[reelIndex].stopTime = now + this.SPIN_DURATION + (reelIndex * this.REEL_STOP_DELAY);
    }
  }

  update(dt: number): void {
    switch (this.phase) {
      case "spinning":
        this.updateSpinning(dt);
        break;

      case "evaluating":
        this.evaluateSpin();
        break;

      case "awarding":
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) {
          this.finishAwarding();
        }
        break;

      case "cascading":
        this.updateCascading(dt);
        break;

      case "bonus_free_spins":
        this.updateFreeSpins(dt);
        break;

      case "bonus_pick":
        this.updatePickBonus(dt);
        break;
    }

    this.updateReelPositions();
  }

  private updateSpinning(dt: number): void {
    const now = Date.now() / 1000;
    let allStopped = true;

    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      const reel = this.reels[reelIndex];

      if (reel.isSpinning) {
        if (reel.stopTime && now >= reel.stopTime) {
          reel.isSpinning = false;
          reel.symbols = reel.targetSymbols;
          reel.position = 0;
        } else {
          allStopped = false;
          reel.position += dt * 20;
        }
      }
    }

    if (allStopped) {
      this.buildGridFromReels();
      this.phase = "evaluating";
    }
  }

  private updateReelPositions(): void {
    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      const reel = this.reels[reelIndex];

      for (let row = 0; row < this.config.rows; row++) {
        const symbolIndex = reel.symbols[row];
        const pos = this.getSymbolWorldPosition(reelIndex, row);

        const entityId = this.getEntityId(reelIndex, row);
        const entity = this.entityManager.getEntity(entityId);
        if (entity) {
          entity.transform.x = pos.x;
          entity.transform.y = pos.y + (reel.isSpinning ? reel.position : 0);

          if (this.bridge) {
            this.bridge.setPosition(entityId, pos.x, pos.y + (reel.isSpinning ? reel.position : 0));
          }
        }
      }
    }
  }

  private getSymbolWorldPosition(reelIndex: number, row: number): { x: number; y: number } {
    const startX = -((this.config.reels - 1) * this.config.cellSize) / 2;
    const startY = -((this.config.rows - 1) * this.config.cellSize) / 2;

    return {
      x: startX + (reelIndex * this.config.cellSize),
      y: startY + (row * this.config.cellSize),
    };
  }

  private getEntityId(reelIndex: number, row: number): string {
    return `slot_${reelIndex}_${row}`;
  }

  private evaluateSpin(): void {
    const wins = this.detectWins();

    if (wins.length > 0) {
      let totalPayout = 0;
      for (const win of wins) {
        totalPayout += win.payout;
        this.callbacks.onWinFound?.(win);
      }

      this.currentWins = wins;
      this.totalPayout = totalPayout;

      if (this.config.cascading) {
        this.phase = "cascading";
      } else {
        this.phase = "awarding";
        this.phaseTimer = 0.5;
      }
    } else {
      this.currentWins = [];
      this.totalPayout = 0;

      if (this.shouldTriggerBonus()) {
        this.enterBonusMode();
      } else {
        this.phase = "idle";
        this.callbacks.onSpinComplete?.([], 0);
      }
    }
  }

  private detectWins(): SlotWin[] {
    if (this.winDetectionImpl) {
      const wins = this.winDetectionImpl.run(null, {
        grid: this.grid,
        rows: this.config.rows,
        cols: this.config.reels,
        symbolCount: this.config.symbolTemplates.length,
      });

      return wins.map((win) => ({
        symbol: win.symbol,
        count: win.count,
        positions: win.positions,
        payout: this.calculatePayout(win),
      }));
    }

    return this.detectWinsLegacy();
  }

  private detectWinsLegacy(): SlotWin[] {
    const wins: SlotWin[] = [];

    for (let symbol = 0; symbol < this.config.symbolTemplates.length; symbol++) {
      let count = 0;
      const positions: Array<{ row: number; col: number }> = [];

      for (let row = 0; row < this.config.rows; row++) {
        for (let col = 0; col < this.config.reels; col++) {
          if (this.grid[row]?.[col] === symbol) {
            count++;
            positions.push({ row, col });
          }
        }
      }

      if (count >= 3) {
        const payout = this.calculatePayoutLegacy(symbol, count);
        if (payout > 0) {
          wins.push({ symbol, count, positions, payout });
        }
      }
    }

    return wins;
  }

  private calculatePayout(win: Win): number {
    if (this.payoutCalculationImpl) {
      return this.payoutCalculationImpl.run(null, {
        wins: win,
        basePayout: 10,
        betMultiplier: this.currentBet,
      });
    }

    return this.calculatePayoutLegacy(win.symbol, win.count);
  }

  private calculatePayoutLegacy(symbol: number, count: number): number {
    const basePayouts: Record<number, number[]> = {
      0: [0, 0, 10, 25, 50],
      1: [0, 0, 5, 15, 30],
      2: [0, 0, 5, 15, 30],
      3: [0, 0, 2, 10, 20],
      4: [0, 0, 2, 10, 20],
      5: [0, 0, 2, 5, 10],
    };

    const payouts = basePayouts[symbol] ?? [0, 0, 2, 5, 10];
    const index = Math.min(count, 4) - 1;
    return (payouts[index] ?? 0) * this.currentBet;
  }

  private shouldTriggerBonus(): boolean {
    if (this.config.scatterSymbolIndex === undefined) {
      return false;
    }

    let scatterCount = 0;
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.reels; col++) {
        if (this.grid[row]?.[col] === this.config.scatterSymbolIndex) {
          scatterCount++;
        }
      }
    }

    return scatterCount >= 3;
  }

  private enterBonusMode(): void {
    if (this.config.freeSpins) {
      const scatterConfig = this.config.freeSpins.scatterCount;
      let scatterCount = 0;
      for (let row = 0; row < this.config.rows; row++) {
        for (let col = 0; col < this.config.reels; col++) {
          if (this.grid[row]?.[col] === this.config.scatterSymbolIndex) {
            scatterCount++;
          }
        }
      }

      if (scatterCount >= 3 && scatterCount <= 5) {
        this.freeSpinsRemaining = scatterConfig[scatterCount - 3] ?? 10;
      } else {
        this.freeSpinsRemaining = 10;
      }

      this.phase = "bonus_free_spins";
      this.callbacks.onBonusTrigger?.('free_spins');
    } else if (this.config.pickBonus) {
      this.pickBonusSelections = [];
      this.phase = "bonus_pick";
      this.callbacks.onBonusTrigger?.('pick_bonus');
    }
  }

  private currentWins: SlotWin[] = [];
  private totalPayout = 0;

  private finishAwarding(): void {
    this.eventBus?.emit("slotMachine:spin_complete", {
      wins: this.currentWins,
      totalPayout: this.totalPayout,
    });

    if (this.shouldTriggerBonus()) {
      this.enterBonusMode();
    } else {
      this.phase = "idle";
      this.callbacks.onSpinComplete?.(this.currentWins, this.totalPayout);
    }
  }

  private cascadeStep = 0;

  private updateCascading(dt: number): void {
    if (this.cascadeStep >= 3) {
      this.phase = "awarding";
      this.phaseTimer = 0.5;
      this.callbacks.onCascadeComplete?.();
      return;
    }

    this.cascadeStep++;
    this.shiftSymbolsDown();
    this.fillTopSymbols();
    this.buildGridFromReels();

    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0) {
      this.phaseTimer = 0.1;
    }
  }

  private shiftSymbolsDown(): void {
    for (let col = 0; col < this.config.reels; col++) {
      let writeRow = this.config.rows - 1;

      for (let row = this.config.rows - 1; row >= 0; row--) {
        if (this.grid[row]?.[col] !== -1) {
          if (row !== writeRow) {
            this.grid[writeRow][col] = this.grid[row][col];
            this.grid[row][col] = -1;
          }
          writeRow--;
        }
      }
    }
  }

  private fillTopSymbols(): void {
    for (let col = 0; col < this.config.reels; col++) {
      for (let row = 0; row < this.config.rows; row++) {
        if (this.grid[row]?.[col] === -1) {
          this.grid[row][col] = this.selectSymbol(col, row);
        }
      }
    }
  }

  private updateFreeSpins(dt: number): void {
    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0) {
      this.phaseTimer = 0.1;
    }

    if (this.freeSpinsRemaining <= 0) {
      this.phase = "idle";
    }
  }

  private updatePickBonus(dt: number): void {
    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0) {
      this.phaseTimer = 0.1;
    }

    const pickCount = this.config.pickBonus?.gridRows ?? 3;
    if (this.pickBonusSelections.length >= pickCount) {
      this.phase = "idle";
    }
  }

  makePick(selectionIndex: number): void {
    if (this.phase !== "bonus_pick") {
      return;
    }

    this.pickBonusSelections.push(selectionIndex);

    const pickCount = this.config.pickBonus?.gridRows ?? 3;
    if (this.pickBonusSelections.length >= pickCount) {
      this.phase = "idle";
    }
  }

  destroy(): void {
    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      for (let row = 0; row < this.config.rows; row++) {
        const entityId = this.getEntityId(reelIndex, row);
        if (this.bridge) {
          this.bridge.destroyEntity(entityId);
        }
        this.entityManager.destroyEntity(entityId);
      }
    }
  }

  getPhase(): SlotMachinePhase {
    return this.phase;
  }

  isIdle(): boolean {
    return this.phase === "idle";
  }

  getFreeSpinsRemaining(): number {
    return this.freeSpinsRemaining;
  }

  getCurrentBet(): number {
    return this.currentBet;
  }

  getReelState(reelIndex: number): ReelState | null {
    return this.reels[reelIndex] ?? null;
  }

  getGrid(): number[][] {
    return this.grid.map((row) => [...row]);
  }
}
