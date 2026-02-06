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
import type {
  WorldOps,
  WorldEntityQuery,
  WorldEntityData,
  SpawnOptions,
  CloneOptions,
  ReparentOptions,
  RaycastOptions,
  RaycastHit,
} from '@slopcade/shared/types/world-ops';
import type { AsyncWorldOps } from '@slopcade/shared/types/async-world-ops';

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
    const bridge = this.systemContext!.bridge;
    const eventQueue = this.systemContext!.eventQueue;
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

    const queryEntities = (query?: WorldEntityQuery): string[] => {
      if (!query) return em.getActiveEntities().map((e) => e.id);
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
        .map((e) => e.id);
    };

    const getEntityData = (entityId: string): WorldEntityData | null => {
      const entity = em.getEntity(entityId);
      if (!entity) return null;

      const velocity = entity.physics ? physics.getLinearVelocity(entityId) : undefined;
      const angularVelocity = entity.physics ? physics.getAngularVelocity(entityId) : undefined;

      return {
        id: entity.id,
        template: entity.template,
        tags: [...entity.tags],
        position: { x: entity.transform.x, y: entity.transform.y },
        rotation: entity.transform.angle,
        scale: { x: entity.transform.scaleX, y: entity.transform.scaleY },
        velocity,
        angularVelocity,
      };
    };

    const queryEntitiesWithData = (query?: WorldEntityQuery): WorldEntityData[] => {
      const entityIds = queryEntities(query);
      const results: WorldEntityData[] = [];
      for (const entityId of entityIds) {
        const data = getEntityData(entityId);
        if (data) {
          results.push(data);
        }
      }
      return results;
    };

    const cloneEntityRecursive = (
      sourceEntityId: string,
      parentId?: string,
      positionOverride?: Vec2,
      includeChildren?: boolean
    ): string | null => {
      const source = em.getEntity(sourceEntityId);
      if (!source || !source.template) return null;

      const newEntityId = em.spawnEntity({
        templateId: source.template,
        position: positionOverride ?? { x: source.transform.x, y: source.transform.y },
        angle: source.transform.angle,
        tags: [...source.tags],
        parentId,
      });

      if (!newEntityId) return null;

      const newEntity = em.getEntity(newEntityId);
      if (!newEntity) return null;

      newEntity.transform.scaleX = source.transform.scaleX;
      newEntity.transform.scaleY = source.transform.scaleY;
      bridge.setScale(newEntityId, newEntity.transform.scaleX, newEntity.transform.scaleY);

      if (includeChildren) {
        for (const childId of source.children) {
          cloneEntityRecursive(childId, newEntityId, undefined, true);
        }
      }

      return newEntityId;
    };

    const worldAsync: AsyncWorldOps = {
      animate: (entityId, target, opts) => worldOps.animate(entityId, target, opts),
      wait: (ms, opts) => worldOps.wait(ms, opts),
    };

    return {
      spawnEntity: (templateId: string, position: Vec2, opts?: SpawnOptions): string | null => {
        return em.spawnEntity({
          templateId,
          position,
          velocity: opts?.velocity,
          angle: opts?.angle,
          tags: opts?.tags,
          parentId: opts?.parentId,
          entityId: opts?.entityId,
        });
      },

      destroyEntity: (entityId: string): void => {
        em.destroyEntity(entityId);
      },

      cloneEntity: (entityId: string, opts?: CloneOptions): string | null => {
        return cloneEntityRecursive(entityId, undefined, opts?.position, opts?.withChildren);
      },

      reparentEntity: (entityId: string, newParentId: string, opts?: ReparentOptions): void => {
        em.reparent(
          entityId,
          newParentId,
          opts?.keepGlobalTransform
            ? undefined
            : em.getEntity(entityId)?.localTransform
        );
      },

      getEntityPosition: (entityId: string): Vec2 | null => {
        const entity = em.getEntity(entityId);
        if (!entity) return null;
        return { x: entity.transform.x, y: entity.transform.y };
      },

      setEntityPosition: (entityId: string, position: Vec2): void => {
        const entity = em.getEntity(entityId);
        if (!entity) return;

        entity.transform.x = position.x;
        entity.transform.y = position.y;

        if (entity.physics) {
          physics.setTransform(entity.id, {
            position,
            angle: entity.transform.angle,
          });
        }

        bridge.setPosition(entityId, position.x, position.y);
      },

      getEntityRotation: (entityId: string): number | null => {
        const entity = em.getEntity(entityId);
        return entity ? entity.transform.angle : null;
      },

      setEntityRotation: (entityId: string, angle: number): void => {
        const entity = em.getEntity(entityId);
        if (!entity) return;

        entity.transform.angle = angle;

        if (entity.physics) {
          physics.setTransform(entity.id, {
            position: { x: entity.transform.x, y: entity.transform.y },
            angle,
          });
        }

        bridge.setRotation(entityId, (angle * 180) / Math.PI);
      },

      getEntityScale: (entityId: string): Vec2 | null => {
        const entity = em.getEntity(entityId);
        if (!entity) return null;
        return { x: entity.transform.scaleX, y: entity.transform.scaleY };
      },

      setEntityScale: (entityId: string, scale: Vec2): void => {
        const entity = em.getEntity(entityId);
        if (!entity) return;

        entity.transform.scaleX = scale.x;
        entity.transform.scaleY = scale.y;
        bridge.setScale(entityId, scale.x, scale.y);
      },

      setEntityVisible: (entityId: string, visible: boolean): void => {
        em.setEntityVisible(entityId, visible);
        bridge.setVisible(entityId, visible);
      },

      getEntityVelocity: (entityId: string): Vec2 | null => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return null;
        return physics.getLinearVelocity(entityId);
      },

      setEntityVelocity: (entityId: string, velocity: Vec2): void => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return;
        physics.setLinearVelocity(entityId, velocity);
      },

      getEntityAngularVelocity: (entityId: string): number | null => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return null;
        return physics.getAngularVelocity(entityId);
      },

      setEntityAngularVelocity: (entityId: string, velocity: number): void => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return;
        physics.setAngularVelocity(entityId, velocity);
      },

      applyImpulse: (entityId: string, impulse: Vec2): void => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return;
        physics.applyImpulseToCenter(entityId, impulse);
        bridge.applyImpulse(entityId, impulse);
      },

      applyForce: (entityId: string, force: Vec2): void => {
        const entity = em.getEntity(entityId);
        if (!entity || !entity.physics) return;
        physics.applyForceToCenter(entityId, force);
        bridge.applyForce(entityId, force);
      },

      getEntityTags: (entityId: string): string[] => em.getEntity(entityId)?.tags ?? [],

      addTag: (entityId: string, tag: string): void => {
        em.addTag(entityId, tag);
      },

      removeTag: (entityId: string, tag: string): boolean => em.removeTag(entityId, tag),

      hasTag: (entityId: string, tag: string): boolean => em.hasTag(entityId, tag),

      getEntityTemplate: (entityId: string): string | undefined => em.getEntity(entityId)?.template,

      getEntityData,

      queryEntities,

      queryEntitiesWithData,

      queryPoint: (point: Vec2): string | null => {
        return physics.queryPoint(point);
      },

      queryAABB: (min: Vec2, max: Vec2): string[] => {
        return physics.queryAABB(min, max);
      },

      raycast: (from: Vec2, to: Vec2, _opts?: RaycastOptions): RaycastHit | null => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return null;

        const direction = { x: dx / distance, y: dy / distance };
        const hit = physics.raycast(from, direction, distance);

        if (!hit) return null;

        return {
          entityId: hit.entityId,
          point: hit.point,
          normal: hit.normal,
          distance: hit.fraction * distance,
        };
      },

      getVariable: (name: string): unknown => ctx.gameState.variables[name],

      setVariable: (name: string, value: unknown): void => {
        if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') {
          return;
        }
        ctx.gameState.variables[name] = value;
        eventQueue.emit('variable_change', { name, value });
      },

      getConstant: (name: string): unknown => this.constants?.[name],

      emit: (eventName: string, data?: Record<string, unknown>): void => {
        eventQueue.emit(eventName, data);
      },

      win: (): void => {
        eventQueue.emit('game_state_change', { state: 'won' });
      },

      lose: (): void => {
        eventQueue.emit('game_state_change', { state: 'lost' });
      },

      worldAsync,

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
