import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { Match3GameSystem, type Match3Config, type Match3Phase } from '../../Match3GameSystem';

export interface Match3SystemConfig extends Match3Config {}

export interface Match3SystemState {
  phase: Match3Phase;
  selectedCell: { row: number; col: number } | null;
  cascadeCount: number;
}

export class Match3RuntimeSystem implements RuntimeSystem<Match3SystemConfig, Match3SystemState> {
  readonly id = 'match3';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 100;
  
  private config: Match3SystemConfig;
  private match3System: Match3GameSystem | null = null;
  private systemContext: SystemContext | null = null;
  
  constructor(config: Match3SystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: Match3SystemConfig): void {
    this.systemContext = ctx;
    
    this.match3System = new Match3GameSystem(
      this.config,
      ctx.entityManager,
      ctx.eventBus,
    );
    this.match3System.setBridge(ctx.bridge);
    this.match3System.initialize();
  }
  
  update(ctx: UpdateContext, _state: Match3SystemState): void {
    if (!this.match3System) return;
    
    const tap = ctx.input.tap;
    if (tap) {
      this.match3System.handleTap(tap.worldX, tap.worldY);
    }
    
    const mouse = ctx.input.mouse;
    if (mouse) {
      this.match3System.handleMouseMove(mouse.worldX, mouse.worldY);
    }
    
    this.match3System.update(ctx.dt);
  }
  
  destroy(): void {
    this.match3System?.destroy();
    this.match3System = null;
    this.systemContext = null;
  }
  
  getState(): Match3SystemState {
    if (!this.match3System) {
      return { phase: 'idle', selectedCell: null, cascadeCount: 0 };
    }
    return {
      phase: this.match3System.getPhase(),
      selectedCell: null,
      cascadeCount: 0,
    };
  }
  
  getMatch3System(): Match3GameSystem | null {
    return this.match3System;
  }
}
