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
  StateMachineState,
  TransitionDefinition,
  ContainerConfig,
} from "@slopcade/shared";
import type { EntityManager } from "./EntityManager";
import type { InputEntityManager } from "./InputEntityManager";
import type { CollisionInfo, GameState, InputState } from "./BehaviorContext";
import type { Physics2D } from "../physics2d/Physics2D";
import type { IGameStateMutator, RuleContext, ListValue } from "./rules/types";
import type { InputEvents } from "./BehaviorContext";
import type { CameraSystem } from "./CameraSystem";
import type { GodotBridge } from "../godot/types";

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
  ZoneTriggerEvaluator,
} from "./rules/triggers";
import { ContainerSystem } from "./systems/ContainerSystem";

export type { RuleContext } from "./rules/types";

export class RulesEvaluator implements IGameStateMutator {
  private rules: GameRule[] = [];
  private winCondition: WinCondition | null = null;
  private loseCondition: LoseCondition | null = null;

  private gameState: GameState["state"] = "ready";
  private score = 0;
  private lives = 3;
  private elapsed = 0;

  private firedOnce = new Set<string>();
  private cooldowns = new Map<string, number>();
  private variables = new Map<string, number | string | boolean>();
  private initialVariables = new Map<string, number | string | boolean>();
  private lists = new Map<string, ListValue>();
  private pendingEvents = new Map<string, unknown>();

  private onScoreChange?: (score: number) => void;
  private onLivesChange?: (lives: number) => void;
  private onGameStateChange?: (state: GameState["state"]) => void;
  private onVariablesChange?: (
    variables: Record<string, number | string | boolean>,
  ) => void;

  // Action Registry
  private actionRegistry: ActionRegistry;

  // Condition & Trigger Evaluators
  private logicConditionEvaluator = new LogicConditionEvaluator();
  private physicsConditionEvaluator = new PhysicsConditionEvaluator();
  private containerConditionEvaluator!: ContainerConditionEvaluator;

