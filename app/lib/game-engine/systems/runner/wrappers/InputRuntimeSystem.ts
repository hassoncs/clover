import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { InputEntityManager } from '../../../InputEntityManager';
import type { Vec2 } from '@/lib/physics2d/types';

export interface InputSystemConfig {
  debug?: boolean;
}

export interface InputSystemState {
  mousePosition: Vec2 | null;
  activeInputs: string[];
}

export class InputRuntimeSystem implements RuntimeSystem<InputSystemConfig, InputSystemState> {
  readonly id = 'input';
  readonly phase = SystemPhase.PRE_UPDATE;
  readonly priority = 60;
  
  private inputEntityManager: InputEntityManager | null = null;
  
  initialize(_ctx: SystemContext, config: InputSystemConfig): void {
    this.inputEntityManager = new InputEntityManager({ debug: config.debug });
  }
  
  update(ctx: UpdateContext, _state: InputSystemState): void {
    if (this.inputEntityManager) {
      this.inputEntityManager.syncFromInput(ctx.input);
    }
  }
  
  destroy(): void {
    this.inputEntityManager = null;
  }
  
  getState(): InputSystemState {
    if (!this.inputEntityManager) {
      return { mousePosition: null, activeInputs: [] };
    }
    
    const mouseEntity = this.inputEntityManager.getEntity('$mouse');
    const mousePosition = mouseEntity?.active 
      ? { x: mouseEntity.transform.x, y: mouseEntity.transform.y }
      : null;
    
    const activeInputs = this.inputEntityManager.getAllEntities()
      .filter(e => e.active)
      .map(e => e.id);
    
    return {
      mousePosition,
      activeInputs,
    };
  }
  
  getInputEntityManager(): InputEntityManager | null {
    return this.inputEntityManager;
  }
}
