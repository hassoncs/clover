import type {
  GameRule,
  WinCondition,
  LoseCondition,
  RuleTrigger,
  RuleCondition,
  RuleAction,
  ComputedValueSystem,
  EvalContext,
  StateMachineDefinition,
  TransitionDefinition,
  ContainerConfig,
} from "@slopcade/shared";
import { evaluate } from "@slopcade/shared";
import type { EntityManager } from "./EntityManager";
import type { InputEntityManager } from "./InputEntityManager";
import type { CollisionInfo, GameState as BehaviorGameState, InputState } from "./BehaviorContext";
import type { Physics2D } from "../physics2d/Physics2D";
import type { IGameStateMutator, RuleContext, ListValue } from "./rules/types";
import type { InputEvents } from "./BehaviorContext";
import type { CameraSystem } from "./CameraSystem";
import type { GodotBridge } from "../godot/types";
import type { GameState as RuntimeGameState, GameEventBus, GameStateValue, VarValue } from "./runtime/types";
import * as StateHelpers from "./runtime/GameStateHelpers";
import { RESERVED_VARS } from "./runtime/types";

import {
  ScoreActionExecutor,
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
} from "./rules/actions";
import {
  LogicConditionEvaluator,
  PhysicsConditionEvaluator,
  ContainerConditionEvaluator,
} from "./rules/conditions";
import {
  CollisionTriggerEvaluator,
  InputTriggerEvaluator,
  LogicTriggerEvaluator,
} from "./rules/triggers";
import { ContainerSystem } from "./systems/ContainerSystem";
import type { ScriptSandbox } from "@/lib/scripting";

export type { RuleContext } from "./rules/types";

export class RulesEvaluator implements IGameStateMutator {
  private rules: GameRule[] = [];
  private winCondition: WinCondition | null = null;
  private loseCondition: LoseCondition | null = null;
  private smDefs: Record<string, StateMachineDefinition> | null = null;

  // Current frame execution context - set during update(), used by IGameStateMutator methods
  private currentState: RuntimeGameState | null = null;
  private currentEvents: GameEventBus | null = null;

  // Action Registry
  private actionRegistry: ActionRegistry;
  private runScriptActionExecutor: RunScriptActionExecutor;

  // Condition & Trigger Evaluators
  private logicConditionEvaluator = new LogicConditionEvaluator();
  private physicsConditionEvaluator = new PhysicsConditionEvaluator();
  private containerConditionEvaluator!: ContainerConditionEvaluator;

  private collisionTriggerEvaluator = new CollisionTriggerEvaluator();
  private inputTriggerEvaluator = new InputTriggerEvaluator();
  private logicTriggerEvaluator = new LogicTriggerEvaluator();

