import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { ComputedValueSystem } from '@slopcade/shared';

export interface ComputedValuesSystemConfig {
  /** The ComputedValueSystem instance to use. Required - no fallback creation. */
  system: ComputedValueSystem;
}

export interface ComputedValuesSystemState {
  compiledCount: number;
}

/**
 * RuntimeSystem wrapper for ComputedValueSystem.
 * 
 * Manages expression compilation and evaluation for dynamic game properties.
 * Expressions are evaluated on-demand when systems request values, not per-frame.
 * 
 * Phase: PRE_UPDATE (runs early to prepare expression system)
 * Priority: 80 (after viewport and property sync)
 */
export class ComputedValuesRuntimeSystem implements RuntimeSystem<ComputedValuesSystemConfig, ComputedValuesSystemState> {
  readonly id = 'computed-values';
  readonly phase = SystemPhase.PRE_UPDATE;
  readonly priority = 80;
  
  private config: ComputedValuesSystemConfig;
  private system: ComputedValueSystem | null = null;
  
  constructor(config: ComputedValuesSystemConfig) {
    this.config = config;
  }
  
  initialize(_ctx: SystemContext, _config: ComputedValuesSystemConfig): void {
    this.system = this.config.system;
  }
  
  update(_ctx: UpdateContext, _state: ComputedValuesSystemState): void {
    // Expressions are evaluated on-demand, no per-frame update needed
  }
  
  destroy(): void {
    if (this.system) {
      this.system.clearCache();
      this.system = null;
    }
  }
  
  getState(): ComputedValuesSystemState {
    if (!this.system) {
      return { compiledCount: 0 };
    }
    return {
      compiledCount: this.system.getCompiledCount(),
    };
  }
  
  getSystem(): ComputedValueSystem | null {
    return this.system;
  }
}
