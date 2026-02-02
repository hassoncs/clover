import { SystemPhase, getAllSystemExpressionFunctions } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import type {
  GameRule,
  WinCondition,
  LoseCondition,
  RuleTrigger,
  RuleCondition,
  RuleAction,
  ContainerConfig,
  EvalContext,
  GameVariable,
  StateMachineDefinition,
  TransitionDefinition,
  ComputedValueSystem,
} from '@slopcade/shared';
import { evaluate } from '@slopcade/shared';
import type { GameState as BehaviorGameState, InputState } from '../../../BehaviorContext';
import type { IGameStateMutator, RuleContext, ListValue } from '../../../rules/types';
import type { InputEvents } from '../../../BehaviorContext';
import type { CameraSystem } from '../../../CameraSystem';
import type { InputEntityManager } from '../../../InputEntityManager';
import type { ScriptSandbox } from '@/lib/scripting';
import type { GameState as RuntimeGameState, GameEventBus, GameStateValue, VarValue } from '../../../runtime/types';
import * as StateHelpers from '../../../runtime/GameStateHelpers';
import { RESERVED_VARS } from '../../../runtime/types';

import {
  SpawnActionExecutor,
  DestroyActionExecutor,
  PhysicsActionExecutor,
  LogicActionExecutor,
  EntityActionExecutor,
  CameraActionExecutor,
  SoundActionExecutor,
  SetEntitySizeActionExecutor,
  ComboActionExecutor,
  CheckpointActionExecutor,
  GridActionExecutor,
  InventoryActionExecutor,
  PathActionExecutor,
  ProgressionActionExecutor,
  SpatialQueryActionExecutor,
  StateMachineActionExecutor,
  WaveActionExecutor,
  BallSortActionExecutor,
  ContainerActionExecutor,
  RunScriptActionExecutor,
  ActionRegistry,
} from '../../../rules/actions';
import {
  LogicConditionEvaluator,
  PhysicsConditionEvaluator,
  ContainerConditionEvaluator,
} from '../../../rules/conditions';
import {
  CollisionTriggerEvaluator,
  InputTriggerEvaluator,
  LogicTriggerEvaluator,
} from '../../../rules/triggers';
import { ContainerSystem } from '../../../systems/ContainerSystem';

export interface RulesSystemConfig {
  rules: GameRule[];
  winCondition?: WinCondition;
  loseCondition?: LoseCondition;
  variables?: Record<string, GameVariable>;
  containers?: ContainerConfig[];
  stateMachines?: StateMachineDefinition[];
}

export interface RulesSystemState {
  gameState: string;
  variables: Record<string, number | string | boolean>;
}

export class RulesSystem implements RuntimeSystem<RulesSystemConfig, RulesSystemState>, IGameStateMutator {
  readonly id = 'rules';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 50;
  
  private config: RulesSystemConfig;
  private systemContext: SystemContext | null = null;
  private runtimeState: RuntimeGameState | null = null;
  private eventBus: GameEventBus | null = null;
  
  private rules: GameRule[] = [];
  private winCondition: WinCondition | null = null;
  private loseCondition: LoseCondition | null = null;
  private smDefs: Record<string, StateMachineDefinition> | null = null;
  
  private currentState: RuntimeGameState | null = null;
  private currentEvents: GameEventBus | null = null;
  
  private actionRegistry: ActionRegistry;
  private runScriptActionExecutor: RunScriptActionExecutor;
  
  private logicConditionEvaluator = new LogicConditionEvaluator();
  private physicsConditionEvaluator = new PhysicsConditionEvaluator();
  private containerConditionEvaluator!: ContainerConditionEvaluator;
  
  private collisionTriggerEvaluator = new CollisionTriggerEvaluator();
  private inputTriggerEvaluator = new InputTriggerEvaluator();
  private logicTriggerEvaluator = new LogicTriggerEvaluator();
  
  private computedValues?: ComputedValueSystem;
  private camera?: CameraSystem;
  private inputEntityManager?: InputEntityManager;
  
