import type { GameDefinition, GameEntity, StackContainerConfig, EntityTemplate } from "@slopcade/shared";
import { distributeRow } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";
import {
  BallSortProgressSchema,
  type BallSortProgress,
  type PersistenceConfig,
} from "@slopcade/shared";
import { generateVerifiedPuzzle, type PuzzleConfig, type GeneratedPuzzle } from "./puzzleGenerator";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort";

export const metadata: TestGameMeta = {
  title: "Ball Sort",
  description: "Sort colored balls into tubes - each tube should contain only one color",
};

const BASE_WORLD_WIDTH = 12;
const WORLD_WIDTH = 14.4;
const WORLD_HEIGHT = 25.6;
const WORLD_SCALE = WORLD_WIDTH / BASE_WORLD_WIDTH;

const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const TUBE_WIDTH = 1.4 * WORLD_SCALE;
const TUBE_HEIGHT = 5.0 * WORLD_SCALE;
const TUBE_WALL_THICKNESS = 0.15 * WORLD_SCALE;
const BALL_RADIUS = 0.5 * WORLD_SCALE;
const BALL_SPACING = 1.1 * WORLD_SCALE;
const NUM_TUBES = 6;
const BALLS_PER_TUBE = 4;
const TUBE_Y = WORLD_HEIGHT * 0.625;

const tubePositions = distributeRow({
  count: NUM_TUBES,
  containerWidth: WORLD_WIDTH,
  itemWidth: TUBE_WIDTH,
  align: "space-evenly",
  padding: 0.3 * WORLD_SCALE,
});

/**
 * Generate puzzle configuration based on current level.
 * Difficulty scales with level progression.
 */
export function getPuzzleConfigForLevel(level: number): PuzzleConfig {
  // Difficulty increases every 5 levels, max at 10
  const difficulty = Math.min(10, 1 + Math.floor((level - 1) / 5));

  // More colors unlock at higher levels (max 8 colors)
  const numColors = Math.min(8, 4 + Math.floor((level - 1) / 10));

  return {
    numColors,
    ballsPerColor: BALLS_PER_TUBE,
    extraTubes: NUM_TUBES - numColors,
    difficulty,
    seed: level * 1000, // Deterministic seed for each level
  };
}

/**
 * Generate ball entities from puzzle layout.
 */
