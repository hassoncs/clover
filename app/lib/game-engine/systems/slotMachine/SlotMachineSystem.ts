import type { EntityManager } from "../../EntityManager";
import type { GodotBridge } from "../../../godot/types";
import {
  gridCellToWorld,
  getGlobalSlotRegistry,
  type AssetSheet,
  type EventBus,
  type SlotImplementation,
  type SlotMachineConfig,
  type PayoutConfig,
} from "@slopcade/shared";
import { registerSlotMachineSlotImplementations } from "./slots";

export type { SlotMachineConfig };

// Easing functions for smooth animations
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

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
  // Virtual position for scroll animation (offset in symbols)
  virtualPosition: number;
  // Current spin phase
  spinPhase: 'accelerating' | 'full_speed' | 'decelerating' | 'stopped';
  // When spin started (for acceleration phase)
  spinStartTime: number;
  // When to start decelerating (target stop time minus deceleration duration)
  decelerationStartTime: number;
  // Target final position when stopping (for snapping)
  targetPosition: number;
  // Time spent in full speed (for calculating remaining spin)
  fullSpeedTime: number;
}

export interface SlotMachineCallbacks {
  onSpinStart?: () => void;
  onSpinComplete?: (wins: SlotWin[], totalPayout: number) => void;
  onWinFound?: (win: SlotWin) => void;
  onBonusTrigger?: (bonusType: 'free_spins' | 'pick_bonus') => void;
  onCascadeComplete?: () => void;
  onBoardReady?: () => void;
  onFreeSpinStart?: (remaining: number) => void;
  onFreeSpinsComplete?: () => void;
  onPickReveal?: (index: number, prize: number, isCollect: boolean) => void;
  onPickBonusComplete?: (totalPrize: number) => void;
}

export interface PickBonusState {
  prizes: number[];
  revealed: boolean[];
  collectIndex: number;
  totalPrize: number;
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
  wildSymbolIndex?: number;
  scatterSymbolIndex?: number;
  payouts: PayoutConfig[];
}

interface Win {
  symbol: number;
  count: number;
  ways: number;
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
  private symbolEntityIds: string[][] = [];
  private phase: SlotMachinePhase = "idle";
  private currentBet = 0;
  private freeSpinsRemaining = 0;
  private pickBonusState: PickBonusState | null = null;
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