  constructor(entityManager: EntityManager, containers?: ContainerConfig[]) {
    const scoreActionExecutor = new ScoreActionExecutor();
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

    // Create ContainerSystem first (with optional container configs)
    const containerSystem = new ContainerSystem(entityManager, { containers });

    // Create ContainerActionExecutor with ContainerSystem
    const containerActionExecutor = new ContainerActionExecutor(containerSystem);

    // Create ContainerConditionEvaluator with ContainerSystem
    this.containerConditionEvaluator = new ContainerConditionEvaluator(containerSystem);

    // Create RunScriptActionExecutor and store reference
    this.runScriptActionExecutor = new RunScriptActionExecutor();

    this.actionRegistry = new ActionRegistry(
      scoreActionExecutor,
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
  }

  setScriptSandbox(sandbox: ScriptSandbox): void {
    this.runScriptActionExecutor.setSandbox(sandbox);
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

  private requireState(): RuntimeGameState {
    if (!this.currentState) {
      throw new Error("RulesEvaluator methods called outside of update() context");
    }
    return this.currentState;
  }

  addScore(points: number): void {
    const state = this.requireState();
    StateHelpers.addScore(state, points, this.currentEvents ?? undefined);
  }

  setScore(value: number): void {
    const state = this.requireState();
    StateHelpers.setScore(state, value, this.currentEvents ?? undefined);
  }

  addLives(count: number): void {
    const state = this.requireState();
    StateHelpers.addLives(state, count, this.currentEvents ?? undefined);
  }

  setLives(value: number): void {
    const state = this.requireState();
    StateHelpers.setLives(state, value, this.currentEvents ?? undefined);
  }

  setGameState(state: BehaviorGameState["state"]): void {
    const gameState = this.requireState();
    StateHelpers.setGameStateValue(gameState, state as GameStateValue, this.currentEvents ?? undefined);
  }

  triggerEvent(eventName: string, data?: unknown): void {
    const state = this.requireState();
    StateHelpers.triggerEvent(state, eventName, data);
  }

  setVariable(name: string, value: number | string | boolean): void {
    const state = this.requireState();
    StateHelpers.setVar(state, name, value, this.currentEvents ?? undefined);
  }

  getVariables(): Record<string, number | string | boolean> {
    const state = this.requireState();
    const result: Record<string, VarValue> = {};
    for (const [key, value] of Object.entries(state.vars)) {
      if (key !== RESERVED_VARS.SCORE && key !== RESERVED_VARS.LIVES && 
          key !== RESERVED_VARS.GAME_STATE && key !== RESERVED_VARS.ELAPSED) {
        result[key] = value;
      }
    }
    return result;
  }

  getVariable(name: string): number | string | boolean | undefined {
    const state = this.requireState();
    return StateHelpers.getVar(state, name);
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

  getScore(): number {
    const state = this.requireState();
    return StateHelpers.getScore(state);
  }

  getLives(): number {
    const state = this.requireState();
    return StateHelpers.getLives(state);
  }

  getElapsed(): number {
    const state = this.requireState();
    return StateHelpers.getElapsed(state);
  }

  getGameStateValue(): BehaviorGameState["state"] {
    const state = this.requireState();
    return StateHelpers.getGameStateValue(state);
  }

  update(
    dt: number,
    entityManager: EntityManager,
    collisions: CollisionInfo[],
    input: InputState,
    inputEvents: InputEvents,
    physics: Physics2D,
    gameState: RuntimeGameState,
    events: GameEventBus,
    computedValues?: ComputedValueSystem,
    evalContext?: EvalContext,
    camera?: CameraSystem,
    setTimeScale?: (scale: number, duration?: number) => void,
    inputEntityManager?: InputEntityManager,
    playSound?: (soundId: string, volume?: number) => void,
    bridge?: GodotBridge,
  ): void {
    this.currentState = gameState;
    this.currentEvents = events;

    try {
      if (StateHelpers.getGameStateValue(gameState) !== "playing") {
        return;
      }

      const elapsed = StateHelpers.getElapsed(gameState) + dt;
      StateHelpers.setElapsed(gameState, elapsed);

      const context: RuleContext = {
        entityManager,
        inputEntityManager,
        physics,
        mutator: this,
        camera,
        bridge,
        setTimeScale,
        playSound,
        setEntityTargetPosition: (entityId: string, x: number, y: number, config?: { duration?: number; easing?: string }) => {
          const entity = entityManager.getEntity(entityId);
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
        score: StateHelpers.getScore(gameState),
        lives: StateHelpers.getLives(gameState),
        elapsed,
        collisions,
        events: gameState.pendingEvents,
        input,
        inputEvents,
        computedValues,
        evalContext,
      } as unknown as RuleContext & { cooldowns: Map<string, number> };
      (context as any).cooldowns = gameState.cooldowns;

      if (this.checkWinCondition(context)) {
        this.setGameState("won");
        return;
      }

      if (this.checkLoseCondition(context)) {
        this.setGameState("lost");
        return;
      }

      for (const rule of this.rules) {
        if (rule.enabled === false) continue;
        if (rule.fireOnce && gameState.firedOnce.has(rule.id)) continue;

        const cooldownEnd = gameState.cooldowns.get(rule.id);
        if (cooldownEnd && elapsed < cooldownEnd) continue;

        const triggerResult = this.evaluateTrigger(rule.trigger, context);
        if (triggerResult) {
          const conditionsResult = this.evaluateConditions(
            rule.conditions,
            context,
          );
          if (conditionsResult) {
            this.executeActions(rule.actions, context);

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
    } finally {
      this.currentState = null;
      this.currentEvents = null;
    }
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

  // Delegate Methods
  private evaluateTrigger(trigger: RuleTrigger, context: RuleContext): boolean {
    switch (trigger.type) {
      case "collision":
        return this.collisionTriggerEvaluator.evaluate(trigger, context);
      case "timer":
      case "score":
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
      let result = false;
      switch (c.type) {
        case "score":
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

      case "score_below":
        return context.score < (this.loseCondition.score ?? 0);

      case "lives_zero":
        return context.lives <= 0;

      case "entity_exits_screen": {
        // Need screenBounds in context?
        // GameRuntime passes it? No, context has screenBounds?
        // I need to add screenBounds to context in update().
        // For now, skip if missing.
        return false;
      }

      default:
        return false;
    }
  }
}
