import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import type { EntityManager } from '../../../EntityManager';

export type EntityManagerSystemConfig = Record<string, never>;

export interface EntityManagerSystemState {
  entityCount: number;
  activeEntityIds: string[];
}

export class EntityManagerRuntimeSystem implements RuntimeSystem<EntityManagerSystemConfig, EntityManagerSystemState> {
  readonly id = 'entity-manager';
  readonly phase = SystemPhase.PRE_UPDATE;
  readonly priority = 70;
  
  private entityManager: EntityManager | null = null;
  
  constructor() {}
  
  initialize(ctx: SystemContext, _config: EntityManagerSystemConfig): void {
    this.entityManager = ctx.entityManager;
  }
  
  update(_ctx: UpdateContext, _state: EntityManagerSystemState): void {
    if (this.entityManager) {
      this.entityManager.updateAllWorldTransforms();
    }
  }
  
  destroy(): void {
    this.entityManager = null;
  }
  
  getState(): EntityManagerSystemState {
    if (!this.entityManager) {
      return { entityCount: 0, activeEntityIds: [] };
    }
    const entities = this.entityManager.getActiveEntities();
    return {
      entityCount: entities.length,
      activeEntityIds: entities.map(e => e.id),
    };
  }
  
  getEntityManager(): EntityManager | null {
    return this.entityManager;
  }
}
