import type { GameDefinition, GameEntity, StackContainerConfig } from "@slopcade/shared";
import { distributeRow } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";
import { generateVerifiedPuzzle, type PuzzleConfig } from "./puzzleGenerator";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort";

export const metadata: TestGameMeta = {
  title: "Ball Sort",
  description: "Sort colored balls into tubes - each tube should contain only one color",
};

const DEFAULT_DIFFICULTY = 5;

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const TUBE_WIDTH = 1.4;
const TUBE_HEIGHT = 5.0;
const TUBE_WALL_THICKNESS = 0.15;
const BALL_RADIUS = 0.5;
const BALL_SPACING = 1.1;
const NUM_TUBES = 6;
const NUM_FILLED_TUBES = 4;
const BALLS_PER_TUBE = 4;
const TUBE_Y = 10;

const tubePositions = distributeRow({
  count: NUM_TUBES,
  containerWidth: WORLD_WIDTH,
  itemWidth: TUBE_WIDTH,
  align: "space-evenly",
  padding: 0.3,
});

const BALL_COLORS = ["#E53935", "#1E88E5", "#43A047", "#FDD835"];
const TUBE_COLOR = "#546E7A";
const TUBE_BOTTOM_COLOR = "#37474F";

const puzzleConfig: PuzzleConfig = {
  numColors: 4,
  ballsPerColor: BALLS_PER_TUBE,
  extraTubes: NUM_TUBES - 4,
  difficulty: DEFAULT_DIFFICULTY,
};

const generatedPuzzle = generateVerifiedPuzzle(puzzleConfig);
const tubeLayout = generatedPuzzle.tubes;

const tubeContainers: StackContainerConfig[] = tubePositions.map((pos, index) => ({
  id: `tube-${index}`,
  type: 'stack' as const,
  capacity: BALLS_PER_TUBE,
  layout: {
    direction: 'vertical' as const,
    spacing: BALL_SPACING,
    basePosition: { x: pos.x, y: cy(TUBE_Y) },
    anchor: 'bottom' as const,
  },
}));

function createTubeEntities(tubeIndex: number, tubeX: number): GameEntity[] {
  const entities: GameEntity[] = [];
  const tubeY = cy(TUBE_Y);

  entities.push({
    id: `tube-${tubeIndex}-left`,
    name: `Tube ${tubeIndex} Left Wall`,
    template: "tubeWall",
    tags: ["tube-wall"],
    transform: {
      x: tubeX - TUBE_WIDTH / 2 + TUBE_WALL_THICKNESS / 2,
      y: tubeY,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });

  entities.push({
    id: `tube-${tubeIndex}-right`,
    name: `Tube ${tubeIndex} Right Wall`,
    template: "tubeWall",
    tags: ["tube-wall"],
    transform: {
      x: tubeX + TUBE_WIDTH / 2 - TUBE_WALL_THICKNESS / 2,
      y: tubeY,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });

  entities.push({
    id: `tube-${tubeIndex}-bottom`,
    name: `Tube ${tubeIndex} Bottom`,
    template: "tubeBottom",
    tags: ["tube-bottom"],
    transform: {
      x: tubeX,
      y: cy(TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS / 2),
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });

  entities.push({
    id: `tube-${tubeIndex}-sensor`,
    name: `Tube ${tubeIndex} Sensor`,
    template: "tubeSensor",
    tags: ["tube", `tube-${tubeIndex}`],
    transform: {
      x: tubeX,
      y: tubeY,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });

  return entities;
}

function createBallEntities(): GameEntity[] {
  const entities: GameEntity[] = [];
  let ballId = 0;

  for (let tubeIndex = 0; tubeIndex < NUM_TUBES; tubeIndex++) {
    const tubeX = tubePositions[tubeIndex].x;
    const balls = tubeLayout[tubeIndex];

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

const tubeEntities: GameEntity[] = [];
for (let i = 0; i < NUM_TUBES; i++) {
  const x = tubePositions[i].x;
  tubeEntities.push(...createTubeEntities(i, x));
}

const ballEntities = createBallEntities();

const game: GameDefinition = {
  metadata: {
    id: "test-ball-sort",
    title: "Ball Sort",
    description: "Sort colored balls into tubes - each tube should contain only one color",
    instructions: "Tap a tube to pick up the top ball, then tap another tube to drop it. You can only drop on the same color or an empty tube.",
    version: "1.0.0",
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
    heldBallColor: -1,
    sourceTubeIndex: -1,
    heldBallId: "",
    tube0_count: tubeLayout[0].length,
    tube1_count: tubeLayout[1].length,
    tube2_count: tubeLayout[2].length,
    tube3_count: tubeLayout[3].length,
    tube4_count: tubeLayout[4].length,
    tube5_count: tubeLayout[5].length,
    tube0_topColor: tubeLayout[0].length > 0 ? tubeLayout[0][tubeLayout[0].length - 1] : -1,
    tube1_topColor: tubeLayout[1].length > 0 ? tubeLayout[1][tubeLayout[1].length - 1] : -1,
    tube2_topColor: tubeLayout[2].length > 0 ? tubeLayout[2][tubeLayout[2].length - 1] : -1,
    tube3_topColor: tubeLayout[3].length > 0 ? tubeLayout[3][tubeLayout[3].length - 1] : -1,
    tube4_topColor: tubeLayout[4].length > 0 ? tubeLayout[4][tubeLayout[4].length - 1] : -1,
    tube5_topColor: tubeLayout[5].length > 0 ? tubeLayout[5][tubeLayout[5].length - 1] : -1,
    moveCount: 0,
  },
  containers: tubeContainers,
  ui: {
    showScore: false,
    showLives: false,
    showTimer: true,
    timerCountdown: false,
    backgroundColor: "#1a237e",
    variableDisplays: [{ name: "moveCount", label: "Moves", color: "#4CAF50" }],
  },
  stateMachines: [
    {
      id: "gameFlow",
      initialState: "idle",
      states: [
        { id: "idle" },
        { id: "holding" },
      ],
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
  winCondition: {
    type: "custom",
  },
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
    ball0: {
      id: "ball0",
      tags: ["ball", "color-0"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ball0.png`,
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
    },
    ball1: {
      id: "ball1",
      tags: ["ball", "color-1"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ball1.png`,
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
    },
    ball2: {
      id: "ball2",
      tags: ["ball", "color-2"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ball2.png`,
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
    },
    ball3: {
      id: "ball3",
      tags: ["ball", "color-3"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ball3.png`,
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
    },
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
      id: "tap_tube_idle",
      name: "Pick up ball from tube when in idle state",
      trigger: { type: "tap", target: "tube" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'idle')" },
      ],
      actions: [
        { type: "ball_sort_pickup" },
      ],
    },
    {
      id: "tap_tube_holding",
      name: "Drop ball into tube when holding",
      trigger: { type: "tap", target: "tube" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'holding')" },
      ],
      actions: [
        { type: "ball_sort_drop" },
      ],
    },
    {
      id: "cancel_pickup_same_tube",
      name: "Cancel pickup when tapping same tube",
      trigger: { type: "event", eventName: "pickup_cancelled" },
      actions: [
        { type: "event", eventName: "pickup_cancelled" },
      ],
    },
    {
      id: "check_win",
      name: "Check win condition after each move",
      trigger: { type: "event", eventName: "ball_dropped" },
      actions: [
        { type: "ball_sort_check_win" },
      ],
    },
  ],
};

export default game;
