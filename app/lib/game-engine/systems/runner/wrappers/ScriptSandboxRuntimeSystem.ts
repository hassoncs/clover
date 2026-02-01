import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { ScriptSandbox } from '../../../../scripting/ScriptSandbox';
import type {
  ScriptSandboxConfig,
  SandboxRuntimeContext,
  ScriptErrorReport,
  InputSnapshot,
  DragSnapshot,
  SpawnOptions,
  EntityQuery,
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
  private sandbox: ScriptSandbox | null = null;
  private systemContext: SystemContext | null = null;
  private constants?: Record<string, number | string | boolean>;
  private onStartCalled = false;
  private pendingDestroys: Set<string> = new Set();
  
  constructor(config: ScriptSandboxSystemConfig) {
    this.config = config;
  }
  
  async initialize(ctx: SystemContext, _config: ScriptSandboxSystemConfig): Promise<void> {
    console.log('[ScriptSandboxRuntimeSystem] Initializing with scriptId:', this.config.scriptId);
    console.log('[ScriptSandboxRuntimeSystem] Script code length:', this.config.scriptCode.length);
    console.log('[ScriptSandboxRuntimeSystem] Constants:', this.config.constants);
    
    this.systemContext = ctx;
    this.constants = this.config.constants;
    
    const sandboxConfig: ScriptSandboxConfig = {
      scriptCode: this.config.scriptCode,
      scriptId: this.config.scriptId,
      gameId: this.config.gameId,
    };
    
    this.sandbox = new ScriptSandbox(sandboxConfig);
    const result = await this.sandbox.initialize();
    
    if (!result.success) {
      console.error('[ScriptSandboxRuntimeSystem] Failed to initialize sandbox:', result.error);
    } else {
      console.log('[ScriptSandboxRuntimeSystem] Sandbox initialized successfully');
      console.log('[ScriptSandboxRuntimeSystem] Available hooks:', {
        onStart: this.sandbox.hasHook('onStart'),
        onUpdate: this.sandbox.hasHook('onUpdate'),
        onInput: this.sandbox.hasHook('onInput'),
        onCollision: this.sandbox.hasHook('onCollision'),
      });
    }
  }
  
  update(ctx: UpdateContext, _state: ScriptSandboxSystemState): void {
    if (!this.sandbox || !this.systemContext) {
      if (ctx.frameId % 60 === 0) {
        console.log('[ScriptSandboxRuntimeSystem] update skipped: sandbox=', !!this.sandbox, 'systemContext=', !!this.systemContext);
      }
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
      console.log('[ScriptSandboxRuntimeSystem] Calling onStart...');
      const result = this.sandbox.runStart(runtimeContext);
      if (!result.success) {
        console.error('[ScriptSandboxRuntimeSystem] onStart error:', result.error);
      } else {
        console.log('[ScriptSandboxRuntimeSystem] onStart completed successfully');
      }
      this.onStartCalled = true;
    }
    
    if (this.sandbox.hasHook('onUpdate')) {
      if (ctx.frameId % 30 === 0) {
        console.log('[ScriptSandboxRuntimeSystem] onUpdate frame:', ctx.frameId, 
          'rawMouse:', ctx.input.mouse,
          'mousePosition:', runtimeContext.mousePosition);
      }
      const result = this.sandbox.runUpdate(runtimeContext, ctx.dt);
      if (!result.success) {
        console.error('[ScriptSandboxRuntimeSystem] onUpdate error:', result.error);
      }
    } else if (ctx.frameId === 1) {
      console.log('[ScriptSandboxRuntimeSystem] No onUpdate hook found');
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
          console.log('[ScriptSandboxRuntimeSystem] Processing tap event from frame:', tapEvent);
          this.runInput(ctx, tapEvent);
        }
      }
    }
    
    if (this.sandbox.hasHook('onCollision') && ctx.frame.collisions.length > 0) {
      console.log('[ScriptSandboxRuntimeSystem] Processing', ctx.frame.collisions.length, 'collisions from frame');
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
  
  getSandbox(): ScriptSandbox | null {
    return this.sandbox;
  }
  
  /**
   * Called when an input event occurs (tap, drag, etc.)
   */
  runInput(ctx: UpdateContext, event: ScriptInputEvent): void {
    if (!this.sandbox || !this.systemContext) return;
    if (!this.sandbox.hasHook('onInput')) return;
    
    console.log('[ScriptSandboxRuntimeSystem] Running onInput:', event.type);
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
    
    console.log('[ScriptSandboxRuntimeSystem] Running onCollision:', collision.entityA, 'vs', collision.entityB);
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
        addScore: (points: number) => {
          this.systemContext!.eventQueue.emit('score_change', { delta: points });
        },
        addLives: (count: number) => {
          this.systemContext!.eventQueue.emit('lives_change', { delta: count });
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
        
        if (opts?.velocity && entity.bodyId) {
          physics.setLinearVelocity(entity.bodyId, opts.velocity);
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
          console.warn('[ScriptSandboxRuntimeSystem] setEntityPosition: entity not found:', entityId);
          return;
        }
        
        console.log('[ScriptSandboxRuntimeSystem] setEntityPosition:', entityId, 'to', position, 'bodyId:', entity.bodyId?.value);
        
        entity.transform.x = position.x;
        entity.transform.y = position.y;
        
        if (entity.bodyId) {
          physics.setTransform(entity.bodyId, {
            position,
            angle: entity.transform.angle,
          });
        } else {
          console.warn('[ScriptSandboxRuntimeSystem] setEntityPosition: entity has no bodyId:', entityId);
        }
      },
      getEntityVelocity: (entityId: string) => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.bodyId) return null;
        return physics.getLinearVelocity(entity.bodyId);
      },
      setEntityVelocity: (entityId: string, velocity: { x: number; y: number }) => {
        const entity = em.getEntity(entityId);
        if (!entity) {
          console.warn('[ScriptSandboxRuntimeSystem] setEntityVelocity: entity not found:', entityId);
          return;
        }
        if (!entity.bodyId) {
          console.warn('[ScriptSandboxRuntimeSystem] setEntityVelocity: entity has no bodyId:', entityId);
          return;
        }
        console.log('[ScriptSandboxRuntimeSystem] setEntityVelocity:', entityId, 'to', velocity);
        physics.setLinearVelocity(entity.bodyId, velocity);
      },
      applyImpulse: (entityId: string, impulse: { x: number; y: number }) => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.bodyId) return;
        physics.applyImpulseToCenter(entity.bodyId, impulse);
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
        
        if (results.length === 0 && query.tag) {
          console.log('[ScriptSandboxRuntimeSystem] queryEntities: no results for tag:', query.tag, 
            'active entities:', em.getActiveEntities().map(e => ({ id: e.id, tags: e.tags })).slice(0, 5));
        }
        
        return results.map(e => e.id);
      },
    };
  }
}
