import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Ball Sort",
  description: "Sort colored balls into tubes - each tube should contain only one color",
};

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
const NUM_TUBES = 4;
const BALLS_PER_TUBE = 4;
const TUBE_SPACING = 2.8;
const TUBE_START_X = 1.4;
const TUBE_Y = 10;

const BALL_COLORS = ["#E53935", "#1E88E5", "#43A047", "#FDD835"];
const TUBE_COLOR = "#546E7A";
const TUBE_BOTTOM_COLOR = "#37474F";

function generateSolvableLayout(): number[][] {
  const allBalls: number[] = [];
  for (let color = 0; color < 4; color++) {
    for (let i = 0; i < BALLS_PER_TUBE; i++) {
      allBalls.push(color);
    }
  }

  for (let i = allBalls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
  }

  const tubes: number[][] = [];
  for (let t = 0; t < NUM_TUBES; t++) {
    tubes.push(allBalls.slice(t * BALLS_PER_TUBE, (t + 1) * BALLS_PER_TUBE));
  }

  return tubes;
}

const tubeLayout = generateSolvableLayout();

function createTubeEntities(tubeIndex: number, x: number): GameEntity[] {
  const entities: GameEntity[] = [];

  entities.push({
    id: `tube-${tubeIndex}-left`,
    name: `Tube ${tubeIndex} Left Wall`,
    template: "tubeWall",
    tags: ["tube-wall"],
    transform: {
      x: cx(x - TUBE_WIDTH / 2 + TUBE_WALL_THICKNESS / 2),
      y: cy(TUBE_Y),
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
      x: cx(x + TUBE_WIDTH / 2 - TUBE_WALL_THICKNESS / 2),
      y: cy(TUBE_Y),
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
      x: cx(x),
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
      x: cx(x),
      y: cy(TUBE_Y),
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
    const tubeX = TUBE_START_X + tubeIndex * TUBE_SPACING;
    const balls = tubeLayout[tubeIndex];

    for (let slot = 0; slot < balls.length; slot++) {
      const colorIndex = balls[slot];
      const ballY = TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS - BALL_RADIUS - slot * BALL_SPACING;

      entities.push({
        id: `ball-${ballId}`,
        name: `Ball ${ballId}`,
        template: `ball${colorIndex}`,
        tags: ["ball", `color-${colorIndex}`, `in-tube-${tubeIndex}`],
        transform: {
          x: cx(tubeX),
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
  const x = TUBE_START_X + i * TUBE_SPACING;
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
  camera: { type: "fixed", zoom: 1 },
  variables: {
    heldBallColor: -1,
    sourceTubeIndex: -1,
    heldBallId: "",
    tube0_count: BALLS_PER_TUBE,
    tube1_count: BALLS_PER_TUBE,
    tube2_count: BALLS_PER_TUBE,
    tube3_count: BALLS_PER_TUBE,
    tube0_topColor: tubeLayout[0][BALLS_PER_TUBE - 1],
    tube1_topColor: tubeLayout[1][BALLS_PER_TUBE - 1],
    tube2_topColor: tubeLayout[2][BALLS_PER_TUBE - 1],
    tube3_topColor: tubeLayout[3][BALLS_PER_TUBE - 1],
    moveCount: 0,
  },
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
        type: "rect",
        width: TUBE_WALL_THICKNESS,
        height: TUBE_HEIGHT,
        color: TUBE_COLOR,
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
        type: "rect",
        width: TUBE_WIDTH,
        height: TUBE_WALL_THICKNESS,
        color: TUBE_BOTTOM_COLOR,
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
        type: "circle",
        radius: BALL_RADIUS,
        color: BALL_COLORS[0],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: BALL_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    ball1: {
      id: "ball1",
      tags: ["ball", "color-1"],
      sprite: {
        type: "circle",
        radius: BALL_RADIUS,
        color: BALL_COLORS[1],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: BALL_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    ball2: {
      id: "ball2",
      tags: ["ball", "color-2"],
      sprite: {
        type: "circle",
        radius: BALL_RADIUS,
        color: BALL_COLORS[2],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: BALL_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    ball3: {
      id: "ball3",
      tags: ["ball", "color-3"],
      sprite: {
        type: "circle",
        radius: BALL_RADIUS,
        color: BALL_COLORS[3],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: BALL_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    heldBallIndicator: {
      id: "heldBallIndicator",
      tags: ["held-indicator"],
      sprite: {
        type: "circle",
        radius: BALL_RADIUS * 1.2,
        color: "#FFFFFF44",
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
        { type: "event", eventName: "try_pickup" },
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
        { type: "event", eventName: "try_drop" },
      ],
    },
    {
      id: "handle_pickup",
      name: "Handle ball pickup logic",
      trigger: { type: "event", eventName: "try_pickup" },
      actions: [
        { type: "event", eventName: "ball_picked" },
      ],
    },
    {
      id: "handle_drop",
      name: "Handle ball drop logic",
      trigger: { type: "event", eventName: "try_drop" },
      actions: [
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "event", eventName: "ball_dropped" },
      ],
    },
    {
      id: "cancel_pickup",
      name: "Cancel pickup when tapping same tube",
      trigger: { type: "event", eventName: "cancel_pickup" },
      actions: [
        { type: "event", eventName: "pickup_cancelled" },
      ],
    },
    {
      id: "check_win",
      name: "Check win condition after each move",
      trigger: { type: "event", eventName: "ball_dropped" },
      actions: [
        { type: "event", eventName: "check_win_condition" },
      ],
    },
  ],
};

export default game;
