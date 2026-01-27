import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Domino Chain",
  description: "Place dominoes and watch them fall in a satisfying chain reaction",
  status: "archived",
};

const WORLD_WIDTH = 16;
const WORLD_HEIGHT = 10;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const FLOOR_Y = 8.5;
const FLOOR_HEIGHT = 1;

const DOMINO_WIDTH = 0.15;
const DOMINO_HEIGHT = 0.8;
const DOMINO_SPACING = 0.5;
const DOMINO_START_X = 3;
const PRE_PLACED_COUNT = 10;

const START_BUTTON_X = 2;
const START_BUTTON_Y = 2;
const START_BUTTON_WIDTH = 2;
const START_BUTTON_HEIGHT = 0.8;

function createPrePlacedDominoes(): GameEntity[] {
  const entities: GameEntity[] = [];
  for (let i = 0; i < PRE_PLACED_COUNT; i++) {
    entities.push({
      id: `domino-${i}`,
      name: `Domino ${i}`,
      template: "domino",
      tags: ["domino", "pre-placed"],
      transform: {
        x: cx(DOMINO_START_X + i * DOMINO_SPACING),
        y: cy(FLOOR_Y - DOMINO_HEIGHT / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });
  }
  return entities;
}

const prePlacedDominoes = createPrePlacedDominoes();

const game: GameDefinition = {
  metadata: {
    id: "test-domino-chain",
    title: "Domino Chain",
    description: "Place dominoes and watch them fall in a satisfying chain reaction",
    instructions: "Tap to add dominoes in gaps. Press START to push the first domino and watch the chain reaction!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  variables: {
    dominoesPlaced: PRE_PLACED_COUNT,
    dominoesFallen: 0,
  },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
    variableDisplays: [
      { name: "dominoesPlaced", label: "Dominoes", color: "#4CAF50" },
    ],
  },
  stateMachines: [
    {
      id: "gameFlow",
      initialState: "placing",
      states: [
        { id: "placing" },
        { id: "ready" },
        {
          id: "running",
          timeout: 8.0,
          timeoutTransition: "scoring",
        },
        {
          id: "scoring",
          timeout: 2.0,
          timeoutTransition: "placing",
          onEnter: [{ type: "event", eventName: "calculate_score" }],
        },
      ],
      transitions: [
        {
          id: "done_placing",
          from: "placing",
          to: "ready",
          trigger: { type: "event", eventName: "done_placing" },
        },
        {
          id: "start",
          from: "ready",
          to: "running",
          trigger: { type: "event", eventName: "chain_started" },
        },
        {
          id: "finished",
          from: "running",
          to: "scoring",
          trigger: { type: "event", eventName: "chain_finished" },
        },
        {
          id: "reset",
          from: "scoring",
          to: "placing",
          trigger: { type: "event", eventName: "reset_game" },
        },
      ],
    },
  ],
  winCondition: {
    type: "score",
    score: 1000,
  },
  templates: {
    floor: {
      id: "floor",
      tags: ["floor", "static"],
      sprite: {
        type: "rect",
        width: WORLD_WIDTH - 2,
        height: FLOOR_HEIGHT,
        color: "#4A5568",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WORLD_WIDTH - 2,
        height: FLOOR_HEIGHT,
        density: 0,
        friction: 0.8,
        restitution: 0.1,
      },
    },
    domino: {
      id: "domino",
      tags: ["domino"],
      sprite: {
        type: "rect",
        width: DOMINO_WIDTH,
        height: DOMINO_HEIGHT,
        color: "#E2E8F0",
      },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: DOMINO_WIDTH,
        height: DOMINO_HEIGHT,
        density: 1,
        friction: 0.5,
        restitution: 0.1,
        linearDamping: 0.5,
      },
    },
    pusher: {
      id: "pusher",
      tags: ["pusher"],
      sprite: {
        type: "rect",
        width: 0.3,
        height: 0.5,
        color: "#FF6B6B",
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 0.3,
        height: 0.5,
        density: 0,
        friction: 0.5,
        restitution: 0,
        isSensor: true,
      },
    },
    startButton: {
      id: "startButton",
      tags: ["start-button", "ui-element"],
      sprite: {
        type: "rect",
        width: START_BUTTON_WIDTH,
        height: START_BUTTON_HEIGHT,
        color: "#48BB78",
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: START_BUTTON_WIDTH,
        height: START_BUTTON_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    placementZone: {
      id: "placementZone",
      tags: ["placement-zone"],
      sprite: {
        type: "rect",
        width: WORLD_WIDTH - 4,
        height: 2,
        color: "#FFFFFF11",
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: WORLD_WIDTH - 4,
        height: 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "floor",
      name: "Floor",
      template: "floor",
      tags: ["floor"],
      transform: {
        x: cx(WORLD_WIDTH / 2),
        y: cy(FLOOR_Y + FLOOR_HEIGHT / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "start-button",
      name: "Start Button",
      template: "startButton",
      tags: ["start-button"],
      transform: {
        x: cx(START_BUTTON_X),
        y: cy(START_BUTTON_Y),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "placement-zone",
      name: "Placement Zone",
      template: "placementZone",
      tags: ["placement-zone"],
      transform: {
        x: cx(WORLD_WIDTH / 2),
        y: cy(FLOOR_Y - 1),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    ...prePlacedDominoes,
  ],
  rules: [
    {
      id: "tap_to_place_domino",
      name: "Place domino when tapping in placement zone",
      trigger: { type: "tap", target: "placement-zone" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'placing')" },
      ],
      actions: [
        { type: "set_variable", name: "dominoesPlaced", operation: "add", value: 1 },
      ],
    },
    {
      id: "tap_start_in_placing",
      name: "Transition to ready when tapping start in placing state",
      trigger: { type: "tap", target: "start-button" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'placing')" },
      ],
      actions: [
        { type: "event", eventName: "done_placing" },
      ],
    },
    {
      id: "tap_start_in_ready",
      name: "Start chain reaction when tapping start in ready state",
      trigger: { type: "tap", target: "start-button" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'ready')" },
      ],
      actions: [
        { type: "apply_impulse", target: { type: "by_id", entityId: "domino-0" }, x: 2, y: 0 },
        { type: "event", eventName: "chain_started" },
      ],
    },
    {
      id: "domino_collision_score",
      name: "Score when dominoes collide",
      trigger: { type: "collision", entityATag: "domino", entityBTag: "domino" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'running')" },
      ],
      actions: [
        { type: "score", operation: "add", value: 10 },
      ],
      cooldown: 0.1,
    },
    {
      id: "domino_floor_score",
      name: "Score when domino hits floor",
      trigger: { type: "collision", entityATag: "domino", entityBTag: "floor" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'running')" },
      ],
      actions: [
        { type: "score", operation: "add", value: 50 },
        { type: "set_variable", name: "dominoesFallen", operation: "add", value: 1 },
      ],
    },
    {
      id: "calculate_final_score",
      name: "Calculate final score when chain finishes",
      trigger: { type: "event", eventName: "calculate_score" },
      actions: [
        { type: "score", operation: "add", value: 100 },
      ],
    },
  ],
};

export default game;
