import type { ActionExecutor } from './ActionExecutor';
import type { RunScriptAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { IScriptSandbox } from '@/lib/scripting';
import type { SandboxRuntimeContext, EntityQuery, SpawnOptions, EntityData, AnimateConfig } from '@/lib/scripting/types';

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
    const runtimeContext = this.createRuntimeContext(context);

    const result = this.sandbox.callFunction(runtimeContext, functionName, action.args);

    if (!result.success && result.error) {
      console.error(`[RunScriptActionExecutor] Script error in '${functionName}':`, result.error.message);
      if (result.error.stack) {
        console.error(result.error.stack);
      }
    }
  }

  private createRuntimeContext(context: RuleContext): SandboxRuntimeContext {
    const entityManager = context.entityManager;
    const mutator = context.mutator;

    const getEntityData = (entityId: string): EntityData | null => {
      const entity = entityManager.getEntity(entityId);
      if (!entity) return null;
      return {
        id: entity.id,
        tags: [...entity.tags],
        position: { x: entity.transform.x, y: entity.transform.y },
        template: entity.template,
      };
    };

    const queryEntitiesWithData = (query?: EntityQuery): EntityData[] => {
      let entities = entityManager.getAllEntities();
      if (query?.tag) {
        entities = entityManager.getEntitiesByTag(query.tag);
      }
      return entities.map(e => ({
        id: e.id,
        tags: [...e.tags],
        position: { x: e.transform.x, y: e.transform.y },
        template: e.template,
      }));
    };

    return {
      entityManager: {
        spawnEntity: (templateId: string, position: { x: number; y: number }, opts?: SpawnOptions) => {
          const entity = entityManager.createEntity({
            id: `spawned_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: templateId,
            template: templateId,
            transform: { x: position.x, y: position.y, angle: opts?.angle ?? 0, scaleX: 1, scaleY: 1 },
          });
          return entity.id;
        },
        destroyEntity: (entityId: string) => entityManager.destroyEntity(entityId),
        getEntityPosition: (entityId: string) => {
          const entity = entityManager.getEntity(entityId);
          return entity ? { x: entity.transform.x, y: entity.transform.y } : null;
        },
        setEntityPosition: (entityId: string, position: { x: number; y: number }) => {
          const entity = entityManager.getEntity(entityId);
          if (entity) {
            entity.transform.x = position.x;
            entity.transform.y = position.y;
          }
        },
        getEntityVelocity: (entityId: string) => {
          if (!context.physics) return null;
          const vel = context.physics.getLinearVelocity(entityId);
          return vel ? { x: vel.x, y: vel.y } : null;
        },
        setEntityVelocity: (entityId: string, velocity: { x: number; y: number }) => {
          if (context.physics) {
            context.physics.setLinearVelocity(entityId, velocity);
          }
        },
        applyImpulse: (entityId: string, impulse: { x: number; y: number }) => {
          if (context.physics) {
            context.physics.applyImpulseToCenter(entityId, impulse);
          }
        },
        getEntityTags: (entityId: string) => {
          const entity = entityManager.getEntity(entityId);
          return entity ? [...entity.tags] : [];
        },
        addTag: (entityId: string, tag: string) => entityManager.addTag(entityId, tag),
        removeTag: (entityId: string, tag: string) => entityManager.removeTag(entityId, tag),
        hasTag: (entityId: string, tag: string) => {
          const entity = entityManager.getEntity(entityId);
          return entity ? entity.tags.includes(tag) : false;
        },
        queryEntities: (query?: EntityQuery) => {
          if (!query) {
            return entityManager.getAllEntities().map(e => e.id);
          }
          if (query.tag) {
            return entityManager.getEntitiesByTag(query.tag).map(e => e.id);
          }
          return entityManager.getAllEntities().map(e => e.id);
        },
        getEntityData,
        queryEntitiesWithData,
        getEntityTemplate: (entityId: string) => {
          const entity = entityManager.getEntity(entityId);
          return entity?.template;
        },
      },
      rulesEvaluator: {
        getVariable: (name: string) => mutator.getVariable(name),
        setVariable: (name: string, value: unknown) => {
          if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
            mutator.setVariable(name, value);
          }
        },
        getConstant: (name: string) => {
          if (context.evalContext?.variables && name in context.evalContext.variables) {
            const val = context.evalContext.variables[name];
            if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
              return val;
            }
          }
          return undefined;
        },
        emitEvent: (eventName: string, _data?: Record<string, unknown>) => {
          mutator.triggerEvent(eventName);
        },
        win: () => mutator.setGameState('won'),
        lose: () => mutator.setGameState('lost'),
      },
      animateEntity: context.setEntityTargetPosition
        ? (entityId: string, config: AnimateConfig) => {
            const pos = entityManager.getEntity(entityId);
            if (!pos) return;
            context.setEntityTargetPosition!(
              entityId,
              config.x ?? pos.transform.x,
              config.y ?? pos.transform.y,
              { duration: config.duration, easing: config.easing }
            );
          }
        : undefined,
      inputSnapshot: context.inputEvents?.tap ? {
        type: 'tap',
        position: { x: context.inputEvents.tap.x, y: context.inputEvents.tap.y },
        entityId: context.inputEvents.tap.targetEntityId ?? null,
        timestamp: Date.now(),
      } : null,
      mousePosition: context.input?.mouse ? { x: context.input.mouse.x, y: context.input.mouse.y } : null,
      dragState: context.input?.drag ? {
        isDragging: true,
        startPosition: { x: context.input.drag.startWorldX, y: context.input.drag.startWorldY },
        currentPosition: { x: context.input.drag.currentWorldX, y: context.input.drag.currentWorldY },
        entityId: context.input.drag.targetEntityId ?? null,
      } : null,
      frameInfo: {
        frameId: context.evalContext?.frameId ?? 0,
        elapsed: context.elapsed,
        dt: context.evalContext?.dt ?? 1/60,
      },
    };
  }
}
