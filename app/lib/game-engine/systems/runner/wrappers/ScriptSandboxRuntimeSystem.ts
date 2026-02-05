import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { createScriptSandbox, type IScriptSandbox } from '../../../../scripting';
import type {
  ScriptSandboxConfig,
  SandboxRuntimeContext,
  ScriptErrorReport,
  InputSnapshot,
  DragSnapshot,
  SpawnOptions,
  EntityQuery,
  EntityData,
  ScriptInputEvent,
  ScriptCollisionEvent,
} from '../../../../scripting/types';

export interface ScriptSandboxSystemConfig {
  scriptCode: string;
  scriptId: string;
  gameId: string;
  constants?: Record<string, number | string | boolean>;
}

export interface ScriptSandboxSystemState {
  hasOnStart: boolean;
  hasOnUpdate: boolean;
  hasOnInput: boolean;
  hasOnCollision: boolean;
  lastError: ScriptErrorReport | null;
  reloadCount: number;
  onStartCalled: boolean;
}

export class ScriptSandboxRuntimeSystem implements RuntimeSystem<ScriptSandboxSystemConfig, ScriptSandboxSystemState> {
  readonly id = 'script-sandbox';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 40;
  
  private config: ScriptSandboxSystemConfig;
  private sandbox: IScriptSandbox | null = null;
  private systemContext: SystemContext | null = null;
  private constants?: Record<string, number | string | boolean>;
  private onStartCalled = false;
  private pendingDestroys: Set<string> = new Set();
  
  constructor(config: ScriptSandboxSystemConfig) {
    this.config = config;
  }
  
  async initialize(ctx: SystemContext, _config: ScriptSandboxSystemConfig): Promise<void> {
    this.systemContext = ctx;
    this.constants = this.config.constants;
    
    const sandboxConfig: ScriptSandboxConfig = {
      scriptCode: this.config.scriptCode,
      scriptId: this.config.scriptId,
      gameId: this.config.gameId,
    };
    
    this.sandbox = createScriptSandbox(sandboxConfig);
    const result = await this.sandbox.initialize();
    
    if (!result.success) {
      console.error('[ScriptSandboxRuntimeSystem] Failed to initialize sandbox:', result.error);
    }
  }
  
  update(ctx: UpdateContext, _state: ScriptSandboxSystemState): void {
    if (!this.sandbox || !this.systemContext) {
      return;
    }
    
    const em = this.systemContext.entityManager;
    
    if (this.pendingDestroys.size > 0) {
      for (const entityId of this.pendingDestroys) {
        em.destroyEntity(entityId);
      }
      this.pendingDestroys.clear();
    }
    
    const runtimeContext = this.createRuntimeContext(ctx);
    
    if (!this.onStartCalled && this.sandbox.hasHook('onStart')) {
      const result = this.sandbox.runStart(runtimeContext);
      if (!result.success) {
        console.error('[ScriptSandboxRuntimeSystem] onStart error:', result.error);
      }
      this.onStartCalled = true;
    }
    
    if (this.sandbox.hasHook('onUpdate')) {
      const result = this.sandbox.runUpdate(runtimeContext, ctx.dt);
      if (!result.success) {
        console.error('[ScriptSandboxRuntimeSystem] onUpdate error:', result.error);
      }
    }
    
    if (this.sandbox.hasHook('onInput')) {
      for (const event of ctx.frame.inputEvents) {
        if (event.type === 'tap') {
          const tapEvent: ScriptInputEvent = {
            type: 'tap',
            position: { x: event.worldX, y: event.worldY },
            entityId: event.targetEntityId ?? null,
            timestamp: Date.now(),
          };
          this.runInput(ctx, tapEvent);
        }
      }
    }
    
    if (this.sandbox.hasHook('onCollision') && ctx.frame.collisions.length > 0) {
      for (const collision of ctx.frame.collisions) {
        const collisionEvent: ScriptCollisionEvent = {
          entityA: collision.entityA.id,
          entityB: collision.entityB.id,
          normal: collision.normal,
          impulse: collision.impulse,
          contactPoint: { x: 0, y: 0 },
          timestamp: Date.now(),
        };
        this.runCollision(ctx, collisionEvent);
      }
    }
  }
  