  constructor(config: RulesSystemConfig) {
    this.config = config;
    
    const spawnActionExecutor = new SpawnActionExecutor();
    const destroyActionExecutor = new DestroyActionExecutor();
    const physicsActionExecutor = new PhysicsActionExecutor();
    const logicActionExecutor = new LogicActionExecutor();
    const entityActionExecutor = new EntityActionExecutor();
    const cameraActionExecutor = new CameraActionExecutor();
    const soundActionExecutor = new SoundActionExecutor();
    const setEntitySizeActionExecutor = new SetEntitySizeActionExecutor();
    const comboActionExecutor = new ComboActionExecutor();
    const checkpointActionExecutor = new CheckpointActionExecutor();
    const gridActionExecutor = new GridActionExecutor();
    const inventoryActionExecutor = new InventoryActionExecutor();
    const pathActionExecutor = new PathActionExecutor();
    const progressionActionExecutor = new ProgressionActionExecutor();
    const spatialQueryActionExecutor = new SpatialQueryActionExecutor();
    const stateMachineActionExecutor = new StateMachineActionExecutor();
    const waveActionExecutor = new WaveActionExecutor();
    const ballSortActionExecutor = new BallSortActionExecutor();
    
    this.runScriptActionExecutor = new RunScriptActionExecutor();
    
    this.actionRegistry = new ActionRegistry(
      spawnActionExecutor,
      destroyActionExecutor,
      physicsActionExecutor,
      logicActionExecutor,
      entityActionExecutor,
      cameraActionExecutor,
      soundActionExecutor,
      setEntitySizeActionExecutor,
      comboActionExecutor,
      checkpointActionExecutor,
      gridActionExecutor,
      inventoryActionExecutor,
      pathActionExecutor,
      progressionActionExecutor,
      spatialQueryActionExecutor,
      stateMachineActionExecutor,
      waveActionExecutor,
      ballSortActionExecutor,
      {} as ContainerActionExecutor,
      this.runScriptActionExecutor,
    );
  }
  
  initialize(ctx: SystemContext, _config: RulesSystemConfig): void {
    this.systemContext = ctx;
    
    const containerSystem = new ContainerSystem(ctx.entityManager, { 
      containers: this.config.containers 
    });
    
    this.containerConditionEvaluator = new ContainerConditionEvaluator(containerSystem);
    
    const containerActionExecutor = new ContainerActionExecutor(containerSystem);
    const spawnActionExecutor = new SpawnActionExecutor();
    const destroyActionExecutor = new DestroyActionExecutor();
    const physicsActionExecutor = new PhysicsActionExecutor();
    const logicActionExecutor = new LogicActionExecutor();
    const entityActionExecutor = new EntityActionExecutor();
    const cameraActionExecutor = new CameraActionExecutor();
    const soundActionExecutor = new SoundActionExecutor();
    const setEntitySizeActionExecutor = new SetEntitySizeActionExecutor();
    const comboActionExecutor = new ComboActionExecutor();
    const checkpointActionExecutor = new CheckpointActionExecutor();
    const gridActionExecutor = new GridActionExecutor();
    const inventoryActionExecutor = new InventoryActionExecutor();
    const pathActionExecutor = new PathActionExecutor();
    const progressionActionExecutor = new ProgressionActionExecutor();
    const spatialQueryActionExecutor = new SpatialQueryActionExecutor();
    const stateMachineActionExecutor = new StateMachineActionExecutor();
    const waveActionExecutor = new WaveActionExecutor();
    const ballSortActionExecutor = new BallSortActionExecutor();
    
    this.actionRegistry = new ActionRegistry(
      spawnActionExecutor,
      destroyActionExecutor,
      physicsActionExecutor,
      logicActionExecutor,
      entityActionExecutor,
      cameraActionExecutor,
      soundActionExecutor,
      setEntitySizeActionExecutor,
      comboActionExecutor,
      checkpointActionExecutor,
      gridActionExecutor,
      inventoryActionExecutor,
      pathActionExecutor,
      progressionActionExecutor,
      spatialQueryActionExecutor,
      stateMachineActionExecutor,
      waveActionExecutor,
      ballSortActionExecutor,
      containerActionExecutor,
      this.runScriptActionExecutor,
    );
    
    this.rules = this.config.rules;
    this.winCondition = this.config.winCondition ?? null;
    this.loseCondition = this.config.loseCondition ?? null;
    
    if (this.config.stateMachines && this.config.stateMachines.length > 0) {
      const smDefs: Record<string, StateMachineDefinition> = {};
      for (const sm of this.config.stateMachines) {
        smDefs[sm.id] = sm;
      }
      this.smDefs = smDefs;
    }
  }
  
