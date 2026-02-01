import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { SlotMachineSystem, type SlotMachineConfig, type SlotMachinePhase, type SlotMachineCallbacks } from '../../slotMachine/SlotMachineSystem';

export interface SlotMachineSystemConfig extends SlotMachineConfig {}

export interface SlotMachineSystemState {
  phase: SlotMachinePhase;
  freeSpinsRemaining: number;
}

export class SlotMachineRuntimeSystem implements RuntimeSystem<SlotMachineSystemConfig, SlotMachineSystemState> {
  readonly id = 'slotMachine';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 90;
  
  private config: SlotMachineSystemConfig;
  private slotMachineSystem: SlotMachineSystem | null = null;
  private systemContext: SystemContext | null = null;
  
  constructor(config: SlotMachineSystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: SlotMachineSystemConfig): void {
    this.systemContext = ctx;
    
    const callbacks: SlotMachineCallbacks = {
      onSpinStart: () => {
        ctx.eventQueue.emit('slotMachine:spin_start', {});
      },
      onSpinComplete: (wins, totalPayout) => {
        ctx.eventQueue.emit('slotMachine:spin_complete', { wins, totalPayout });
      },
      onWinFound: (win) => {
        ctx.eventQueue.emit('slotMachine:win_found', { win });
      },
      onBonusTrigger: (bonusType) => {
        ctx.eventQueue.emit('slotMachine:bonus_trigger', { bonusType });
      },
      onCascadeComplete: () => {
        ctx.eventQueue.emit('slotMachine:cascade_complete', {});
      },
      onBoardReady: () => {
        ctx.eventQueue.emit('slotMachine:board_ready', {});
      },
      onFreeSpinStart: (remaining) => {
        ctx.eventQueue.emit('slotMachine:free_spin_start', { remaining });
      },
      onFreeSpinsComplete: () => {
        ctx.eventQueue.emit('slotMachine:free_spins_complete', {});
      },
      onPickReveal: (index, prize, isCollect) => {
        ctx.eventQueue.emit('slotMachine:pick_reveal', { index, prize, isCollect });
      },
      onPickBonusComplete: (totalPrize) => {
        ctx.eventQueue.emit('slotMachine:pick_bonus_complete', { totalPrize });
      },
    };
    
    this.slotMachineSystem = new SlotMachineSystem(
      this.config,
      ctx.entityManager,
      callbacks,
      ctx.eventBus
    );
    this.slotMachineSystem.setBridge(ctx.bridge);
    this.slotMachineSystem.initialize();
  }
  
  update(ctx: UpdateContext, _state: SlotMachineSystemState): void {
    if (!this.slotMachineSystem) return;
    
    this.slotMachineSystem.update(ctx.dt);
  }
  
  destroy(): void {
    this.slotMachineSystem?.destroy();
    this.slotMachineSystem = null;
    this.systemContext = null;
  }
  
  getState(): SlotMachineSystemState {
    if (!this.slotMachineSystem) {
      return { phase: 'idle', freeSpinsRemaining: 0 };
    }
    return {
      phase: this.slotMachineSystem.getPhase(),
      freeSpinsRemaining: this.slotMachineSystem.getFreeSpinsRemaining(),
    };
  }
  
  getSlotMachineSystem(): SlotMachineSystem | null {
    return this.slotMachineSystem;
  }
}
