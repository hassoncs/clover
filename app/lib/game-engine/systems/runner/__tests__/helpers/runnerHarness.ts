import { SystemPhase } from '@slopcade/shared';
import { GameSystemRunner } from '../../GameSystemRunner';
import { EventQueueImpl } from '../../EventQueue';
import type {
  RuntimeSystem,
  SystemContext,
  UpdateContext,
  InputEvent,
  CollisionInfo,
} from '../../types';
import type { GodotBridge } from '@/lib/godot/types';
import type { Physics2D } from '@/lib/physics2d/Physics2D';
import type { EntityManager } from '../../../../EntityManager';
import type { EventBus } from '@slopcade/shared';
import type { InputState, GameState } from '../../../../BehaviorContext';
import { createBodyId } from '@/lib/physics2d/types';

export interface FakeSystemContextOptions {
  bridge?: Partial<GodotBridge>;
  physics?: Partial<Physics2D>;
  entityManager?: Partial<EntityManager>;
  eventBus?: Partial<EventBus>;
}

export function createFakeSystemContext(
  options: FakeSystemContextOptions = {}
): SystemContext {
  const defaultBridge: Partial<GodotBridge> = {};

  const defaultPhysics: Partial<Physics2D> = {
    step: () => {},
    createBody: () => createBodyId(0),
    destroyBody: () => {},
  };

  const defaultEntityManager: Partial<EntityManager> = {
    getEntity: () => undefined,
    getAllEntities: () => [],
    getEntitiesByTag: () => [],
  };

  const defaultEventBus: Partial<EventBus> = {
    emit: () => {},
    on: () => () => {},
    off: () => {},
    clear: () => {},
  };

  return {
    bridge: { ...defaultBridge, ...options.bridge } as GodotBridge,
    physics: { ...defaultPhysics, ...options.physics } as Physics2D,
    entityManager: {
      ...defaultEntityManager,
      ...options.entityManager,
    } as EntityManager,
    eventBus: { ...defaultEventBus, ...options.eventBus } as EventBus,
    eventQueue: new EventQueueImpl(),
  };
}

export interface StubSystemOptions {
  id: string;
  phase?: SystemPhase;
  priority?: number;
  initialize?: () => void | Promise<void>;
  update?: (ctx: UpdateContext, state: unknown) => void;
  destroy?: () => void;
  getState?: () => unknown;
}

export function createStubSystem(options: StubSystemOptions): RuntimeSystem {
  return {
    id: options.id,
    phase: options.phase ?? SystemPhase.GAME_LOGIC,
    priority: options.priority ?? 0,
    initialize: options.initialize ?? (() => {}),
    update: options.update ?? (() => {}),
    destroy: options.destroy ?? (() => {}),
    getState: options.getState ?? (() => ({})),
  };
}

export interface RunnerHarnessOptions {
  systems?: RuntimeSystem[];
  context?: SystemContext;
  initialGameState?: Partial<GameState>;
  initialInputState?: Partial<InputState>;
}

export interface RunFrameOptions {
  dt?: number;
  frameId?: number;
  input?: Partial<InputState>;
  gameState?: Partial<GameState>;
}

export interface RunnerHarness {
  runner: GameSystemRunner;
  context: SystemContext;
  lastUpdateContext: UpdateContext | undefined;
  runFrame(options?: RunFrameOptions): void;
  injectInputEvents(events: InputEvent[]): void;
  injectCollisions(collisions: CollisionInfo[]): void;
}

export async function createRunnerHarness(
  options: RunnerHarnessOptions = {}
): Promise<RunnerHarness> {
  const runner = new GameSystemRunner();
  const context = options.context ?? createFakeSystemContext();

  let pendingInputEvents: InputEvent[] = [];
  let pendingCollisions: CollisionInfo[] = [];

  const injectorSystem: RuntimeSystem = {
    id: '__harness_injector__',
    phase: SystemPhase.PRE_UPDATE,
    priority: Number.MAX_SAFE_INTEGER,
    initialize: () => {},
    update: (ctx: UpdateContext) => {
      const inputEvents = ctx.frame.inputEvents as InputEvent[];
      const collisions = ctx.frame.collisions as CollisionInfo[];
      inputEvents.push(...pendingInputEvents);
      collisions.push(...pendingCollisions);
      pendingInputEvents = [];
      pendingCollisions = [];
    },
    destroy: () => {},
    getState: () => ({}),
  };

  runner.register(injectorSystem);

  const systems = options.systems ?? [];
  for (const system of systems) {
    runner.register(system);
  }

  await runner.initialize(context);

  let frameCounter = 0;
  let elapsedTime = 0;
  let lastUpdateContext: UpdateContext | undefined;

  const defaultGameState: GameState = {
    score: 0,
    lives: 3,
    time: 0,
    state: 'playing',
    variables: {},
    ...options.initialGameState,
  };

  const defaultInputState: InputState = {
    ...options.initialInputState,
  };

  return {
    runner,
    context,

    get lastUpdateContext() {
      return lastUpdateContext;
    },

    runFrame(frameOptions: RunFrameOptions = {}) {
      const dt = frameOptions.dt ?? 0.016;
      elapsedTime += dt;
      frameCounter++;

      const updateContext: UpdateContext = {
        dt,
        elapsed: elapsedTime,
        frameId: frameOptions.frameId ?? frameCounter,
        input: { ...defaultInputState, ...frameOptions.input },
        gameState: { ...defaultGameState, ...frameOptions.gameState },
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      lastUpdateContext = updateContext;
      runner.update(updateContext);
    },

    injectInputEvents(events: InputEvent[]) {
      pendingInputEvents.push(...events);
    },

    injectCollisions(collisions: CollisionInfo[]) {
      pendingCollisions.push(...collisions);
    },
  };
}