    this.SPIN_DURATION = (config.spinDuration ?? 2000) / 1000;
    this.REEL_STOP_DELAY = (config.reelStopDelay ?? 300) / 1000;

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
        virtualPosition: 0,
        spinPhase: 'stopped',
        spinStartTime: 0,
        decelerationStartTime: 0,
        targetPosition: 0,
        fullSpeedTime: 0,
      };
    }

    this.buildGridFromReels();
    this.createSymbolEntities();
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

  private createSymbolEntities(): void {
    this.symbolEntityIds = [];

    for (let row = 0; row < this.config.rows; row++) {
      this.symbolEntityIds[row] = [];
      for (let col = 0; col < this.config.reels; col++) {
        const symbolIndex = this.reels[col].symbols[row];
        const template = this.config.symbolTemplates[symbolIndex];

        const pos = this.getSymbolWorldPosition(col, row);

        let entityId: string;
        if (this.bridge) {
          entityId = this.bridge.spawnEntity(template, pos.x, pos.y);
        } else {
          entityId = `slot_${row}_${col}_${Date.now()}`;
        }

        this.entityManager.createEntity({
          id: entityId,
          name: `Symbol ${row},${col}`,
          template,
          transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
          tags: ["slot_symbol"],
        });

        this.symbolEntityIds[row][col] = entityId;
      }
    }
  }

  startSpin(bet: number = 1): boolean {
    console.log('[SlotMachine] startSpin called, phase:', this.phase);
    if (this.phase !== "idle") {
      return false;
    }

    if (bet <= 0) {
      bet = 1;
    }

    this.currentBet = bet;
    this.currentWins = [];
    this.totalPayout = 0;
    this.generateSpinTargets();

    if (this.freeSpinsRemaining > 0) {
      this.freeSpinsRemaining--;
      this.phase = "spinning";
    } else {
      this.phase = "spinning";
    }

    console.log('[SlotMachine] Spin started, new phase:', this.phase);
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
    // Duration of acceleration phase (0.2s)
    const ACCEL_DURATION = 0.2;
    // Duration of deceleration phase (0.5s)
    const DECEL_DURATION = 0.5;

    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      const reel = this.reels[reelIndex];
      // Staggered stop times - each reel stops REEL_STOP_DELAY seconds after the previous
      const reelStopTime = now + this.SPIN_DURATION + (reelIndex * this.REEL_STOP_DELAY);
      
      reel.spinPhase = 'accelerating';
      reel.spinStartTime = now;
      reel.decelerationStartTime = reelStopTime - DECEL_DURATION;
      reel.targetPosition = 0;
      reel.fullSpeedTime = 0;
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
    // Animation constants
    const ACCEL_DURATION = 0.2;
    const DECEL_DURATION = 0.5;
    const SPIN_VELOCITY = 25; // symbols per second at full speed
    
    let allStopped = true;

    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      const reel = this.reels[reelIndex];

      if (reel.spinPhase !== 'accelerating' && reel.spinPhase !== 'full_speed' && reel.spinPhase !== 'decelerating') {
        continue;
      }

      allStopped = false;

      // Check if it's time to start decelerating
      if (reel.spinPhase !== 'decelerating' && now >= reel.decelerationStartTime) {
        reel.spinPhase = 'decelerating';
      }

      // Calculate velocity based on phase
      let velocity = 0;
      
      switch (reel.spinPhase) {
        case 'accelerating': {
          // Ramp up velocity using easeOutQuad
          const elapsed = now - reel.spinStartTime;
          const t = Math.min(1, elapsed / ACCEL_DURATION);
          const easedT = easeOutQuad(t);
          velocity = easedT * SPIN_VELOCITY;
          
          if (t >= 1) {
            reel.spinPhase = 'full_speed';
          }
          break;
        }
        
        case 'full_speed':
          velocity = SPIN_VELOCITY;
          reel.fullSpeedTime += dt;
          break;
        
        case 'decelerating': {
          // Ease down to target with easeOutBack bounce
          const elapsed = now - reel.decelerationStartTime;
          const t = Math.min(1, elapsed / DECEL_DURATION);
          const easedT = easeOutBack(t);
          
          // Calculate remaining distance to target and interpolate
          const currentOffset = reel.virtualPosition % 1;
          const targetOffset = 0;
          const distance = currentOffset - targetOffset;
          
          // Move toward target with easing
          velocity = distance * (1 - easedT) * SPIN_VELOCITY * 2;
          
          if (t >= 1) {
            // Snap to exact target position
            reel.virtualPosition = Math.round(reel.virtualPosition);
            reel.spinPhase = 'stopped';
            reel.symbols = reel.targetSymbols;
            velocity = 0;
          }
          break;
        }
      }

      // Update virtual position
      reel.virtualPosition += velocity * dt;
    }

    if (allStopped) {
      console.log('[SlotMachine] All reels stopped, transitioning to evaluating');
      this.buildGridFromReels();
      this.updateSymbolTemplates();
      this.phase = "evaluating";
    }
  }

  private updateReelPositions(): void {
    for (let reelIndex = 0; reelIndex < this.config.reels; reelIndex++) {
      for (let row = 0; row < this.config.rows; row++) {
        const pos = this.getSymbolWorldPosition(reelIndex, row);
        const entityId = this.symbolEntityIds[row]?.[reelIndex];

        if (entityId) {
          const entity = this.entityManager.getEntity(entityId);
          if (entity) {
            entity.transform.x = pos.x;
            entity.transform.y = pos.y;

            if (this.bridge) {
              this.bridge.setPosition(entityId, pos.x, pos.y);
            }
          }
        }
      }
    }
  }

  private updateSymbolTemplates(): void {
    console.log('[SlotMachine] updateSymbolTemplates called');
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.reels; col++) {
        const symbolIndex = this.grid[row][col];
        const template = this.config.symbolTemplates[symbolIndex];
        const entityId = this.symbolEntityIds[row]?.[col];

        if (entityId && this.bridge) {
          const pos = this.getSymbolWorldPosition(col, row);

          // Destroy old entity
          this.bridge.destroyEntity(entityId);
          this.entityManager.destroyEntity(entityId);

          // Create new entity with updated symbol
          const newEntityId = this.bridge.spawnEntity(template, pos.x, pos.y);

          this.entityManager.createEntity({
            id: newEntityId,
            name: `Symbol ${row},${col}`,
            template,
            transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
            tags: ["slot_symbol"],
          });

          this.symbolEntityIds[row][col] = newEntityId;
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
     console.log('[SlotMachine] Grid state:', JSON.stringify(this.grid));
     const wins = this.detectWins();

    if (wins.length > 0) {
      let totalPayout = 0;
      for (const win of wins) {
        totalPayout += win.payout;
        this.callbacks.onWinFound?.(win);
      }

      this.currentWins = this.currentWins.concat(wins);
      this.totalPayout += totalPayout;

      if (this.config.cascading) {
        this.winPositions = this.getUniquePositions(wins);
        this.cascadePhase = 'removing';
        this.cascadeTimer = this.REMOVE_DURATION;
        this.phase = 'cascading';
      } else {
        this.phase = 'awarding';
        this.phaseTimer = 0.5;
      }
    } else {
      // Check for bonus trigger
      if (this.shouldTriggerBonus()) {
        // Check if we're already in free spins mode (retrigger case)
        if (this.phase === 'bonus_free_spins') {
          this.triggerFreeSpins();
        }
        this.enterBonusMode();
      } else if (this.phase === 'bonus_free_spins') {
        // Returning from a free spin with no win and no retrigger
        if (this.freeSpinsRemaining > 0) {
          // Continue free spinning
          this.freeSpinsRemaining--;
          this.generateSpinTargets();
          this.phase = 'spinning';
          this.startReelAnimations();
          this.callbacks.onSpinStart?.();
        } else {
          // Free spins exhausted
          this.phase = 'idle';
          this.callbacks.onFreeSpinsComplete?.();
        }
       } else {
         this.phase = 'idle';
         this.callbacks.onSpinComplete?.(this.currentWins, this.totalPayout);
       }
    }
  }

  private getUniquePositions(wins: SlotWin[]): Array<{ row: number; col: number }> {
    const seen = new Set<string>();
    const result: Array<{ row: number; col: number }> = [];

    for (const win of wins) {
      for (const pos of win.positions) {
        const key = `${pos.row},${pos.col}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(pos);
        }
      }
    }

    return result;
  }

   private detectWins(): SlotWin[] {
     if (this.winDetectionImpl) {
       const input = {
         grid: this.grid,
         rows: this.config.rows,
         cols: this.config.reels,
         symbolCount: this.config.symbolTemplates.length,
         wildSymbolIndex: this.config.wildSymbolIndex,
         scatterSymbolIndex: this.config.scatterSymbolIndex,
         payouts: this.config.payouts,
       };
       console.log('[SlotMachine] Win detection input:', JSON.stringify(input));
       const wins = this.winDetectionImpl.run(null, input);
       console.log('[SlotMachine] Wins found:', JSON.stringify(wins));

       return wins.map((win) => ({
         symbol: win.symbol,
         count: win.count,
         ways: win.ways,
         positions: win.positions,
         payout: win.payout,
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

  private countScatters(): number {
    if (this.config.scatterSymbolIndex === undefined) {
      return 0;
    }

    let count = 0;
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.reels; col++) {
        if (this.grid[row]?.[col] === this.config.scatterSymbolIndex) {
          count++;
        }
      }
    }
    return count;
  }

  private triggerFreeSpins(): void {
    if (!this.config.freeSpins) return;

    const scatterCount = this.countScatters();
    if (scatterCount < 3) return;

    const spinsToAward = this.config.freeSpins.scatterCount[scatterCount - 3] ?? 10;
    this.freeSpinsRemaining += spinsToAward;
    this.callbacks.onFreeSpinStart?.(this.freeSpinsRemaining);
  }

  private countBonusSymbols(): number {
    if (this.config.pickBonus === undefined) {
      return 0;
    }

    const bonusTrigger = this.config.pickBonus.trigger;
    if (bonusTrigger === 'bonus') {
      if (this.config.scatterSymbolIndex === undefined) {
        return 0;
      }

      let count = 0;
      for (let row = 0; row < this.config.rows; row++) {
        for (let col = 0; col < this.config.reels; col++) {
          if (this.grid[row]?.[col] === this.config.scatterSymbolIndex) {
            count++;
          }
        }
      }
      return count;
    }

    return 0;
  }

  private triggerPickBonus(): void {
    const config = this.config.pickBonus!;
    const totalItems = config.gridRows * config.gridCols;

    const prizes: number[] = [];
    const collectIndex = Math.floor(Math.random() * totalItems);

    for (let i = 0; i < totalItems; i++) {
      if (i === collectIndex) {
        prizes.push(-1);
      } else {
        prizes.push(Math.floor(Math.random() * 100) + 10);
      }
    }

    this.pickBonusState = {
      prizes,
      revealed: new Array(totalItems).fill(false),
      collectIndex,
      totalPrize: 0,
    };

    this.phase = "bonus_pick";
    this.callbacks.onBonusTrigger?.('pick_bonus');
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
      this.triggerPickBonus();
    }
  }

  private currentWins: SlotWin[] = [];
  private totalPayout = 0;

  private finishAwarding(): void {
    this.eventBus?.emit("slotMachine:spin_complete", {
      wins: this.currentWins,
      totalPayout: this.totalPayout,
    });

    // Check for bonus trigger
    if (this.shouldTriggerBonus()) {
      // Check if we're already in free spins mode (retrigger case)
      if (this.phase === 'bonus_free_spins') {
        this.triggerFreeSpins();
      }
      this.enterBonusMode();
    } else if (this.phase === 'bonus_free_spins') {
      // Returning from a free spin with a win
      if (this.freeSpinsRemaining > 0) {
        // Continue free spinning
        this.freeSpinsRemaining--;
        this.generateSpinTargets();
        this.phase = 'spinning';
        this.startReelAnimations();
        this.callbacks.onSpinStart?.();
      } else {
        // Free spins exhausted
        this.phase = 'idle';
        this.callbacks.onFreeSpinsComplete?.();
      }
    } else {
      this.phase = "idle";
      this.callbacks.onSpinComplete?.(this.currentWins, this.totalPayout);
    }
  }

  private cascadePhase: 'removing' | 'dropping' | 'spawning' | 'settling' = 'removing';
  private winPositions: Array<{ row: number; col: number }> = [];
  private cascadeTimer = 0;
  private isCascading = false;

  private readonly REMOVE_DURATION = 0.3;
  private readonly DROP_DURATION = 0.2;
  private readonly SPAWN_DURATION = 0.1;
  private readonly SETTLE_DURATION = 0.1;

  private updateCascading(dt: number): void {
    this.cascadeTimer -= dt;
    if (this.cascadeTimer > 0) return;

    switch (this.cascadePhase) {
      case 'removing':
        this.removeWinningSymbols();
        this.cascadePhase = 'dropping';
        this.cascadeTimer = this.DROP_DURATION;
        break;

      case 'dropping':
        this.dropSymbols();
        this.cascadePhase = 'spawning';
        this.cascadeTimer = this.SPAWN_DURATION;
        break;

      case 'spawning':
        this.spawnNewSymbols();
        this.cascadePhase = 'settling';
        this.cascadeTimer = this.SETTLE_DURATION;
        break;

      case 'settling':
        this.buildGridFromReels();
        this.phase = 'evaluating';
        break;
    }
  }

  private removeWinningSymbols(): void {
    for (const pos of this.winPositions) {
      this.grid[pos.row][pos.col] = -1;
      this.reels[pos.col].symbols[pos.row] = -1;
    }
  }

  private dropSymbols(): void {
    for (let col = 0; col < this.config.reels; col++) {
      const column: number[] = [];
      for (let row = this.config.rows - 1; row >= 0; row--) {
        if (this.grid[row][col] !== -1) {
          column.push(this.grid[row][col]);
        }
      }
      for (let row = this.config.rows - 1; row >= 0; row--) {
        const idx = this.config.rows - 1 - row;
        this.grid[row][col] = column[idx] ?? -1;
        this.reels[col].symbols[row] = this.grid[row][col];
      }
    }
  }

  private spawnNewSymbols(): void {
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.reels; col++) {
        if (this.grid[row][col] === -1) {
          const newSymbol = this.selectSymbol(col, row);
          this.grid[row][col] = newSymbol;
          this.reels[col].symbols[row] = newSymbol;
        }
      }
    }
  }

  private updateFreeSpins(dt: number): void {
    // Check for retrigger during free spins
    if (this.shouldTriggerBonus()) {
      this.triggerFreeSpins();
    }

    if (this.freeSpinsRemaining > 0) {
      // Auto-spin: decrement counter and start new spin
      this.freeSpinsRemaining--;
      this.generateSpinTargets();
      this.phase = "spinning";
      this.startReelAnimations();
      this.callbacks.onSpinStart?.();
    } else {
      // No more free spins, return to idle
      this.phase = "idle";
      this.callbacks.onFreeSpinsComplete?.();
    }
  }

  private updatePickBonus(dt: number): void {
  }

  public handlePickSelection(index: number): boolean {
    if (this.phase !== "bonus_pick" || !this.pickBonusState) {
      return false;
    }

    if (this.pickBonusState.revealed[index]) {
      return false;
    }

    this.pickBonusState.revealed[index] = true;
    const prize = this.pickBonusState.prizes[index];

    if (prize === -1) {
      this.callbacks.onPickReveal?.(index, 0, true);
      this.completePickBonus();
      return true;
    }

    this.pickBonusState.totalPrize += prize;
    this.callbacks.onPickReveal?.(index, prize, false);

    if (this.pickBonusState.revealed.every(r => r)) {
      this.completePickBonus();
    }

    return true;
  }

  private completePickBonus(): void {
    const total = this.pickBonusState?.totalPrize ?? 0;
    this.callbacks.onPickBonusComplete?.(total);
    this.pickBonusState = null;
    this.phase = "idle";
  }

  destroy(): void {
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.reels; col++) {
        const entityId = this.symbolEntityIds[row]?.[col];
        if (entityId) {
          if (this.bridge) {
            this.bridge.destroyEntity(entityId);
          }
          this.entityManager.destroyEntity(entityId);
        }
      }
    }
  }

  getPhase(): SlotMachinePhase {
    return this.phase;
  }

  isIdle(): boolean {
    console.log('[SlotMachine] isIdle called, phase:', this.phase, 'result:', this.phase === "idle");
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

  getPickBonusState(): PickBonusState | null {
    return this.pickBonusState;
  }
}
