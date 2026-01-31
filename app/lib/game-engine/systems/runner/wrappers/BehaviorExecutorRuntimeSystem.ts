import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { BehaviorExecutor, createBehaviorExecutor } from '../../../BehaviorExecutor';
import type { BehaviorContext } from '../../../BehaviorContext';
import type { RuntimeEntity } from '../../../types';
import type { ComputedValueSystem, EvalContext } from '@slopcade/shared';
import type { CameraSystem } from '../../../CameraSystem';
import type { InputEntityManager } from '../../../InputEntityManager';
import type { CollisionInfo } from '../../../BehaviorContext';

export interface BehaviorExecutorSystemConfig {
  pixelsPerMeter: number;
}

export interface BehaviorExecutorSystemState {
  executionCount: number;
  lastExecutionTime: number;
}

export class BehaviorExecutorRuntimeSystem implements RuntimeSystem<BehaviorExecutorSystemConfig, BehaviorExecutorSystemState> {
  readonly id = 'behavior-executor';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 30;
  
  private behaviorExecutor: BehaviorExecutor | null = null;
  private systemContext: SystemContext | null = null;
  private config: BehaviorExecutorSystemConfig | null = null;
  private executionCount = 0;
  private lastExecutionTime = 0;
  
  private computedValues?: ComputedValueSystem;
  private camera?: CameraSystem;
  private inputEntityManager?: InputEntityManager;
  
  initialize(ctx: SystemContext, config: BehaviorExecutorSystemConfig): void {
    this.systemContext = ctx;
    this.config = config;
    this.behaviorExecutor = createBehaviorExecutor();
  }
  
  update(ctx: UpdateContext, _state: BehaviorExecutorSystemState): void {
    if (!this.behaviorExecutor || !this.systemContext) return;
    
    const startTime = performance.now();
    
    const entities = this.systemContext.entityManager.getAllEntities() as RuntimeEntity[];
    const activeEntities = entities.filter(e => e.active);
    
    const behaviorContext = this.createBehaviorContext(ctx);
    
    this.behaviorExecutor.executeAll(activeEntities, behaviorContext);
    
    this.executionCount++;
    this.lastExecutionTime = performance.now() - startTime;
  }
  
  destroy(): void {
    this.behaviorExecutor = null;
    this.systemContext = null;
    this.computedValues = undefined;
    this.camera = undefined;
    this.inputEntityManager = undefined;
    this.executionCount = 0;
    this.lastExecutionTime = 0;
  }
  
  getState(): BehaviorExecutorSystemState {
    return {
      executionCount: this.executionCount,
      lastExecutionTime: this.lastExecutionTime,
    };
  }
  
  getBehaviorExecutor(): BehaviorExecutor | null {
    return this.behaviorExecutor;
  }
  
  setComputedValues(computedValues: ComputedValueSystem): void {
    this.computedValues = computedValues;
  }
  
  setCamera(camera: CameraSystem): void {
    this.camera = camera;
  }
  
  setInputEntityManager(inputEntityManager: InputEntityManager): void {
    this.inputEntityManager = inputEntityManager;
  }
  
  private createBehaviorContext(ctx: UpdateContext): Omit<BehaviorContext, 'entity' | 'resolveNumber' | 'resolveVec2'> {
    if (!this.systemContext || !this.config) {
      throw new Error('[BehaviorExecutorRuntimeSystem] Cannot create context without systemContext or config');
    }
    
    const evalContext: EvalContext = {
      score: ctx.gameState.score,
      lives: ctx.gameState.lives,
      time: ctx.elapsed,
      wave: 1,
      dt: ctx.dt,
      frameId: ctx.frameId,
      variables: ctx.gameState.variables,
      random: Math.random,
      entityManager: this.systemContext.entityManager,
      customFunctions: {},
    };
    
    const collisions: CollisionInfo[] = [];
    
    return {
      dt: ctx.dt,
      elapsed: ctx.elapsed,
      input: ctx.input as any,
      gameState: ctx.gameState as any,
      entityManager: this.systemContext.entityManager,
      physics: this.systemContext.physics,
      collisions,
      pixelsPerMeter: this.config.pixelsPerMeter,
      
      computedValues: this.computedValues!,
      evalContext,
      createEvalContextForEntity: (entity) => {
        if (!entity) return evalContext;
        return {
          ...evalContext,
          entity: {
            id: entity.id,
            x: entity.transform.x,
            y: entity.transform.y,
            angle: entity.transform.angle,
            vx: 0,
            vy: 0,
          },
        };
      },
      
      addScore: (points: number) => {
        this.systemContext!.eventQueue.emit('score_changed', { delta: points });
      },
      setGameState: (state: string) => {
        this.systemContext!.eventQueue.emit('game_state_changed', { state });
      },
      spawnEntity: (templateId: string, x: number, y: number) => {
        const template = this.systemContext!.entityManager.getTemplate(templateId);
        if (!template) return null;
        return this.systemContext!.bridge.spawnEntity(templateId, x, y);
      },
      setEntityVelocity: (entityId: string, velocity: { x: number; y: number }) => {
        this.systemContext!.bridge.setLinearVelocity(entityId, velocity);
      },
      setEntityRotation: (entityId: string, angle: number) => {
        this.systemContext!.bridge.setRotation(entityId, angle);
      },
      setEntityPosition: (entityId: string, x: number, y: number) => {
        this.systemContext!.bridge.setPosition(entityId, x, y);
      },
      setEntityOpacity: (entityId: string, opacity: number) => {
        this.systemContext!.bridge.setOpacity(entityId, opacity);
      },
      destroyEntity: (entityId: string) => {
        this.systemContext!.entityManager.destroyEntity(entityId);
      },
      triggerEvent: (eventName: string, data?: Record<string, unknown>) => {
        this.systemContext!.eventBus.emit(eventName, data);
      },
      triggerParticleEffect: (type: any, x: number, y: number) => {
        this.systemContext!.bridge.spawnParticle(type, x, y);
      },
      createEntityEmitter: (_type: any, _x: number, _y: number) => {
        return `emitter_${Date.now()}`;
      },
      updateEmitterPosition: (_emitterId: string, _x: number, _y: number) => {},
      stopEmitter: (_emitterId: string) => {},
      playSound: (soundId: string) => {
        this.systemContext!.bridge.playSound(soundId);
      },
      applySpriteEffect: (entityId: string, effect: any, params?: Record<string, unknown>) => {
        this.systemContext!.bridge.applySpriteEffect(entityId, effect, params);
      },
      clearSpriteEffect: (entityId: string) => {
        this.systemContext!.bridge.clearSpriteEffect(entityId);
      },
    };
  }
}
