import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { PropertySyncManager } from '@slopcade/godot-bridge';
import type { PropertyCache } from '@slopcade/shared';

export interface PropertySyncSystemConfig {
  propertyCache: PropertyCache;
}

export interface PropertySyncSystemState {
  cacheSize: number;
}

/**
 * RuntimeSystem wrapper for PropertySyncManager.
 * 
 * Manages synchronization of entity properties from Godot to TypeScript.
 * Subscribes to property updates from the bridge and maintains a cache.
 * 
 * Phase: PRE_UPDATE (runs early to sync properties before game logic)
 * Priority: 90 (after viewport, before computed values)
 */
export class PropertySyncRuntimeSystem implements RuntimeSystem<PropertySyncSystemConfig, PropertySyncSystemState> {
  readonly id = 'property-sync';
  readonly phase = SystemPhase.PRE_UPDATE;
  readonly priority = 90;
  
  private config: PropertySyncSystemConfig;
  private manager: PropertySyncManager | null = null;
  private propertyCache: PropertyCache | null = null;
  
  constructor(config: PropertySyncSystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: PropertySyncSystemConfig): void {
    this.propertyCache = this.config.propertyCache;
    this.manager = new PropertySyncManager(this.config.propertyCache);
    this.manager.start(ctx.bridge);
  }
  
  update(_ctx: UpdateContext, _state: PropertySyncSystemState): void {
    // Property sync is event-driven via bridge callbacks, no per-frame update needed
  }
  
  destroy(): void {
    if (this.manager) {
      this.manager.stop();
      this.manager = null;
    }
    this.propertyCache = null;
  }
  
  getState(): PropertySyncSystemState {
    if (!this.propertyCache) {
      return { cacheSize: 0 };
    }
    return {
      cacheSize: this.propertyCache.getSize(),
    };
  }
  
  getManager(): PropertySyncManager | null {
    return this.manager;
  }
  
  getCache(): PropertyCache | null {
    return this.propertyCache;
  }
}
