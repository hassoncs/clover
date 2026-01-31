import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { ScriptSandbox } from '../../../../scripting/ScriptSandbox';
import type {
  ScriptSandboxConfig,
  SandboxRuntimeContext,
  ScriptErrorReport,
  InputSnapshot,
  SpawnOptions,
  EntityQuery,
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
  
  private sandbox: ScriptSandbox | null = null;
  private systemContext: SystemContext | null = null;
  private config: ScriptSandboxSystemConfig | null = null;
  private onStartCalled = false;
  
  async initialize(ctx: SystemContext, config: ScriptSandboxSystemConfig): Promise<void> {
    this.systemContext = ctx;
    this.config = config;
    
    const sandboxConfig: ScriptSandboxConfig = {
      scriptCode: config.scriptCode,
      scriptId: config.scriptId,
      gameId: config.gameId,
    };
    
    this.sandbox = new ScriptSandbox(sandboxConfig);
    const result = await this.sandbox.initialize();
    
    if (!result.success) {
      console.error('[ScriptSandboxRuntimeSystem] Failed to initialize sandbox:', result.error);
    }
  }
  
  update(ctx: UpdateContext, _state: ScriptSandboxSystemState): void {
    if (!this.sandbox || !this.systemContext || !this.config) return;
    
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
  }
  
  destroy(): void {
    if (this.sandbox) {
      this.sandbox.dispose();
      this.sandbox = null;
    }
    this.systemContext = null;
    this.config = null;
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
  
  private createRuntimeContext(ctx: UpdateContext): SandboxRuntimeContext {
    if (!this.systemContext || !this.config) {
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
        getConstant: (name) => this.config!.constants?.[name],
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
      frameInfo: {
        frameId: ctx.frameId,
        elapsed: ctx.elapsed,
        dt: ctx.dt,
      },
      constants: this.config.constants,
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
        em.destroyEntity(entityId);
      },
      getEntityPosition: (entityId: string) => {
        const entity = em.getEntity(entityId);
        if (!entity) return null;
        return { x: entity.transform.x, y: entity.transform.y };
      },
      setEntityPosition: (entityId: string, position: { x: number; y: number }) => {
        const entity = em.getEntity(entityId);
        if (!entity) return;
        
        entity.transform.x = position.x;
        entity.transform.y = position.y;
        
        if (entity.bodyId) {
          physics.setTransform(entity.bodyId, {
            position,
            angle: entity.transform.angle,
          });
        }
      },
      getEntityVelocity: (entityId: string) => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.bodyId) return null;
        return physics.getLinearVelocity(entity.bodyId);
      },
      setEntityVelocity: (entityId: string, velocity: { x: number; y: number }) => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.bodyId) return;
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
        
        return results.map(e => e.id);
      },
    };
  }
}