  destroy(): void {
    if (this.sandbox) {
      this.sandbox.dispose();
      this.sandbox = null;
    }
    this.systemContext = null;
    this.onStartCalled = false;
  }
  
  getState(): ScriptSandboxSystemState {
    if (!this.sandbox) {
      return {
        hasOnStart: false,
        hasOnUpdate: false,
        hasOnInput: false,
        hasOnCollision: false,
        lastError: null,
        reloadCount: 0,
        onStartCalled: false,
      };
    }
    
    return {
      hasOnStart: this.sandbox.hasHook('onStart'),
      hasOnUpdate: this.sandbox.hasHook('onUpdate'),
      hasOnInput: this.sandbox.hasHook('onInput'),
      hasOnCollision: this.sandbox.hasHook('onCollision'),
      lastError: this.sandbox.getLastError(),
      reloadCount: this.sandbox.getReloadCount(),
      onStartCalled: this.onStartCalled,
    };
  }
  
  getSandbox(): IScriptSandbox | null {
    return this.sandbox;
  }
  
  /**
   * Called when an input event occurs (tap, drag, etc.)
   */
  runInput(ctx: UpdateContext, event: ScriptInputEvent): void {
    if (!this.sandbox || !this.systemContext) return;
    if (!this.sandbox.hasHook('onInput')) return;
    
    const runtimeContext = this.createRuntimeContext(ctx);
    const result = this.sandbox.runInput(runtimeContext, event);
    if (!result.success) {
      console.error('[ScriptSandboxRuntimeSystem] onInput error:', result.error);
    }
  }
  
  /**
   * Called when a collision occurs
   */
  runCollision(ctx: UpdateContext, collision: ScriptCollisionEvent): void {
    if (!this.sandbox || !this.systemContext) return;
    if (!this.sandbox.hasHook('onCollision')) return;
    
    const runtimeContext = this.createRuntimeContext(ctx);
    const result = this.sandbox.runCollision(runtimeContext, collision);
    if (!result.success) {
      console.error('[ScriptSandboxRuntimeSystem] onCollision error:', result.error);
    }
  }
  
  private createRuntimeContext(ctx: UpdateContext): SandboxRuntimeContext {
    if (!this.systemContext) {
      throw new Error('[ScriptSandboxRuntimeSystem] Cannot create runtime context: system not initialized');
    }
    
    const inputSnapshot: InputSnapshot | null = ctx.input.tap
      ? {
          type: 'tap',
          position: { x: ctx.input.tap.worldX, y: ctx.input.tap.worldY },
          timestamp: Date.now(),
        }
      : null;
    
    return {
      entityManager: this.createEntityManagerAdapter(),
      rulesEvaluator: {
        getVariable: (name) => ctx.gameState.variables[name],
        setVariable: (name, value) => {
          this.systemContext!.eventQueue.emit('variable_change', { name, value });
        },
        getConstant: (name) => this.constants?.[name],
        emitEvent: (eventName, data) => {
          this.systemContext!.eventQueue.emit(eventName, data);
        },
        win: () => {
          this.systemContext!.eventQueue.emit('game_state_change', { state: 'won' });
        },
        lose: () => {
          this.systemContext!.eventQueue.emit('game_state_change', { state: 'lost' });
        },
      },
      inputSnapshot,
      mousePosition: ctx.input.mouse
        ? { x: ctx.input.mouse.worldX, y: ctx.input.mouse.worldY }
        : null,
      dragState: this.createDragSnapshot(ctx),
      frameInfo: {
        frameId: ctx.frameId,
        elapsed: ctx.elapsed,
        dt: ctx.dt,
      },
      constants: this.constants,
    };
  }
  
