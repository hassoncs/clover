import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { ContainerSystem } from '../../ContainerSystem';
import type { ContainerConfig } from '@slopcade/shared';

export interface ContainerSystemConfig {
  containers?: ContainerConfig[];
}

export interface ContainerSystemState {
  containerCount: number;
  containerIds: string[];
}

export class ContainerRuntimeSystem implements RuntimeSystem<ContainerSystemConfig, ContainerSystemState> {
  readonly id = 'container';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 80;
  
  private config: ContainerSystemConfig;
  private containerSystem: ContainerSystem | null = null;
  
  constructor(config: ContainerSystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: ContainerSystemConfig): void {
    this.containerSystem = new ContainerSystem(ctx.entityManager, {
      containers: this.config.containers,
    });
  }
  
  update(_ctx: UpdateContext, _state: ContainerSystemState): void {
    // Containers are event-driven, no per-frame update needed
  }
  
  destroy(): void {
    this.containerSystem?.destroy();
    this.containerSystem = null;
  }
  
  getState(): ContainerSystemState {
    if (!this.containerSystem) {
      return { containerCount: 0, containerIds: [] };
    }
    const containers = this.containerSystem.getAllContainers();
    return {
      containerCount: containers.length,
      containerIds: containers.map(c => c.id),
    };
  }
  
  getContainerSystem(): ContainerSystem | null {
    return this.containerSystem;
  }
}
