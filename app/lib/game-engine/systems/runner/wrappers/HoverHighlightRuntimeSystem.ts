import { SystemPhase, type HoverHighlightConfig } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import type { EntityManager } from '../../../EntityManager';
import type { GodotBridge } from '@/lib/godot/types';
import type { RuntimeEntity } from '../../../types';

export interface HoverHighlightSystemConfig {
  targetTag: string;
  highlightEntityId: string;
}

export interface HoverHighlightSystemState {
  hoveredEntityId: string | null;
}

export class HoverHighlightRuntimeSystem implements RuntimeSystem<HoverHighlightSystemConfig, HoverHighlightSystemState> {
  readonly id = 'hover-highlight';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 90;
  
  private entityManager: EntityManager | null = null;
  private bridge: GodotBridge | null = null;
  private config: HoverHighlightSystemConfig;
  private hoveredEntityId: string | null = null;
  private highlightEntityExists = false;
  
  constructor(config: HoverHighlightConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: HoverHighlightSystemConfig): void {
    this.entityManager = ctx.entityManager;
    this.bridge = ctx.bridge;
    
    const highlightEntity = ctx.entityManager.getEntity(this.config.highlightEntityId);
    this.highlightEntityExists = !!highlightEntity;
    
    if (!this.highlightEntityExists) {
      return;
    }
    
    ctx.entityManager.setEntityVisible(this.config.highlightEntityId, false);
    ctx.bridge.setVisible(this.config.highlightEntityId, false);
  }
  
  update(ctx: UpdateContext, _state: HoverHighlightSystemState): void {
    if (!this.highlightEntityExists || !this.entityManager || !this.bridge) {
      return;
    }
    
    const mouse = ctx.input.mouse;
    
    if (!mouse) {
      this.clearHover();
      return;
    }
    
    const hoveredEntity = this.findHoveredEntity(mouse.worldX, mouse.worldY);
    
    if (!hoveredEntity) {
      this.clearHover();
      return;
    }
    
    if (hoveredEntity.id === this.hoveredEntityId) {
      return;
    }
    
    this.hoveredEntityId = hoveredEntity.id;
    
    const highlightEntity = this.entityManager.getEntity(this.config.highlightEntityId);
    if (highlightEntity) {
      highlightEntity.transform.x = hoveredEntity.transform.x;
      highlightEntity.transform.y = hoveredEntity.transform.y;
      this.entityManager.updateWorldTransforms(this.config.highlightEntityId);
      this.bridge.setPosition(this.config.highlightEntityId, hoveredEntity.transform.x, hoveredEntity.transform.y);
    }
    
    this.entityManager.setEntityVisible(this.config.highlightEntityId, true);
    this.bridge.setVisible(this.config.highlightEntityId, true);
  }
  
  private findHoveredEntity(worldX: number, worldY: number): RuntimeEntity | null {
    if (!this.entityManager) return null;
    
    const targetEntities = this.entityManager.getEntitiesByTag(this.config.targetTag);
    
    for (const entity of targetEntities) {
      const width = this.getEntityWidth(entity);
      const height = this.getEntityHeight(entity);
      
      if (width === 0 || height === 0) continue;
      
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      const minX = entity.transform.x - halfWidth;
      const maxX = entity.transform.x + halfWidth;
      const minY = entity.transform.y - halfHeight;
      const maxY = entity.transform.y + halfHeight;
      
      if (worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY) {
        return entity;
      }
    }
    
    return null;
  }
  
  private getEntityWidth(entity: RuntimeEntity): number {
    if (entity.collider && 'width' in entity.collider) {
      return entity.collider.width as number;
    }
    if (entity.visual && 'width' in entity.visual) {
      return (entity.visual as { width: number }).width;
    }
    return 0;
  }
  
  private getEntityHeight(entity: RuntimeEntity): number {
    if (entity.collider && 'height' in entity.collider) {
      return entity.collider.height as number;
    }
    if (entity.visual && 'height' in entity.visual) {
      return (entity.visual as { height: number }).height;
    }
    return 0;
  }
  
  private clearHover(): void {
    if (this.hoveredEntityId !== null && this.entityManager && this.bridge) {
      this.entityManager.setEntityVisible(this.config.highlightEntityId, false);
      this.bridge.setVisible(this.config.highlightEntityId, false);
      this.hoveredEntityId = null;
    }
  }
  
  destroy(): void {
    this.clearHover();
    this.entityManager = null;
    this.bridge = null;
    this.highlightEntityExists = false;
  }
  
  getState(): HoverHighlightSystemState {
    return {
      hoveredEntityId: this.hoveredEntityId,
    };
  }
  
  getHoveredEntityId(): string | null {
    return this.hoveredEntityId;
  }
}
