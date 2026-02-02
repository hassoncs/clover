import { SystemPhase, getAllSystemExpressionFunctions } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { RulesEvaluator } from '../../../RulesEvaluator';
import type {
  GameRule,
  WinCondition,
  LoseCondition,
  ContainerConfig,
  EvalContext,
  GameVariable,
  StateMachineDefinition,
} from '@slopcade/shared';
import type { ComputedValueSystem } from '@slopcade/shared';
import type { CameraSystem } from '../../../CameraSystem';
import type { InputEntityManager } from '../../../InputEntityManager';
import type { ScriptSandbox } from '@/lib/scripting';
import type { GameState as RuntimeGameState, GameEventBus } from '../../../runtime/types';
import * as StateHelpers from '../../../runtime/GameStateHelpers';

export interface RulesSystemConfig {
  rules: GameRule[];
  winCondition?: WinCondition;
  loseCondition?: LoseCondition;
  variables?: Record<string, GameVariable>;
  containers?: ContainerConfig[];
  stateMachines?: StateMachineDefinition[];
  initialLives?: number;
}

export interface RulesSystemState {
  gameState: string;
  score: number;
  lives: number;
  variables: Record<string, number | string | boolean>;
}

export class RulesRuntimeSystem implements RuntimeSystem<RulesSystemConfig, RulesSystemState> {
  readonly id = 'rules';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 50;
  
  private config: RulesSystemConfig;
  private rulesEvaluator: RulesEvaluator | null = null;
  private systemContext: SystemContext | null = null;
  
  private runtimeState: RuntimeGameState | null = null;
  private eventBus: GameEventBus | null = null;
  
  private computedValues?: ComputedValueSystem;
  private camera?: CameraSystem;
  private inputEntityManager?: InputEntityManager;
  
  constructor(config: RulesSystemConfig) {
    this.config = config;
  }
  
  initialize(ctx: SystemContext, _config: RulesSystemConfig): void {
    this.systemContext = ctx;
    this.rulesEvaluator = new RulesEvaluator(ctx.entityManager, this.config.containers);
    
    this.rulesEvaluator.loadRules(this.config.rules);
    this.rulesEvaluator.setWinCondition(this.config.winCondition);
    this.rulesEvaluator.setLoseCondition(this.config.loseCondition);
    this.rulesEvaluator.setStateMachineDefinitions(this.config.stateMachines);
  }
  
  update(ctx: UpdateContext, _state: RulesSystemState): void {
    if (!this.rulesEvaluator || !this.systemContext || !this.runtimeState || !this.eventBus) return;
    
    const score = StateHelpers.getScore(this.runtimeState);
    const lives = StateHelpers.getLives(this.runtimeState);
    const variablesObj: Record<string, number | string | boolean> = {};
    for (const [key, value] of Object.entries(this.runtimeState.vars)) {
      if (key !== 'score' && key !== 'lives' && key !== 'gameState' && key !== 'elapsed') {
        variablesObj[key] = value;
      }
    }
    
    const smStates = Object.keys(this.runtimeState.stateMachines).length > 0 
      ? Object.fromEntries(
          Object.entries(this.runtimeState.stateMachines).map(([id, sm]) => [
            id,
            { currentState: sm.current, previousState: sm.previous, stateEnteredAt: sm.enteredAt, transitionCount: sm.transitionCount }
          ])
        )
      : null;
    const smDefs = this.rulesEvaluator.getStateMachineDefinitions();
    
    const evalContext: EvalContext = {
      score,
      lives,
      time: ctx.elapsed,
      wave: 1,
      dt: ctx.dt,
      frameId: ctx.frameId,
      variables: {
        ...variablesObj,
        ...(smStates ? { __smStates: smStates as unknown as number } : {}),
        ...(smDefs ? { __smDefs: smDefs as unknown as number } : {}),
      },
      random: Math.random,
      entityManager: this.systemContext.entityManager,
      customFunctions: getAllSystemExpressionFunctions(),
    };
    
    const inputEvents = this.convertFrameInputEvents(ctx.frame.inputEvents);
    
    this.rulesEvaluator.update(
      ctx.dt,
      this.systemContext.entityManager,
      ctx.frame.collisions,
      ctx.input as any,
      inputEvents,
      this.systemContext.physics,
      this.runtimeState,
      this.eventBus,
      this.computedValues,
      evalContext,
      this.camera,
      () => {},
      this.inputEntityManager,
      (soundId) => this.systemContext!.bridge.playSound(soundId),
      this.systemContext.bridge
    );
  }
  
  private convertFrameInputEvents(frameEvents: readonly import('../types').InputEvent[]): import('../../../BehaviorContext').InputEvents {
    const result: import('../../../BehaviorContext').InputEvents = {};
    const buttonPressed = new Set<string>();
    const buttonReleased = new Set<string>();
    
    for (const event of frameEvents) {
      switch (event.type) {
        case 'tap':
          result.tap = { x: event.x, y: event.y, worldX: event.worldX, worldY: event.worldY, targetEntityId: event.targetEntityId };
          break;
        case 'drag_start':
          result.dragStart = { x: event.x, y: event.y, worldX: event.worldX, worldY: event.worldY, targetEntityId: event.targetEntityId };
          break;
        case 'drag_end':
          result.dragEnd = { velocityX: event.velocityX, velocityY: event.velocityY, worldVelocityX: event.worldVelocityX, worldVelocityY: event.worldVelocityY };
          break;
        case 'button_pressed':
          buttonPressed.add(event.button);
          break;
        case 'button_released':
          buttonReleased.add(event.button);
          break;
        case 'game_started':
          result.gameStarted = true;
          break;
      }
    }
    
    if (buttonPressed.size > 0) result.buttonPressed = buttonPressed;
    if (buttonReleased.size > 0) result.buttonReleased = buttonReleased;
    
    return result;
  }
  
  destroy(): void {
    this.rulesEvaluator = null;
    this.systemContext = null;
    this.runtimeState = null;
    this.eventBus = null;
    this.computedValues = undefined;
    this.camera = undefined;
    this.inputEntityManager = undefined;
  }
  
  getState(): RulesSystemState {
    if (!this.runtimeState) {
      return {
        gameState: 'ready',
        score: 0,
        lives: 3,
        variables: {},
      };
    }
    
    const variables: Record<string, number | string | boolean> = {};
    for (const [key, value] of Object.entries(this.runtimeState.vars)) {
      if (key !== 'score' && key !== 'lives' && key !== 'gameState' && key !== 'elapsed') {
        variables[key] = value;
      }
    }
    
    return {
      gameState: StateHelpers.getGameStateValue(this.runtimeState),
      score: StateHelpers.getScore(this.runtimeState),
      lives: StateHelpers.getLives(this.runtimeState),
      variables,
    };
  }
  
  getRulesEvaluator(): RulesEvaluator | null {
    return this.rulesEvaluator;
  }
  
  setRuntimeState(state: RuntimeGameState): void {
    this.runtimeState = state;
  }
  
  setEventBus(bus: GameEventBus): void {
    this.eventBus = bus;
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
  
  setScriptSandbox(scriptSandbox: ScriptSandbox): void {
    if (this.rulesEvaluator) {
      this.rulesEvaluator.setScriptSandbox(scriptSandbox);
    }
  }
}