function createBallEntitiesFromLayout(tubeLayout: number[][]): GameEntity[] {
  const entities: GameEntity[] = [];
  let ballId = 0;

  for (let tubeIndex = 0; tubeIndex < NUM_TUBES; tubeIndex++) {
    const tubeX = tubePositions[tubeIndex].x;
    const balls = tubeLayout[tubeIndex] ?? [];

    for (let slot = 0; slot < balls.length; slot++) {
      const colorIndex = balls[slot];
      const ballY = TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS - BALL_RADIUS - slot * BALL_SPACING;

      entities.push({
        id: `ball-${ballId}`,
        name: `Ball ${ballId}`,
        template: `ball${colorIndex}`,
        tags: ["ball", `color-${colorIndex}`, `in-container-tube-${tubeIndex}`],
        transform: {
          x: tubeX,
          y: cy(ballY),
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      });
      ballId++;
    }
  }

  return entities;
}

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

    // Left wall
    entities.push({
      id: `tube-${i}-left`,
      name: `Tube ${i} Left Wall`,
      template: "tubeWall",
      tags: ["tube-wall"],
      transform: {
        x: x - TUBE_WIDTH / 2 + TUBE_WALL_THICKNESS / 2,
        y: tubeY,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });

    // Right wall
    entities.push({
      id: `tube-${i}-right`,
      name: `Tube ${i} Right Wall`,
      template: "tubeWall",
      tags: ["tube-wall"],
      transform: {
        x: x + TUBE_WIDTH / 2 - TUBE_WALL_THICKNESS / 2,
        y: tubeY,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });

    // Bottom
    entities.push({
      id: `tube-${i}-bottom`,
      name: `Tube ${i} Bottom`,
      template: "tubeBottom",
      tags: ["tube-bottom"],
      transform: {
        x: x,
        y: cy(TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });

    // Sensor
    entities.push({
      id: `tube-${i}-sensor`,
      name: `Tube ${i} Sensor`,
      template: "tubeSensor",
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

/**
 * Generate the Ball Sort game definition for a specific level.
 * This allows level-based progression with persistence.
 */
export function createBallSortGame(level: number = 1): GameDefinition {
  const puzzleConfig = getPuzzleConfigForLevel(level);
  const generatedPuzzle = generateVerifiedPuzzle(puzzleConfig);
  const tubeLayout = generatedPuzzle.tubes;

  const tubeContainers = createTubeContainers();
  const tubeEntities = createTubeEntities();
  const ballEntities = createBallEntitiesFromLayout(tubeLayout);

  const game: GameDefinition = {
    metadata: {
      id: "test-ball-sort",
      title: "Ball Sort",
      description: "Sort colored balls into tubes - each tube should contain only one color",
      instructions: "Tap a tube to pick up the top ball, then tap another tube to drop it. You can only drop on the same color or an empty tube.",
      version: "1.1.0",
    },
    world: {
      gravity: { x: 0, y: 0 },
      pixelsPerMeter: 50,
      bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    },
    background: {
      type: "static",
      imageUrl: `${ASSET_BASE}/background.png`,
    },
    camera: { type: "fixed", zoom: 1 },
    input: { debugInputs: true },
    variables: {
      currentLevel: level,
      heldBallColor: -1,
      sourceTubeIndex: -1,
      heldBallId: "",
      moveCount: 0,
      startTime: 0,
      // Track tube state for win condition
      ...Object.fromEntries(
        Array.from({ length: NUM_TUBES }, (_, i) => [
          `tube${i}_count`,
          tubeLayout[i]?.length ?? 0,
        ])
      ),
      ...Object.fromEntries(
        Array.from({ length: NUM_TUBES }, (_, i) => [
          `tube${i}_topColor`,
          tubeLayout[i]?.length > 0 ? tubeLayout[i][tubeLayout[i].length - 1] : -1,
        ])
      ),
    },
    containers: tubeContainers,
    ui: {
      showScore: false,
      showLives: false,
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
    winCondition: { type: "custom" },
    templates: {
      tubeWall: {
        id: "tubeWall",
        tags: ["tube-wall"],
        sprite: {
          type: "image",
          imageUrl: `${ASSET_BASE}/tubeWall.png`,
          imageWidth: TUBE_WALL_THICKNESS,
          imageHeight: TUBE_HEIGHT,
        },
        physics: {
          bodyType: "static",
          shape: "box",
          width: TUBE_WALL_THICKNESS,
          height: TUBE_HEIGHT,
          density: 0,
          friction: 0,
          restitution: 0,
        },
      },
      tubeBottom: {
        id: "tubeBottom",
        tags: ["tube-bottom"],
        sprite: {
          type: "image",
          imageUrl: `${ASSET_BASE}/tubeBottom.png`,
          imageWidth: TUBE_WIDTH,
          imageHeight: TUBE_WALL_THICKNESS,
        },
        physics: {
          bodyType: "static",
          shape: "box",
          width: TUBE_WIDTH,
          height: TUBE_WALL_THICKNESS,
          density: 0,
          friction: 0,
          restitution: 0,
        },
      },
      tubeSensor: {
        id: "tubeSensor",
        tags: ["tube"],
        sprite: {
          type: "rect",
          width: TUBE_WIDTH - TUBE_WALL_THICKNESS * 2,
          height: TUBE_HEIGHT,
          color: "#00000022",
        },
        physics: {
          bodyType: "static",
          shape: "box",
          width: TUBE_WIDTH - TUBE_WALL_THICKNESS * 2,
          height: TUBE_HEIGHT,
          density: 0,
          friction: 0,
          restitution: 0,
          isSensor: true,
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
        sprite: {
          type: "image",
          imageUrl: `${ASSET_BASE}/heldBallIndicator.png`,
          imageWidth: BALL_RADIUS * 2.4,
          imageHeight: BALL_RADIUS * 2.4,
        },
        physics: {
          bodyType: "kinematic",
          shape: "circle",
          radius: BALL_RADIUS * 1.2,
          density: 0,
          friction: 0,
          restitution: 0,
          isSensor: true,
        },
      },
    },
    entities: [...tubeEntities, ...ballEntities],
    rules: [
      {
        id: "init_start_time",
        name: "Initialize start time",
        trigger: { type: "gameStart" },
        actions: [{ type: "set_variable", name: "startTime", operation: "set", value: { expr: "now()" } }],
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
    ],
    persistence: ballSortPersistence,
  };

  return game;
}

/**
 * Helper to create ball templates with conditional behaviors.
 */
function createBallTemplate(colorIndex: number) {
  return {
    id: `ball${colorIndex}`,
    tags: ["ball", `color-${colorIndex}`],
    sprite: {
      type: "image",
      imageUrl: `${ASSET_BASE}/ball${colorIndex % 4}.png`, // Reuse existing assets, cycle through 0-3
      imageWidth: BALL_RADIUS * 2,
      imageHeight: BALL_RADIUS * 2,
    },
    physics: {
      bodyType: "kinematic",
      shape: "circle",
      radius: BALL_RADIUS,
      density: 0,
      friction: 0,
      restitution: 0,
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

// Export default game at level 1 for backward compatibility
const defaultGame = createBallSortGame(1);
export default defaultGame;