  private collisionTriggerEvaluator = new CollisionTriggerEvaluator();
  private inputTriggerEvaluator = new InputTriggerEvaluator();
  private logicTriggerEvaluator = new LogicTriggerEvaluator();
  private zoneTriggerEvaluator = new ZoneTriggerEvaluator();

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
    );
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

  setInitialLives(lives: number): void {
    this.lives = lives;
  }

  setInitialVariables(
    variables: Record<string, number | string | boolean> | undefined,
  ): void {
    this.variables.clear();
    this.initialVariables.clear();
    if (variables) {
      for (const [name, value] of Object.entries(variables)) {
        if (
          typeof value === "number" ||
          typeof value === "string" ||
          typeof value === "boolean"
        ) {
          this.variables.set(name, value);
          this.initialVariables.set(name, value);
        }
      }
    }
  }

  setStateMachines(stateMachines: StateMachineDefinition[] | undefined): void {
    if (!stateMachines || stateMachines.length === 0) return;

    const smStates: Record<string, { currentState: string; previousState: string; stateEnteredAt: number; transitionCount: number }> = {};
    const smDefs: Record<string, StateMachineDefinition> = {};

    for (const sm of stateMachines) {
      smStates[sm.id] = {
        currentState: sm.initialState,
        previousState: '',
        stateEnteredAt: 0,
        transitionCount: 0,
      };
      smDefs[sm.id] = sm;
    }

    this.variables.set('__smStates', smStates as unknown as number);
    this.variables.set('__smDefs', smDefs as unknown as number);
    this.initialVariables.set('__smStates', smStates as unknown as number);
    this.initialVariables.set('__smDefs', smDefs as unknown as number);
  }

  setCallbacks(callbacks: {
    onScoreChange?: (score: number) => void;
    onLivesChange?: (lives: number) => void;
    onGameStateChange?: (state: GameState["state"]) => void;
    onVariablesChange?: (
      variables: Record<string, number | string | boolean>,
    ) => void;
  }): void {
    this.onScoreChange = callbacks.onScoreChange;
    this.onLivesChange = callbacks.onLivesChange;
    this.onGameStateChange = callbacks.onGameStateChange;
    this.onVariablesChange = callbacks.onVariablesChange;
  }

  start(): void {
    this.setGameState("playing");
  }

  pause(): void {
    if (this.gameState === "playing") {
      this.setGameState("paused");
    }
  }

  resume(): void {
    if (this.gameState === "paused") {
      this.setGameState("playing");
    }
  }

  reset(): void {
    this.score = 0;
    this.lives = 3;
    this.elapsed = 0;
    this.firedOnce.clear();
    this.cooldowns.clear();
    this.variables.clear();
    for (const [name, value] of this.initialVariables) {
      this.variables.set(name, value);
    }
    this.lists.clear();
    this.pendingEvents.clear();
    this.setGameState("ready");
    this.onVariablesChange?.(this.getVariables());
  }

  // IGameStateMutator Implementation
  addScore(points: number): void {
    this.score += points;
    this.onScoreChange?.(this.score);
  }

  setScore(value: number): void {
    this.score = value;
    this.onScoreChange?.(this.score);
  }

  addLives(count: number): void {
    this.lives += count;
    this.onLivesChange?.(this.lives);
  }

  setLives(value: number): void {
    this.lives = value;
    this.onLivesChange?.(this.lives);
  }

  setGameState(state: GameState["state"]): void {
    if (this.gameState !== state) {
      this.gameState = state;
      this.onGameStateChange?.(state);
    }
  }

  triggerEvent(eventName: string, data?: unknown): void {
    this.pendingEvents.set(eventName, data);
  }

  setVariable(name: string, value: number | string | boolean): void {
    this.variables.set(name, value);
    this.onVariablesChange?.(this.getVariables());
  }

  getVariables(): Record<string, number | string | boolean> {
    return Object.fromEntries(this.variables);
  }

  getVariable(name: string): number | string | boolean | undefined {
    return this.variables.get(name);
  }

  setCooldown(id: string, time: number): void {
    this.cooldowns.set(id, time);
  }

  getList(name: string): ListValue | undefined {
    return this.lists.get(name);
  }

  setList(name: string, value: ListValue): void {
    this.lists.set(name, [...value]);
  }

  pushToList(name: string, value: number | string | boolean): void {
    const list = this.lists.get(name) ?? [];
    list.push(value);
    this.lists.set(name, list);
  }

  popFromList(
    name: string,
    position: "front" | "back",
  ): number | string | boolean | undefined {
    const list = this.lists.get(name);
    if (!list || list.length === 0) return undefined;
    return position === "front" ? list.shift() : list.pop();
  }

  shuffleList(name: string, random: () => number = Math.random): void {
    const list = this.lists.get(name);
    if (!list) return;
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  listContains(name: string, value: number | string | boolean): boolean {
    const list = this.lists.get(name);
    return list ? list.includes(value) : false;
  }

  getScore(): number {
    return this.score;
  }

  getLives(): number {
    return this.lives;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getGameStateValue(): GameState["state"] {
    return this.gameState;
  }

  getFullState(): GameState {
    return {
      score: this.score,
      lives: this.lives,
      time: this.elapsed,
      state: this.gameState,
      variables: this.getVariables(),
    };
  }

  update(
    dt: number,
    entityManager: EntityManager,
    collisions: CollisionInfo[],
    input: InputState,
    inputEvents: InputEvents,
    physics: Physics2D,
    computedValues?: ComputedValueSystem,
    evalContext?: EvalContext,
    camera?: CameraSystem,
    setTimeScale?: (scale: number, duration?: number) => void,
    inputEntityManager?: InputEntityManager,
    playSound?: (soundId: string, volume?: number) => void,
    bridge?: GodotBridge,
  ): void {
    if (inputEvents.tap) {
      console.log("[Rules] TAP event received! Game state:", this.gameState, "tap:", inputEvents.tap);
    }
    if (this.gameState !== "playing") {
      if (inputEvents.tap || inputEvents.dragEnd) {
        console.log("[Rules] Ignoring input - game state is:", this.gameState);
      }
      return;
    }

    this.elapsed += dt;

    const context: RuleContext = {
      entityManager,
      inputEntityManager,
      physics,
      mutator: this,
      camera,
      bridge,
      setTimeScale,
      playSound,
      score: this.score,
      lives: this.lives,
      elapsed: this.elapsed,
      collisions,
      events: this.pendingEvents,
      input,
      inputEvents,
      computedValues,
      evalContext,
    } as unknown as RuleContext & { cooldowns: Map<string, number> };
    (context as any).cooldowns = this.cooldowns;

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
      if (rule.fireOnce && this.firedOnce.has(rule.id)) continue;

      const cooldownEnd = this.cooldowns.get(rule.id);
      if (cooldownEnd && this.elapsed < cooldownEnd) continue;

      const triggerResult = this.evaluateTrigger(rule.trigger, context);
      if (triggerResult) {
        const conditionsResult = this.evaluateConditions(
          rule.conditions,
          context,
        );
        if (conditionsResult) {
          this.executeActions(rule.actions, context);

          if (rule.fireOnce) {
            this.firedOnce.add(rule.id);
          }

          if (rule.cooldown) {
            this.cooldowns.set(rule.id, this.elapsed + rule.cooldown);
          }
        }
      }
    }

    this.processStateMachineEvents();

    this.pendingEvents.clear();
  }

  private processStateMachineEvents(): void {
    if (this.pendingEvents.size === 0) return;

    const smDefs = this.variables.get('__smDefs') as unknown as Record<string, StateMachineDefinition> | undefined;
    const smStates = this.variables.get('__smStates') as unknown as Record<string, StateMachineState> | undefined;

    if (!smDefs || !smStates) return;

    for (const [eventName] of this.pendingEvents) {
      for (const [machineId, def] of Object.entries(smDefs)) {
        const state = smStates[machineId];
        if (!state) continue;

        for (const transition of def.transitions) {
          if (!this.transitionMatches(transition, state.currentState, eventName)) continue;

          console.log(`[StateMachine] Transition: ${machineId} "${state.currentState}" -> "${transition.to}" (event: ${eventName})`);

          state.previousState = state.currentState;
          state.currentState = transition.to;
          state.stateEnteredAt = this.elapsed;
          state.transitionCount += 1;

          break;
        }
      }
    }

    this.variables.set('__smStates', smStates as unknown as number);
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
      case "zone_enter":
      case "zone_exit":
        return this.zoneTriggerEvaluator.evaluate(trigger, context);
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

  // Keep checkWin/Lose condition for now (or move later)
  private checkWinCondition(context: RuleContext): boolean {
    if (!this.winCondition) return false;

    switch (this.winCondition.type) {
      case "score":
        return this.score >= (this.winCondition.score ?? 0);

      case "destroy_all":
        if (!this.winCondition.tag) return false;
        return (
          context.entityManager.getEntitiesByTag(this.winCondition.tag)
            .length === 0
        );

      case "survive_time":
        return this.elapsed >= (this.winCondition.time ?? 0);

      case "collect_all":
        if (!this.winCondition.tag) return false;
        return (
          context.entityManager.getEntitiesByTag(this.winCondition.tag)
            .length === 0
        );

      case "reach_entity": {
        if (!this.winCondition.entityId) return false;
        const targetEntity = context.entityManager.getEntity(
          this.winCondition.entityId,
        );
        if (!targetEntity) return false;
        const playerEntities = context.entityManager.getEntitiesByTag("player");
        if (playerEntities.length === 0) return false;
        const player = playerEntities[0];
        const dx = player.transform.x - targetEntity.transform.x;
        const dy = player.transform.y - targetEntity.transform.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 1.0;
      }

      default:
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
        return this.elapsed >= (this.loseCondition.time ?? 0);

      case "score_below":
        return this.score < (this.loseCondition.score ?? 0);

      case "lives_zero":
        return this.lives <= 0;

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
