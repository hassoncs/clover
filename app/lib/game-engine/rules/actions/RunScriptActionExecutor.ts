import type { ActionExecutor } from './ActionExecutor';
import type { RunScriptAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { IScriptSandbox } from '@/lib/scripting';
import type { ScriptContext, InputSnapshot, DragSnapshot } from '@/lib/scripting/types';
import type {
  WorldEntityQuery,
  WorldEntityData,
  SequenceHandle,
  AsyncWorldOps,
  SpawnOptions,
  CloneOptions,
  ReparentOptions,
  RaycastOptions,
  RaycastHit,
  WorldOps,
} from '@slopcade/shared/types';
import type { Vec2 } from '@slopcade/shared/types/common';
import { SequenceManager } from '../../SequenceManager';

interface DeferredSpawn {
  entityId: string;
  templateId: string;
  x: number;
  y: number;
  velocity?: { x: number; y: number };
}

export class RunScriptActionExecutor implements ActionExecutor<RunScriptAction> {
  private sandbox: IScriptSandbox | null = null;
  private sequenceManager = new SequenceManager();

  setSandbox(sandbox: IScriptSandbox): void {
    this.sandbox = sandbox;
  }

  execute(action: RunScriptAction, context: RuleContext): void {
    if (!this.sandbox) {
      console.warn('[RunScriptActionExecutor] No script sandbox available - sandbox not set!');
      return;
    }

    const functionName = action.export ?? 'default';

    const deferredSpawns: DeferredSpawn[] = [];
    const scriptContext = this.createScriptContext(context, deferredSpawns);

    const result = this.sandbox.callFunction(scriptContext, functionName, action.args);

    for (const spawn of deferredSpawns) {
      if (context.bridge) {
        context.bridge.spawnEntity({
          entityId: spawn.entityId,
          templateId: spawn.templateId,
          position: { x: spawn.x, y: spawn.y },
          velocity: spawn.velocity,
        });
      }
    }

    if (!result.success && result.error) {
      console.error(`[RunScriptActionExecutor] Script error in '${functionName}':`, result.error.message);
      if (result.error.stack) {
        console.error(result.error.stack);
      }
    }
  }

  private createScriptContext(
    context: RuleContext,
    deferredSpawns: DeferredSpawn[]
  ): ScriptContext {
    const entityManager = context.entityManager;
    const mutator = context.mutator;

    const getEntityData = (entityId: string): WorldEntityData | null => {
      const entity = entityManager.getEntity(entityId);
      if (!entity) return null;
      return {
        id: entity.id,
        template: entity.template,
        tags: [...entity.tags],
        position: { x: entity.transform.x, y: entity.transform.y },
        rotation: entity.transform.angle,
        scale: { x: entity.transform.scaleX, y: entity.transform.scaleY },
      };
    };

    const queryEntitiesWithData = (query?: WorldEntityQuery): WorldEntityData[] => {
      let entities = entityManager.getAllEntities();
      if (query?.tag) {
        entities = entityManager.getEntitiesByTag(query.tag);
      }
      return entities.map(e => ({
        id: e.id,
        template: e.template,
        tags: [...e.tags],
        position: { x: e.transform.x, y: e.transform.y },
        rotation: e.transform.angle,
        scale: { x: e.transform.scaleX, y: e.transform.scaleY },
      }));
    };

    const queryEntities = (query?: WorldEntityQuery): string[] => {
      if (!query) {
        return entityManager.getAllEntities().map(e => e.id);
      }
      if (query.tag) {
        return entityManager.getEntitiesByTag(query.tag).map(e => e.id);
      }
      return entityManager.getAllEntities().map(e => e.id);
    };

    const getEntityPosition = (entityId: string): Vec2 | null => {
      const entity = entityManager.getEntity(entityId);
      return entity ? { x: entity.transform.x, y: entity.transform.y } : null;
    };

    const setEntityPosition = (entityId: string, position: Vec2): void => {
      const entity = entityManager.getEntity(entityId);
      if (!entity) return;

      entity.transform.x = position.x;
      entity.transform.y = position.y;

      if (context.bridge) {
        context.bridge.setPosition(entityId, position.x, position.y);
      }
    };

    const getEntityVelocity = (entityId: string): Vec2 | null => {
      if (!context.physics) return null;
      return context.physics.getLinearVelocity(entityId);
    };

    const setEntityVelocity = (entityId: string, velocity: Vec2): void => {
      if (context.physics) {
        context.physics.setLinearVelocity(entityId, velocity);
      }
    };

    const getEntityRotation = (entityId: string): number | null => {
      const entity = entityManager.getEntity(entityId);
      return entity ? entity.transform.angle : null;
    };

    const getEntityTags = (entityId: string): string[] => {
      const entity = entityManager.getEntity(entityId);
      return entity ? [...entity.tags] : [];
    };

    const hasTag = (entityId: string, tag: string): boolean => {
      return entityManager.hasTag(entityId, tag);
    };

    const getEntityTemplate = (entityId: string): string | undefined => {
      return entityManager.getEntity(entityId)?.template;
    };

    const getVariable = (name: string): unknown => {
      return mutator.getVariable(name);
    };

    const getConstant = (name: string): number | string | boolean | undefined => {
      if (context.evalContext?.variables && name in context.evalContext.variables) {
        const val = context.evalContext.variables[name];
        if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
          return val;
        }
      }
      return undefined;
    };

    const frameId = context.evalContext?.frameId ?? 0;
    let spawnCounter = 0;

    const spawnEntity = (templateId: string, position: Vec2, opts?: SpawnOptions): string | null => {
      const entityId = opts?.entityId ?? `spawned_${frameId}_${spawnCounter}`;
      spawnCounter += 1;

      if (context.bridge) {
        deferredSpawns.push({
          entityId,
          templateId,
          x: position.x,
          y: position.y,
          velocity: opts?.velocity,
        });
      }

      entityManager.cacheEntity(
        entityId,
        templateId,
        { x: position.x, y: position.y, angle: opts?.angle ?? 0, scaleX: 1, scaleY: 1 },
      );

      return entityId;
    };

    const destroyEntity = (entityId: string): void => {
      entityManager.destroyEntity(entityId);
    };

    const setVariable = (name: string, value: unknown): void => {
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        mutator.setVariable(name, value);
      }
    };

    const applyImpulse = (entityId: string, impulse: Vec2): void => {
      if (context.physics) {
        context.physics.applyImpulseToCenter(entityId, impulse);
      }
    };

    const addTag = (entityId: string, tag: string): void => {
      entityManager.addTag(entityId, tag);
    };

    const removeTag = (entityId: string, tag: string): boolean => {
      return entityManager.removeTag(entityId, tag);
    };

    const emit = (eventName: string, data?: Record<string, unknown>): void => {
      mutator.triggerEvent(eventName, data);
    };

    const win = (): void => {
      mutator.setGameState('won');
    };

    const lose = (): void => {
      mutator.setGameState('lost');
    };

    const wOps = context.worldOps;

    const worldAsync: AsyncWorldOps = wOps
      ? { animate: wOps.animate.bind(wOps), wait: wOps.wait.bind(wOps) }
      : { animate: async () => { console.warn('[RunScriptActionExecutor] animate called but no worldOps!'); }, wait: async () => { console.warn('[RunScriptActionExecutor] wait called but no worldOps!'); } };

    const seqMgr = this.sequenceManager;

    const inputSnapshot: InputSnapshot | null = context.inputEvents?.tap ? {
      type: 'tap',
      position: { x: context.inputEvents.tap.x, y: context.inputEvents.tap.y },
      entityId: context.inputEvents.tap.targetEntityId ?? null,
      timestamp: Date.now(),
    } : null;

    const dragSnapshot: DragSnapshot | null = context.input?.drag ? {
      isDragging: true,
      startPosition: { x: context.input.drag.startWorldX, y: context.input.drag.startWorldY },
      currentPosition: { x: context.input.drag.currentWorldX, y: context.input.drag.currentWorldY },
      entityId: context.input.drag.targetEntityId ?? null,
    } : null;

    const seededRandom = this.createSeededRandom(Date.now());

    return {
      spawnEntity,
      destroyEntity,
      cloneEntity: (_entityId: string, _opts?: CloneOptions) => null,
      reparentEntity: (_entityId: string, _newParentId: string, _opts?: ReparentOptions) => {},
      getEntityPosition,
      setEntityPosition,
      getEntityRotation,
      setEntityRotation: (entityId: string, angle: number): void => {
        const entity = entityManager.getEntity(entityId);
        if (!entity) return;
        entity.transform.angle = angle;
        if (entity.physics && context.physics) {
          context.physics.setTransform(entityId, {
            position: { x: entity.transform.x, y: entity.transform.y },
            angle,
          });
        }
        context.bridge?.setRotation(entityId, (angle * 180) / Math.PI);
      },
      getEntityScale: (entityId: string): Vec2 | null => {
        const entity = entityManager.getEntity(entityId);
        if (!entity) return null;
        return { x: entity.transform.scaleX, y: entity.transform.scaleY };
      },
      setEntityScale: (entityId: string, scale: Vec2): void => {
        const entity = entityManager.getEntity(entityId);
        if (!entity) return;
        entity.transform.scaleX = scale.x;
        entity.transform.scaleY = scale.y;
        context.bridge?.setScale(entityId, scale.x, scale.y);
      },
      setEntityVisible: (entityId: string, visible: boolean): void => {
        entityManager.setEntityVisible(entityId, visible);
        context.bridge?.setVisible(entityId, visible);
      },
      getEntityVelocity,
      setEntityVelocity,
      getEntityAngularVelocity: (entityId: string): number | null => {
        const entity = entityManager.getEntity(entityId);
        if (!entity?.physics || !context.physics) return null;
        return context.physics.getAngularVelocity(entityId);
      },
      setEntityAngularVelocity: (entityId: string, velocity: number): void => {
        const entity = entityManager.getEntity(entityId);
        if (!entity?.physics || !context.physics) return;
        context.physics.setAngularVelocity(entityId, velocity);
      },
      applyImpulse,
      applyForce: (entityId: string, force: Vec2): void => {
        const entity = entityManager.getEntity(entityId);
        if (!entity?.physics || !context.physics) return;
        context.physics.applyForceToCenter(entityId, force);
        context.bridge?.applyForce(entityId, force);
      },
      getEntityTags,
      addTag,
      removeTag,
      hasTag,
      getEntityTemplate,
      getEntityData,
      queryEntities,
      queryEntitiesWithData,
      queryPoint: (point: Vec2): string | null => {
        return context.physics?.queryPoint(point) ?? null;
      },
      queryAABB: (min: Vec2, max: Vec2): string[] => {
        return context.physics?.queryAABB(min, max) ?? [];
      },
      raycast: (from: Vec2, to: Vec2, _opts?: RaycastOptions): RaycastHit | null => {
        if (!context.physics) return null;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return null;
        const direction = { x: dx / distance, y: dy / distance };
        const hit = context.physics.raycast(from, direction, distance);
        if (!hit) return null;
        return {
          entityId: hit.entityId,
          point: hit.point,
          normal: hit.normal,
          distance: hit.fraction * distance,
        };
      },
      getVariable,
      setVariable,
      getConstant,
      emit,
      win,
      lose,
      worldAsync,
      startSequence: (name: string, fn: (world: WorldOps) => Promise<void>): SequenceHandle => {
        if (!wOps) {
          console.warn('[RunScriptActionExecutor] startSequence unavailable: no worldOps on RuleContext');
          return { name, get isRunning() { return false; }, cancel: () => {} };
        }
        return seqMgr.start(name, fn, wOps as WorldOps);
      },
      isSequenceRunning: (name: string): boolean => seqMgr.isRunning(name),
      cancelSequence: (name: string): void => seqMgr.cancel(name),
      dt: context.evalContext?.dt ?? 1/60,
      elapsed: context.elapsed,
      frameId: context.evalContext?.frameId ?? 0,
      input: inputSnapshot,
      mouse: context.input?.mouse ? { x: context.input.mouse.x, y: context.input.mouse.y } : null,
      drag: dragSnapshot,
      random: () => seededRandom(),
      randomInt: (min: number, max: number) => Math.floor(seededRandom() * (max - min + 1)) + min,
      randomChoice: <T>(array: readonly T[]) => array[Math.floor(seededRandom() * array.length)],
      clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      distance: (a: Vec2, b: Vec2) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2),
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