  private createDragSnapshot(ctx: UpdateContext): DragSnapshot | null {
    if (!ctx.input.drag) return null;
    
    return {
      isDragging: true,
      startPosition: { x: ctx.input.drag.startWorldX, y: ctx.input.drag.startWorldY },
      currentPosition: { x: ctx.input.drag.currentWorldX, y: ctx.input.drag.currentWorldY },
      entityId: ctx.input.drag.targetEntityId ?? null,
    };
  }
  
  private createEntityManagerAdapter(): SandboxRuntimeContext['entityManager'] {
    const em = this.systemContext!.entityManager;
    const physics = this.systemContext!.physics;
    
    return {
      spawnEntity: (templateId: string, position: { x: number; y: number }, opts?: SpawnOptions) => {
        const template = em.getTemplate(templateId);
        if (!template) return null;
        
        const entity = em.createEntity({
          id: '',
          name: templateId,
          template: templateId,
          transform: {
            x: position.x,
            y: position.y,
            angle: opts?.angle ?? 0,
            scaleX: 1,
            scaleY: 1,
          },
        });
        if (!entity) return null;
        
        if (opts?.velocity && entity.physics) {
          physics.setLinearVelocity(entity.id, opts.velocity);
        }
        
        return entity.id;
      },
      destroyEntity: (entityId: string) => {
        this.pendingDestroys.add(entityId);
      },
      getEntityPosition: (entityId: string) => {
        const entity = em.getEntity(entityId);
        if (!entity) return null;
        return { x: entity.transform.x, y: entity.transform.y };
      },
      setEntityPosition: (entityId: string, position: { x: number; y: number }) => {
        const entity = em.getEntity(entityId);
        if (!entity) {
          return;
        }
        
        entity.transform.x = position.x;
        entity.transform.y = position.y;
        
        if (entity.physics) {
          physics.setTransform(entity.id, {
            position,
            angle: entity.transform.angle,
          });
        }
      },
      getEntityVelocity: (entityId: string) => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return null;
        return physics.getLinearVelocity(entity.id);
      },
      setEntityVelocity: (entityId: string, velocity: { x: number; y: number }) => {
        const entity = em.getEntity(entityId);
        if (!entity) {
          return;
        }
        if (!entity.physics) {
          return;
        }
        physics.setLinearVelocity(entity.id, velocity);
      },
      applyImpulse: (entityId: string, impulse: { x: number; y: number }) => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return;
        physics.applyImpulseToCenter(entity.id, impulse);
      },
      getEntityTags: (entityId: string) => {
        const entity = em.getEntity(entityId);
        return entity?.tags ?? [];
      },
      addTag: (entityId: string, tag: string) => {
        em.addTag(entityId, tag);
      },
      removeTag: (entityId: string, tag: string) => {
        return em.removeTag(entityId, tag);
      },
      hasTag: (entityId: string, tag: string) => {
        return em.hasTag(entityId, tag);
      },
      queryEntities: (query?: EntityQuery) => {
        if (!query) {
          return em.getActiveEntities().map(e => e.id);
        }

        const withinAabb = query.inAabb ? {
          min: { x: query.inAabb.minX, y: query.inAabb.minY },
          max: { x: query.inAabb.maxX, y: query.inAabb.maxY },
        } : undefined;

        const results = em.query({
          tags: query.tag ? [query.tag] : undefined,
          template: query.templateId,
          withinAabb,
        });

        return results.map(e => e.id);
      },
      getEntityData: (entityId: string): EntityData | null => {
        const entity = em.getEntity(entityId);
        if (!entity) return null;
        return {
          id: entity.id,
          tags: [...entity.tags],
          position: { x: entity.transform.x, y: entity.transform.y },
          template: entity.templateId,
        };
      },
      queryEntitiesWithData: (query?: EntityQuery): EntityData[] => {
        let entities = em.getActiveEntities();
        if (query?.tag) {
          entities = em.query({ tags: [query.tag] });
        }
        return entities.map(e => ({
          id: e.id,
          tags: [...e.tags],
          position: { x: e.transform.x, y: e.transform.y },
          template: e.templateId,
        }));
      },
      getEntityTemplate: (entityId: string) => {
        const entity = em.getEntity(entityId);
        return entity?.templateId;
      },
    };
  }
}
