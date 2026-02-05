import type { GameDefinition, GameEntity, StackContainerConfig, EntityTemplate } from "@slopcade/shared";
import {
  BallSortProgressSchema,
  type BallSortProgress,
  type PersistenceConfig,
} from "@slopcade/shared";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TUBE_WIDTH,
  TUBE_HEIGHT,
  TUBE_WALL_THICKNESS,
  BALL_RADIUS,
  BALL_SPACING,
  NUM_TUBES,
  BALLS_PER_TUBE,
  TUBE_Y,
  tubePositions,
  cy,
} from "./layout";

export const metadata = {
  title: "Ball Sort",
  description: "Sort colored balls into tubes - each tube should contain only one color",
};



/**
 * Create tube container configs.
 */
function createTubeContainers(): StackContainerConfig[] {
  return tubePositions.map((pos, index) => ({
    id: `tube-${index}`,
    type: "stack" as const,
    capacity: BALLS_PER_TUBE,
    layout: {
      direction: "vertical" as const,
      spacing: BALL_SPACING,
      basePosition: { x: pos.x, y: cy(TUBE_Y) },
      anchor: "bottom" as const,
    },
  }));
}

/**
 * Create tube entities (walls, bottom, sensor).
 */
function createTubeEntities(): GameEntity[] {
  const entities: GameEntity[] = [];

  for (let i = 0; i < NUM_TUBES; i++) {
    const x = tubePositions[i].x;
    const tubeY = cy(TUBE_Y);

    entities.push({
      id: `tube-${i}`,
      name: `Tube ${i}`,
      template: "tube",
      tags: ["tube", `tube-${i}`],
      transform: {
        x: x,
        y: tubeY,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });
  }

  return entities;
}

/**
 * Persistence configuration for Ball Sort.
 * Games opt-in to persistence by providing this configuration.
 */
export const ballSortPersistence: PersistenceConfig<BallSortProgress> = {
  storageKey: "ball-sort-progress",
  schema: BallSortProgressSchema as unknown as PersistenceConfig<BallSortProgress>["schema"],
  version: 1,
  defaultProgress: {
    version: 1,
    currentLevel: 1,
    highestLevelCompleted: 0,
    totalMoves: 0,
    bestTimePerLevel: {},
    bestMovesPerLevel: {},
    totalLevelsCompleted: 0,
    currentDifficulty: 1,
    totalPlayTime: 0,
    sessionsCompleted: 0,
  },
  autoSave: {
    onGameWin: true,
    onBackground: true,
  },
};

export function createBallSortGame(): GameDefinition {
  const tubeContainers = createTubeContainers();
  const tubeEntities = createTubeEntities();

  const game: GameDefinition = {
    metadata: {
      id: "test-ball-sort",
      title: "Ball Sort",
      description: "Sort colored balls into tubes - each tube should contain only one color",
      instructions: "Tap a tube to pick up the top ball, then tap another tube to drop it. You can only drop on the same color or an empty tube.",
      version: "2.0.0",
    },
    assetSystem: { activePackId: "ballSort-default" },
    world: {
      gravity: { x: 0, y: 0 },
      pixelsPerMeter: 50,
      bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    },
    background: {
      type: "static",
    },
    camera: { type: "fixed", zoom: 1 },
    input: { debugInputs: true },
    variables: {
      currentLevel: 1,
      heldBallColor: -1,
      sourceTubeIndex: -1,
      heldBallId: "",
      moveCount: 0,
      startTime: 0,
      _winAtElapsed: 0,
      ...Object.fromEntries(
        Array.from({ length: NUM_TUBES }, (_, i) => [`tube${i}_count`, 0])
      ),
      ...Object.fromEntries(
        Array.from({ length: NUM_TUBES }, (_, i) => [`tube${i}_topColor`, -1])
      ),
    },
    containers: tubeContainers,
    ui: {
      showTimer: true,
      timerCountdown: false,
      backgroundColor: "#1a237e",
      variableDisplays: [
        { name: "moveCount", label: "Moves", color: "#4CAF50" },
        { name: "currentLevel", label: "Level", color: "#FFD700" },
      ],
    },
    stateMachines: [
      {
        id: "gameFlow",
        initialState: "idle",
        states: [{ id: "idle" }, { id: "holding" }],
        transitions: [
          {
            id: "pickup",
            from: "idle",
            to: "holding",
            trigger: { type: "event", eventName: "ball_picked" },
          },
          {
            id: "drop",
            from: "holding",
            to: "idle",
            trigger: { type: "event", eventName: "ball_dropped" },
          },
          {
            id: "cancel",
            from: "holding",
            to: "idle",
            trigger: { type: "event", eventName: "pickup_cancelled" },
          },
        ],
      },
    ],
    winCondition: {},
    templates: {
      tube: {
        id: "tube",
        tags: ["tube"],
        whatDescription: "a transparent glass cylinder tube container",
        visual: {
          type: "image",
          imageWidth: TUBE_WIDTH,
          imageHeight: TUBE_HEIGHT,
        },
        collider: {
          shape: "box" as const,
          width: TUBE_WIDTH - TUBE_WALL_THICKNESS * 2,
          height: TUBE_HEIGHT,
          isSensor: true,
        },
      },
      tubeHoverHighlight: {
        id: "tubeHoverHighlight",
        tags: ["highlight", "hover"],
        layer: 500,
        visual: {
          type: "rect",
          width: TUBE_WIDTH * 1.05,
          height: TUBE_HEIGHT * 1.02,
          color: "#FFFFFF",
          opacity: 0.15,
          blendMode: "add",
        },
      },
      ball0: createBallTemplate(0) as EntityTemplate,
      ball1: createBallTemplate(1) as EntityTemplate,
      ball2: createBallTemplate(2) as EntityTemplate,
      ball3: createBallTemplate(3) as EntityTemplate,
      ball4: createBallTemplate(4) as EntityTemplate,
      ball5: createBallTemplate(5) as EntityTemplate,
      ball6: createBallTemplate(6) as EntityTemplate,
      ball7: createBallTemplate(7) as EntityTemplate,
      heldBallIndicator: {
        id: "heldBallIndicator",
        tags: ["held-indicator"],
        visual: {
          type: "circle",
          radius: BALL_RADIUS * 1.2,
          color: "#FFD700",
        },
        collider: {
          shape: "circle" as const,
          radius: BALL_RADIUS * 1.2,
        },
      },
    },
    entities: [
      ...tubeEntities,
      {
        id: "tube-hover-highlight",
        name: "Tube Hover Highlight",
        template: "tubeHoverHighlight",
        visible: false,
        transform: {
          x: 0,
          y: 0,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
    ],
    rules: [
      {
        id: "generate_level",
        name: "Generate level when game loads",
        trigger: { type: "game_loaded" },
        actions: [{ type: "run_script", export: "generateLevel" }],
      },
      {
        id: "tap_tube_idle",
        name: "Pick up ball from tube when in idle state",
        trigger: { type: "tap", target: "tube" },
        conditions: [{ type: "expression", expr: "stateIs('gameFlow', 'idle')" }],
        actions: [{ type: "ball_sort_pickup" }],
      },
      {
        id: "tap_tube_holding",
        name: "Drop ball into tube when holding",
        trigger: { type: "tap", target: "tube" },
        conditions: [{ type: "expression", expr: "stateIs('gameFlow', 'holding')" }],
        actions: [{ type: "ball_sort_drop" }],
      },
      {
        id: "cancel_pickup_same_tube",
        name: "Cancel pickup when tapping same tube",
        trigger: { type: "event", eventName: "pickup_cancelled" },
        actions: [{ type: "event", eventName: "pickup_cancelled" }],
      },
      {
        id: "check_win",
        name: "Check win condition after each move",
        trigger: { type: "event", eventName: "ball_dropped" },
        actions: [{ type: "ball_sort_check_win" }],
      },
      {
        id: "handle_delayed_win",
        name: "Trigger win after animation delay",
        trigger: { type: "frame" },
        conditions: [
          { type: "expression", expr: "_winAtElapsed > 0 && elapsed() >= _winAtElapsed" },
        ],
        actions: [
          { type: "set_variable", name: "_winAtElapsed", operation: "set", value: 0 },
          { type: "game_state", state: "win" },
        ],
      },
    ],
    persistence: ballSortPersistence,
    hoverHighlight: {
      targetTag: "tube",
      highlightEntityId: "tube-hover-highlight",
    },
  };

  return game;
}

/**
 * Helper to create ball templates with conditional behaviors.
 */
function createBallTemplate(colorIndex: number) {
  const ballDiameter = BALL_RADIUS * 2;

  return {
    id: `ball${colorIndex}`,
    tags: ["ball", `color-${colorIndex}`],
    whatDescription: [
      "a shiny red gumball candy",
      "a shiny blue gumball candy",
      "a shiny green gumball candy",
      "a shiny yellow gumball candy",
      "a shiny purple gumball candy",
      "a shiny orange gumball candy",
      "a shiny pink gumball candy",
      "a shiny cyan gumball candy",
    ][colorIndex] || "a shiny colored gumball candy",
    visual: {
      type: "image" as const,
      imageWidth: ballDiameter,
      imageHeight: ballDiameter,
    },
    conditionalBehaviors: [
      {
        when: { hasTag: "held" },
        priority: 1,
        behaviors: [
          { type: "scale_oscillate", min: 0.95, max: 1.15, speed: 4 },
          { type: "sprite_effect", effect: "glow", params: { pulse: true } },
        ],
      },
      {
        when: { hasTag: "invalid" },
        priority: 2,
        behaviors: [
          { type: "scale_oscillate", min: 0.85, max: 1.15, speed: 25 },
          { type: "sprite_effect", effect: "flash", params: { color: [255, 80, 80], intensity: 0.7 } },
        ],
      },
    ],
  };
}


const defaultGame = createBallSortGame();
export default defaultGame;
