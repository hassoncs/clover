import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { createScriptSandbox, type IScriptSandbox } from '../../../../scripting';
import { WorldOpsImpl } from '../../../WorldOpsImpl';
import { SequenceManager } from '../../../SequenceManager';
import { getGlobalTweenSystem } from '../../../behaviors/TweenBehaviors';
import type {
  ScriptSandboxConfig,
  ScriptContext,
  ScriptErrorReport,
  InputSnapshot,
  DragSnapshot,
  ScriptInputEvent,
  ScriptCollisionEvent,
} from '../../../../scripting/types';
import type { Vec2 } from '@slopcade/shared/types/common';
import type { WorldOps } from '@slopcade/shared/types/world-ops';

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
  private worldOps: WorldOpsImpl | null = null;
  private sequenceManager: SequenceManager | null = null;
  private seededRandom: (() => number) | null = null;

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

    const tweenSystem = getGlobalTweenSystem();
    if (!tweenSystem) {
      console.warn('[ScriptSandboxRuntimeSystem] TweenSystem not available');
      return;
    }

    this.worldOps = new WorldOpsImpl(
      ctx.entityManager,
      ctx.physics,
      ctx.bridge,
      tweenSystem,
      ctx.eventQueue,
      () => this.getCurrentGameState()
    );

    this.sequenceManager = new SequenceManager();
    this.seededRandom = this.createSeededRandom(Date.now());
  }

  private getCurrentGameState() {
    return {
      variables: this.currentGameState?.variables ?? {},
      constants: this.constants,
    };
  }

  private currentGameState: { variables: Record<string, unknown> } | null = null;

  update(ctx: UpdateContext, _state: ScriptSandboxSystemState): void {
    if (!this.sandbox || !this.systemContext) {
      return;
    }

    this.currentGameState = { variables: ctx.gameState.variables };

    const em = this.systemContext.entityManager;

    if (this.pendingDestroys.size > 0) {
      for (const entityId of this.pendingDestroys) {
        em.destroyEntity(entityId);
      }
      this.pendingDestroys.clear();
    }

    if (this.worldOps) {
      this.worldOps.updateTimers(ctx.dt);
    }

    const scriptContext = this.createScriptContext(ctx);

    if (!this.onStartCalled && this.sandbox.hasHook('onStart')) {
      const result = this.sandbox.runStart(scriptContext);
      if (!result.success) {
        console.error('[ScriptSandboxRuntimeSystem] onStart error:', result.error);
      }
      this.onStartCalled = true;
    }

    if (this.sandbox.hasHook('onUpdate')) {
      const result = this.sandbox.runUpdate(scriptContext, ctx.dt);
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
    if (this.sequenceManager) {
      this.sequenceManager.dispose();
      this.sequenceManager = null;
    }

    if (this.sandbox) {
      this.sandbox.dispose();
      this.sandbox = null;
    }

    this.systemContext = null;
    this.worldOps = null;
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

  runInput(ctx: UpdateContext, event: ScriptInputEvent): void {
    if (!this.sandbox || !this.systemContext) return;
    if (!this.sandbox.hasHook('onInput')) return;

    const scriptContext = this.createScriptContext(ctx);
    const result = this.sandbox.runInput(scriptContext, event);
    if (!result.success) {
      console.error('[ScriptSandboxRuntimeSystem] onInput error:', result.error);
    }
  }

  runCollision(ctx: UpdateContext, collision: ScriptCollisionEvent): void {
    if (!this.sandbox || !this.systemContext) return;
    if (!this.sandbox.hasHook('onCollision')) return;

    const scriptContext = this.createScriptContext(ctx);
    const result = this.sandbox.runCollision(scriptContext, collision);
    if (!result.success) {
      console.error('[ScriptSandboxRuntimeSystem] onCollision error:', result.error);
    }
  }

  private createScriptContext(ctx: UpdateContext): ScriptContext {
    const em = this.systemContext!.entityManager;
    const physics = this.systemContext!.physics;
    const worldOps = this.worldOps!;
    const seqMgr = this.sequenceManager!;
    const seededRandom = this.seededRandom!;

    const inputSnapshot: InputSnapshot | null = ctx.input.tap
      ? {
          type: 'tap',
          position: { x: ctx.input.tap.worldX, y: ctx.input.tap.worldY },
          timestamp: Date.now(),
        }
      : null;

    return {
      getPosition: (entityId: string): Vec2 | null => {
        const entity = em.getEntity(entityId);
        if (!entity) return null;
        return { x: entity.transform.x, y: entity.transform.y };
      },

      getVelocity: (entityId: string): Vec2 | null => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return null;
        return physics.getLinearVelocity(entityId);
      },

      getRotation: (entityId: string): number | null => {
        const entity = em.getEntity(entityId);
        if (!entity) return null;
        return entity.transform.angle;
      },

      getTags: (entityId: string): string[] => em.getEntity(entityId)?.tags ?? [],

      hasTag: (entityId: string, tag: string): boolean => em.hasTag(entityId, tag),

      getTemplate: (entityId: string): string | undefined => em.getEntity(entityId)?.template,

      getVariable: (name: string): unknown => ctx.gameState.variables[name],

      getConstant: (name: string): number | string | boolean | undefined => this.constants?.[name],

      queryEntities: (query?: { tag?: string; templateId?: string; inAABB?: { minX: number; minY: number; maxX: number; maxY: number } }) => {
        if (!query) return em.getActiveEntities().map(e => e.id);
        const withinAabb = query.inAABB
          ? {
              min: { x: query.inAABB.minX, y: query.inAABB.minY },
              max: { x: query.inAABB.maxX, y: query.inAABB.maxY },
            }
          : undefined;
        return em
          .query({
            tags: query.tag ? [query.tag] : undefined,
            template: query.templateId,
            withinAabb,
          })
          .map(e => e.id);
      },

      getEntityData: (entityId: string) => {
        const entity = em.getEntity(entityId);
        if (!entity) return null;
        return {
          id: entity.id,
          template: entity.template,
          tags: [...entity.tags],
          position: { x: entity.transform.x, y: entity.transform.y },
          rotation: entity.transform.angle,
          scale: { x: entity.transform.scaleX, y: entity.transform.scaleY },
        };
      },

      queryEntitiesWithData: (query?: { tag?: string; templateId?: string; inAABB?: { minX: number; minY: number; maxX: number; maxY: number } }) => {
        if (!query) {
          return em.getActiveEntities().map(e => ({
            id: e.id,
            template: e.template,
            tags: [...e.tags],
            position: { x: e.transform.x, y: e.transform.y },
            rotation: e.transform.angle,
            scale: { x: e.transform.scaleX, y: e.transform.scaleY },
          }));
        }
        const withinAabb = query.inAABB
          ? {
              min: { x: query.inAABB.minX, y: query.inAABB.minY },
              max: { x: query.inAABB.maxX, y: query.inAABB.maxY },
            }
          : undefined;
        return em
          .query({
            tags: query.tag ? [query.tag] : undefined,
            template: query.templateId,
            withinAabb,
          })
          .map(e => ({
            id: e.id,
            template: e.template,
            tags: [...e.tags],
            position: { x: e.transform.x, y: e.transform.y },
            rotation: e.transform.angle,
            scale: { x: e.transform.scaleX, y: e.transform.scaleY },
          }));
      },

      world: worldOps,

      startSequence: (name: string, fn: (world: WorldOps) => Promise<void>) =>
        seqMgr.start(name, fn, worldOps as WorldOps),

      isSequenceRunning: (name: string): boolean => seqMgr.isRunning(name),

      cancelSequence: (name: string): void => seqMgr.cancel(name),

      dt: ctx.dt,
      elapsed: ctx.elapsed,
      frameId: ctx.frameId,

      input: inputSnapshot,

      mouse: ctx.input.mouse ? { x: ctx.input.mouse.worldX, y: ctx.input.mouse.worldY } : null,

      drag: this.createDragSnapshot(ctx),

      random: () => seededRandom(),
      randomInt: (min: number, max: number) => Math.floor(seededRandom() * (max - min + 1)) + min,
      randomChoice: <T>(array: readonly T[]) => array[Math.floor(seededRandom() * array.length)],
      clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      distance: (a: Vec2, b: Vec2) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2),
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

  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }
}