  update(ctx: UpdateContext, state: RulesSystemState): void;
  update(
    dt: number,
    entityManager: import('../../../EntityManager').EntityManager,
    collisions: import('../../../BehaviorContext').CollisionInfo[],
    input: import('../../../BehaviorContext').InputState,
    inputEvents: InputEvents,
    physics: import('../../../../physics2d/Physics2D').Physics2D,
    gameState: RuntimeGameState,
    events: GameEventBus,
    computedValues?: ComputedValueSystem,
    evalContext?: EvalContext,
    camera?: CameraSystem,
    setTimeScale?: (scale: number, duration?: number) => void,
    inputEntityManager?: InputEntityManager,
    playSound?: (soundId: string, volume?: number) => void,
    bridge?: import('../../../../godot/types').GodotBridge
  ): void;
  update(ctxOrDt: UpdateContext | number, stateOrEntityManager: RulesSystemState | import('../../../EntityManager').EntityManager, ...args: any[]): void {
    if (typeof ctxOrDt === 'number') {
      const dt = ctxOrDt;
      const entityManager = stateOrEntityManager as import('../../../EntityManager').EntityManager;
      const [
        collisions, 
        input, 
        inputEvents, 
        physics, 
        gameState, 
        events, 
        computedValues,
        evalContext,
        camera,
        setTimeScale,
        inputEntityManager,
        playSound,
        bridge
      ] = args;

      this.systemContext = {
        entityManager,
        physics,
        bridge: bridge || this.systemContext?.bridge || ({ playSound: () => {} } as any),
        eventBus: events || this.eventBus || ({ emit: () => {}, on: () => {}, off: () => {} } as any),
        eventQueue: this.systemContext?.eventQueue || ({ enqueue: () => {}, process: () => {}, clear: () => {} } as any),
      };
      this.runtimeState = gameState;
      this.eventBus = events;
      this.camera = camera;
      this.currentState = gameState;
      this.currentEvents = events;
      this.computedValues = computedValues;
      this.inputEntityManager = inputEntityManager;

      if (StateHelpers.getGameStateValue(gameState) !== "playing") {
        return;
      }

      const elapsed = StateHelpers.getElapsed(gameState) + dt;
      StateHelpers.setElapsed(gameState, elapsed);

      const ruleContext: RuleContext = {
        entityManager,
        inputEntityManager: this.inputEntityManager,
        physics,
        mutator: this,
        camera,
        bridge,
        setTimeScale: setTimeScale || (() => {}),
        playSound: playSound || ((soundId: string) => this.systemContext!.bridge.playSound(soundId)),
        setEntityTargetPosition: () => {},
        elapsed,
        collisions,
        events: gameState.pendingEvents,
        input: input as any,
        inputEvents,
        computedValues: this.computedValues,
        evalContext: evalContext || {
          time: elapsed,
          wave: 1,
          dt,
          frameId: 0,
          variables: {},
          random: Math.random,
          entityManager,
        },
      } as unknown as RuleContext & { cooldowns: Map<string, number> };
      (ruleContext as any).cooldowns = gameState.cooldowns;

      if (this.checkWinCondition(ruleContext)) {
        this.setGameState("won");
        return;
      }

      if (this.checkLoseCondition(ruleContext)) {
        this.setGameState("lost");
        return;
      }

      for (const rule of this.rules) {
        if (rule.enabled === false) continue;
        if (rule.fireOnce && gameState.firedOnce.has(rule.id)) continue;

        const cooldownEnd = gameState.cooldowns.get(rule.id);
        if (cooldownEnd && elapsed < cooldownEnd) continue;

        const triggerResult = this.evaluateTrigger(rule.trigger, ruleContext);
        if (triggerResult) {
          const conditionsResult = this.evaluateConditions(rule.conditions, ruleContext);
          if (conditionsResult) {
            this.executeActions(rule.actions, ruleContext);

            if (rule.fireOnce) {
              gameState.firedOnce.add(rule.id);
            }

            if (rule.cooldown) {
              gameState.cooldowns.set(rule.id, elapsed + rule.cooldown);
            }
          }
        }
      }

      this.processStateMachineEvents(gameState);
      StateHelpers.clearPendingEvents(gameState);

      this.currentState = null;
      this.currentEvents = null;
    } else {
      const ctx = ctxOrDt;
      if (!this.systemContext || !this.runtimeState || !this.eventBus) return;
      
      this.currentState = this.runtimeState;
      this.currentEvents = this.eventBus;
      
      try {
        if (StateHelpers.getGameStateValue(this.runtimeState) !== "playing") {
          return;
        }
        
        const elapsed = StateHelpers.getElapsed(this.runtimeState) + ctx.dt;
        StateHelpers.setElapsed(this.runtimeState, elapsed);
        
        const variablesObj: Record<string, number | string | boolean> = {};
        for (const [key, value] of Object.entries(this.runtimeState.vars)) {
          if (key !== 'gameState' && key !== 'elapsed') {
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
        const smDefs = this.smDefs;
        
        const evalContext: EvalContext = {
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
        
        const ruleContext: RuleContext = {
          entityManager: this.systemContext.entityManager,
          inputEntityManager: this.inputEntityManager,
          physics: this.systemContext.physics,
          mutator: this,
          camera: this.camera,
          bridge: this.systemContext.bridge,
          setTimeScale: () => {},
          playSound: (soundId: string) => this.systemContext!.bridge.playSound(soundId),
          setEntityTargetPosition: (entityId: string, x: number, y: number, config?: { duration?: number; easing?: string }) => {
            const entity = this.systemContext!.entityManager.getEntity(entityId);
            if (!entity) return;
            
            const distance = Math.sqrt(
              Math.pow(x - entity.transform.x, 2) + Math.pow(y - entity.transform.y, 2)
            );
            const duration = config?.duration ?? Math.min(0.3, Math.max(0.1, distance / 10));
            const easing = config?.easing ?? 'easeOutQuad';
            
            entity.movementTarget = {
              x,
              y,
              startX: entity.transform.x,
              startY: entity.transform.y,
              startTime: elapsed,
              duration,
              easing,
            };
          },
          elapsed,
          collisions: ctx.frame.collisions,
          events: this.runtimeState.pendingEvents,
          input: ctx.input as any,
          inputEvents,
          computedValues: this.computedValues,
          evalContext,
        } as unknown as RuleContext & { cooldowns: Map<string, number> };
        (ruleContext as any).cooldowns = this.runtimeState.cooldowns;
        
        if (this.checkWinCondition(ruleContext)) {
          this.setGameState("won");
          return;
        }
        
        if (this.checkLoseCondition(ruleContext)) {
          this.setGameState("lost");
          return;
        }
        
        for (const rule of this.rules) {
          if (rule.enabled === false) continue;
          if (rule.fireOnce && this.runtimeState.firedOnce.has(rule.id)) continue;
          
          const cooldownEnd = this.runtimeState.cooldowns.get(rule.id);
          if (cooldownEnd && elapsed < cooldownEnd) continue;
          
          const triggerResult = this.evaluateTrigger(rule.trigger, ruleContext);
          if (triggerResult) {
            const conditionsResult = this.evaluateConditions(rule.conditions, ruleContext);
            if (conditionsResult) {
              this.executeActions(rule.actions, ruleContext);
              
              if (rule.fireOnce) {
                this.runtimeState.firedOnce.add(rule.id);
              }
              
              if (rule.cooldown) {
                this.runtimeState.cooldowns.set(rule.id, elapsed + rule.cooldown);
              }
            }
          }
        }
        
        this.processStateMachineEvents(this.runtimeState);
        
        StateHelpers.clearPendingEvents(this.runtimeState);
      } finally {
        this.currentState = null;
        this.currentEvents = null;
      }
    }
  }
  
  destroy(): void {
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
        variables: {},
      };
    }

    const variables: Record<string, number | string | boolean> = {};
    for (const [key, value] of Object.entries(this.runtimeState.vars)) {
      if (key !== 'gameState' && key !== 'elapsed') {
        variables[key] = value;
      }
    }

    return {
      gameState: StateHelpers.getGameStateValue(this.runtimeState),
      variables,
    };
  }
  
  private requireState(): RuntimeGameState {
    if (!this.currentState) {
      throw new Error("RulesSystem methods called outside of update() context");
    }
    return this.currentState;
  }

  getElapsed(): number {
    const state = this.requireState();
    return StateHelpers.getElapsed(state);
  }
  
  setGameState(state: BehaviorGameState["state"]): void {
    const gameState = this.requireState();
    StateHelpers.setGameStateValue(gameState, state as GameStateValue, this.currentEvents ?? undefined);
  }
  
  getGameStateValue(): BehaviorGameState["state"] {
    const state = this.requireState();
    return StateHelpers.getGameStateValue(state);
  }
  
  triggerEvent(eventName: string, data?: unknown): void {
    const state = this.requireState();
    StateHelpers.triggerEvent(state, eventName, data);
  }
  
  setVariable(name: string, value: number | string | boolean): void {
    const state = this.requireState();
    StateHelpers.setVar(state, name, value, this.currentEvents ?? undefined);
  }
  
  getVariable(name: string): number | string | boolean | undefined {
    const state = this.requireState();
    return StateHelpers.getVar(state, name);
  }
  
  getVariables(): Record<string, number | string | boolean> {
    const state = this.requireState();
    const result: Record<string, VarValue> = {};
    for (const [key, value] of Object.entries(state.vars)) {
      if (key !== RESERVED_VARS.GAME_STATE && key !== RESERVED_VARS.ELAPSED) {
        result[key] = value;
      }
    }
    return result;
  }
  
  getStateMachineStates(): Record<string, { currentState: string; previousState: string; stateEnteredAt: number; transitionCount: number }> | null {
    const state = this.requireState();
    if (Object.keys(state.stateMachines).length === 0) return null;
    const result: Record<string, { currentState: string; previousState: string; stateEnteredAt: number; transitionCount: number }> = {};
    for (const [id, sm] of Object.entries(state.stateMachines)) {
      result[id] = {
        currentState: sm.current,
        previousState: sm.previous,
        stateEnteredAt: sm.enteredAt,
        transitionCount: sm.transitionCount,
      };
    }
    return result;
  }
  
  getStateMachineDefinitions(): Record<string, StateMachineDefinition> | null {
    return this.smDefs;
  }
  
  setCooldown(id: string, time: number): void {
    const state = this.requireState();
    state.cooldowns.set(id, time);
  }
  
  getList(name: string): ListValue | undefined {
    const state = this.requireState();
    return StateHelpers.getList(state, name);
  }
  
  setList(name: string, value: ListValue): void {
    const state = this.requireState();
    StateHelpers.setList(state, name, value);
  }
  
  pushToList(name: string, value: number | string | boolean): void {
    const state = this.requireState();
    StateHelpers.pushToList(state, name, value);
  }
  
  popFromList(
    name: string,
    position: "front" | "back",
  ): number | string | boolean | undefined {
    const state = this.requireState();
    return StateHelpers.popFromList(state, name, position);
  }
  
  shuffleList(name: string, random: () => number = Math.random): void {
    const state = this.requireState();
    StateHelpers.shuffleList(state, name, random);
  }
  
  listContains(name: string, value: number | string | boolean): boolean {
    const state = this.requireState();
    return StateHelpers.listContains(state, name, value);
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
    this.runScriptActionExecutor.setSandbox(scriptSandbox);
  }

  loadRules(rules: GameRule[]): void {
    this.rules = rules;
  }

  setWinCondition(condition: WinCondition | undefined): void {
    this.winCondition = condition ?? null;
  }

  setLoseCondition(condition: LoseCondition | undefined): void {
    this.loseCondition = condition ?? null;
  }

  setStateMachineDefinitions(stateMachines: StateMachineDefinition[] | undefined): void {
    if (!stateMachines || stateMachines.length === 0) {
      this.smDefs = null;
      return;
    }
    const smDefs: Record<string, StateMachineDefinition> = {};
    for (const sm of stateMachines) {
      smDefs[sm.id] = sm;
    }
    this.smDefs = smDefs;
  }

  private convertFrameInputEvents(frameEvents: readonly import('../types').InputEvent[]): InputEvents {
    const result: InputEvents = {};
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
  
  private processStateMachineEvents(gameState: RuntimeGameState): void {
    if (gameState.pendingEvents.size === 0) return;
    if (!this.smDefs) return;
    if (Object.keys(gameState.stateMachines).length === 0) return;
    
    const elapsed = StateHelpers.getElapsed(gameState);
    
    for (const [eventName] of gameState.pendingEvents) {
      for (const [machineId, def] of Object.entries(this.smDefs)) {
        const smState = gameState.stateMachines[machineId];
        if (!smState) continue;
        
        for (const transition of def.transitions) {
          if (!this.transitionMatches(transition, smState.current, eventName)) continue;
          
          smState.previous = smState.current;
          smState.current = transition.to;
          smState.enteredAt = elapsed;
          smState.transitionCount += 1;
          
          break;
        }
      }
    }
  }
  
  private transitionMatches(
    transition: TransitionDefinition,
    currentState: string,
    eventName: string
  ): boolean {
    if (transition.trigger?.type !== 'event') return false;
    if (transition.trigger.eventName !== eventName) return false;
    
    if (transition.from === '*') return true;
    if (Array.isArray(transition.from)) return transition.from.includes(currentState);
    return transition.from === currentState;
  }
  
  private evaluateTrigger(trigger: RuleTrigger, context: RuleContext): boolean {
    switch (trigger.type) {
      case "collision":
        return this.collisionTriggerEvaluator.evaluate(trigger, context);
      case "timer":
      case "entity_count":
      case "event":
      case "frame":
      case "gameStart":
        return this.logicTriggerEvaluator.evaluate(trigger, context);
      case "tap":
      case "drag":
      case "tilt":
      case "button":
      case "swipe":
        return this.inputTriggerEvaluator.evaluate(trigger, context);
      default:
        return false;
    }
  }
  
  private evaluateConditions(
    conditions: RuleCondition[] | undefined,
    context: RuleContext,
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every((c) => {
      switch (c.type) {
        case "time":
        case "entity_count":
        case "random":
        case "cooldown_ready":
        case "variable":
        case "list_contains":
        case "expression":
          return this.logicConditionEvaluator.evaluate(c, context);
        case "entity_exists":
        case "on_ground":
        case "touching":
        case "velocity":
          return this.physicsConditionEvaluator.evaluate(c, context);
        case "container_is_empty":
        case "container_is_full":
        case "container_count":
        case "container_has_item":
        case "container_can_accept":
        case "container_top_item":
        case "container_is_occupied":
          return this.containerConditionEvaluator.evaluate(c, context);
        default:
          return true;
      }
    });
  }
  
  private executeActions(actions: RuleAction[], context: RuleContext): void {
    for (const a of actions) {
      this.actionRegistry.execute(a, context);
    }
  }
  
  private checkWinCondition(context: RuleContext): boolean {
    if (!this.winCondition?.expr) return false;
    if (!context.evalContext) return false;
    
    try {
      const result = evaluate(this.winCondition.expr, context.evalContext);
      return Boolean(result);
    } catch (e) {
      console.warn('[WinCondition] Failed to evaluate:', this.winCondition.expr, e);
      return false;
    }
  }
  
  private checkLoseCondition(context: RuleContext): boolean {
    if (!this.loseCondition) return false;
    
    switch (this.loseCondition.type) {
      case "entity_destroyed":
        if (this.loseCondition.entityId) {
          return !context.entityManager.getEntity(this.loseCondition.entityId);
        }
        if (this.loseCondition.tag) {
          return (
            context.entityManager.getEntitiesByTag(this.loseCondition.tag)
              .length === 0
          );
        }
        return false;
      
      case "time_up":
        return context.elapsed >= (this.loseCondition.time ?? 0);
      
      case "entity_exits_screen": {
        return false;
      }
      
      case "custom": {
        if (!this.loseCondition.expr || !context.evalContext) {
          return false;
        }
        try {
          const result = evaluate(this.loseCondition.expr, context.evalContext);
          return Boolean(result);
        } catch (e) {
          console.warn('[LoseCondition] Failed to evaluate:', this.loseCondition.expr, e);
          return false;
        }
      }
      
      default:
        return false;
    }
  }
}
