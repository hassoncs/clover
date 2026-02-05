import type { ActionExecutor } from './ActionExecutor';
import type { RunScriptAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { IScriptSandbox } from '@/lib/scripting';
import type { ScriptContext, InputSnapshot, DragSnapshot } from '@/lib/scripting/types';
import type { WorldOps, WorldEntityQuery, WorldEntityData, SequenceHandle } from '@slopcade/shared/types/world-ops';
import type { Vec2 } from '@slopcade/shared/types/common';

interface DeferredSpawn {
  entityId: string;
  templateId: string;
  x: number;
  y: number;
  velocity?: { x: number; y: number };
}

export class RunScriptActionExecutor implements ActionExecutor<RunScriptAction> {
  private sandbox: IScriptSandbox | null = null;

  setSandbox(sandbox: IScriptSandbox): void {
    this.sandbox = sandbox;
  }

  execute(action: RunScriptAction, context: RuleContext): void {
    console.log("[Lifecycle] RunScriptActionExecutor.execute called with action:", action);
    if (!this.sandbox) {
      console.warn('[RunScriptActionExecutor] No script sandbox available - sandbox not set!');
      return;
    }

    const functionName = action.export ?? 'default';
    console.log("[Lifecycle] Calling sandbox.callFunction:", functionName);

    const deferredSpawns: DeferredSpawn[] = [];
    const scriptContext = this.createScriptContext(context, deferredSpawns);

    const result = this.sandbox.callFunction(scriptContext, functionName, action.args);

    for (const spawn of deferredSpawns) {
      if (context.bridge) {
        context.bridge.spawnEntity(spawn.templateId, spawn.x, spawn.y, spawn.velocity);
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
    const worldOps = context.worldOps;

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

    const getPosition = (entityId: string): Vec2 | null => {
      const entity = entityManager.getEntity(entityId);
      return entity ? { x: entity.transform.x, y: entity.transform.y } : null;
    };

    const getVelocity = (entityId: string): Vec2 | null => {
      if (!context.physics) return null;
      return context.physics.getLinearVelocity(entityId);
    };

    const getRotation = (entityId: string): number | null => {
      const entity = entityManager.getEntity(entityId);
      return entity ? entity.transform.angle : null;
    };

    const getTags = (entityId: string): string[] => {
      const entity = entityManager.getEntity(entityId);
      return entity ? [...entity.tags] : [];
    };

    const hasTag = (entityId: string, tag: string): boolean => {
      return entityManager.hasTag(entityId, tag);
    };

    const getTemplate = (entityId: string): string | undefined => {
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

    const minimalWorldOps: WorldOps = {
      spawn: (templateId: string, position: Vec2, opts?: { velocity?: Vec2; angle?: number; data?: Record<string, unknown> }) => {
        if (worldOps) {
          return worldOps.spawn(templateId, position, opts);
        }

        const entityId = `spawned_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        if (context.bridge) {
          deferredSpawns.push({
            entityId,
            templateId,
            x: position.x,
            y: position.y,
            velocity: opts?.velocity,
          });
        }

        entityManager.createEntity({
          id: entityId,
          name: templateId,
          template: templateId,
          transform: { x: position.x, y: position.y, angle: opts?.angle ?? 0, scaleX: 1, scaleY: 1 },
        });

        return Promise.resolve(entityId);
      },
      destroy: (entityId: string) => {
        if (worldOps) {
          return worldOps.destroy(entityId);
        }
        entityManager.destroyEntity(entityId);
        return Promise.resolve();
      },
      clone: () => Promise.resolve(null),
      reparent: () => Promise.resolve(),
      getPosition: (entityId: string) => Promise.resolve(getPosition(entityId)),
      setPosition: (entityId: string, position: Vec2) => {
        if (worldOps) {
          return worldOps.setPosition(entityId, position);
        }
        const entity = entityManager.getEntity(entityId);
        if (entity) {
          entity.transform.x = position.x;
          entity.transform.y = position.y;
          if (context.bridge) {
            context.bridge.setPosition(entityId, position.x, position.y);
          }
        }
        return Promise.resolve();
      },
      getRotation: (entityId: string) => Promise.resolve(getRotation(entityId)),
      setRotation: () => Promise.resolve(),
      getScale: () => Promise.resolve(null),
      setScale: () => Promise.resolve(),
      setVisible: () => Promise.resolve(),
      getVelocity: (entityId: string) => Promise.resolve(getVelocity(entityId)),
      getAngularVelocity: () => Promise.resolve(null),
      setAngularVelocity: () => Promise.resolve(),
      setVelocity: (entityId: string, velocity: Vec2) => {
        if (worldOps) {
          return worldOps.setVelocity(entityId, velocity);
        }
        if (context.physics) {
          context.physics.setLinearVelocity(entityId, velocity);
        }
        return Promise.resolve();
      },
      applyImpulse: (entityId: string, impulse: Vec2) => {
        if (worldOps) {
          return worldOps.applyImpulse(entityId, impulse);
        }
        if (context.physics) {
          context.physics.applyImpulseToCenter(entityId, impulse);
        }
        return Promise.resolve();
      },
      applyForce: () => Promise.resolve(),
      getTags: (entityId: string) => Promise.resolve(getTags(entityId)),
      addTag: (entityId: string, tag: string) => {
        if (worldOps) {
          return worldOps.addTag(entityId, tag);
        }
        entityManager.addTag(entityId, tag);
        return Promise.resolve();
      },
      removeTag: (entityId: string, tag: string) => {
        if (worldOps) {
          return worldOps.removeTag(entityId, tag);
        }
        return Promise.resolve(entityManager.removeTag(entityId, tag));
      },
      hasTag: (entityId: string, tag: string) => Promise.resolve(hasTag(entityId, tag)),
      getTemplate: (entityId: string) => Promise.resolve(getTemplate(entityId)),
      getEntityData: (entityId: string) => Promise.resolve(getEntityData(entityId)),
      queryEntities: (query?: WorldEntityQuery) => Promise.resolve(queryEntities(query)),
      queryEntitiesWithData: (query?: WorldEntityQuery) => Promise.resolve(queryEntitiesWithData(query)),
      queryPoint: () => Promise.resolve(null),
      queryAABB: () => Promise.resolve([]),
      raycast: () => Promise.resolve(null),
      animate: () => Promise.resolve(),
      wait: () => Promise.resolve(),
      getVariable: (name: string) => Promise.resolve(getVariable(name)),
      setVariable: (name: string, value: unknown) => {
        if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
          mutator.setVariable(name, value);
        }
        return Promise.resolve();
      },
      getConstant: (name: string) => Promise.resolve(getConstant(name)),
      emit: (eventName: string) => {
        mutator.triggerEvent(eventName);
        return Promise.resolve();
      },
      win: () => {
        mutator.setGameState('won');
        return Promise.resolve();
      },
      lose: () => {
        mutator.setGameState('lost');
        return Promise.resolve();
      },
    };

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
      getPosition,
      getVelocity,
      getRotation,
      getTags,
      hasTag,
      getTemplate,
      getVariable,
      getConstant,
      queryEntities,
      getEntityData,
      queryEntitiesWithData,
      world: minimalWorldOps,
      startSequence: () => ({ name: '', isRunning: false, cancel: () => {} } as SequenceHandle),
      isSequenceRunning: () => false,
      cancelSequence: () => {},
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
