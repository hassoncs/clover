import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Ice Slide",
  description: "Push ice blocks to their goals - they slide until they hit something!",
  status: "archived",
};

const GRID_SIZE = 7;
const CELL_SIZE = 1.2;
const CELL_GAP = 0.08;
const TOTAL_CELL_SIZE = CELL_SIZE + CELL_GAP;
const GRID_TOTAL = GRID_SIZE * TOTAL_CELL_SIZE - CELL_GAP;
const WORLD_WIDTH = GRID_TOTAL + 1;
const WORLD_HEIGHT = GRID_TOTAL + 1;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const COLORS = {
  wall: "#4A5568",
  floor: "#E2E8F0",
  iceBlock: "#63B3ED",
  goal: "#F6E05E",
  background: "#1A202C",
};

function gridToWorld(row: number, col: number): { x: number; y: number } {
  const startX = -HALF_W + 0.5 + CELL_SIZE / 2;
  const startY = HALF_H - 0.5 - CELL_SIZE / 2;
  return {
    x: startX + col * TOTAL_CELL_SIZE,
    y: startY - row * TOTAL_CELL_SIZE,
  };
}

type CellType = "#" | "." | "B" | "G";

const LEVEL: CellType[][] = [
  ["#", "#", "#", "#", "#", "#", "#"],
  ["#", ".", ".", ".", ".", "G", "#"],
  ["#", ".", "B", ".", ".", ".", "#"],
  ["#", ".", ".", ".", "#", ".", "#"],
  ["#", ".", ".", ".", ".", ".", "#"],
  ["#", ".", ".", ".", ".", ".", "#"],
  ["#", "#", "#", "#", "#", "#", "#"],
];

function createLevelEntities(): GameEntity[] {
  const entities: GameEntity[] = [];
  let blockId = 0;
  let goalId = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = LEVEL[row][col];
      const pos = gridToWorld(row, col);

      if (cell === "#") {
        entities.push({
          id: `wall-${row}-${col}`,
          name: `Wall ${row},${col}`,
          template: "wall",
          transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
          layer: 1,
        });
      } else {
        entities.push({
          id: `floor-${row}-${col}`,
          name: `Floor ${row},${col}`,
          template: "floor",
          transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
          layer: -1,
        });

        if (cell === "G") {
          entities.push({
            id: `goal-${goalId++}`,
            name: `Goal ${goalId}`,
            template: "goal",
            transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
            layer: 0,
          });
        }

        if (cell === "B") {
          entities.push({
            id: `block-${blockId++}`,
            name: `Ice Block ${blockId}`,
            template: "iceBlock",
            tags: ["iceBlock"],
            transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
            layer: 2,
          });
        }
      }
    }
  }

  return entities;
}

const game: GameDefinition = {
  metadata: {
    id: "ice-slide",
    title: "Ice Slide",
    description: "Push ice blocks to their goals - they slide until they hit something!",
    instructions: "Swipe in any direction to push all ice blocks. Blocks slide on ice until they hit a wall or another block. Get all blocks onto the yellow goal squares to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: COLORS.background,
  },
  variables: {
    moveCount: 0,
    gameState: "idle",
    canMove: 1,
  },
  stateMachines: [
    {
      id: "gameFlow",
      initialState: "idle",
      states: [
        { id: "idle" },
        { id: "sliding" },
        {
          id: "checking",
          timeout: 0.2,
          timeoutTransition: "idle",
          onEnter: [
            { type: "event", eventName: "check_win" },
          ],
        },
      ],
      transitions: [
        {
          id: "swipe",
          from: "idle",
          to: "sliding",
          trigger: { type: "event", eventName: "swipe_detected" },
        },
        {
          id: "stopped",
          from: "sliding",
          to: "checking",
          trigger: { type: "event", eventName: "blocks_stopped" },
        },
      ],
    },
  ],
  winCondition: {
    type: "custom",
  },
  templates: {
    wall: {
      id: "wall",
      tags: ["wall", "solid"],
      sprite: {
        type: "rect",
        width: CELL_SIZE,
        height: CELL_SIZE,
        color: COLORS.wall,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CELL_SIZE,
        height: CELL_SIZE,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    floor: {
      id: "floor",
      tags: ["floor"],
      sprite: {
        type: "rect",
        width: CELL_SIZE,
        height: CELL_SIZE,
        color: COLORS.floor,
      },
      type: "zone",
      zone: {
        shape: { type: "box", width: CELL_SIZE, height: CELL_SIZE },
      },
    },
    goal: {
      id: "goal",
      tags: ["goal"],
      sprite: {
        type: "rect",
        width: CELL_SIZE * 0.8,
        height: CELL_SIZE * 0.8,
        color: COLORS.goal,
      },
      type: "zone",
      zone: {
        shape: { type: "box", width: CELL_SIZE * 0.8, height: CELL_SIZE * 0.8 },
      },
    },
    iceBlock: {
      id: "iceBlock",
      tags: ["iceBlock", "movable"],
      sprite: {
        type: "rect",
        width: CELL_SIZE * 0.9,
        height: CELL_SIZE * 0.9,
        color: COLORS.iceBlock,
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: CELL_SIZE * 0.9,
        height: CELL_SIZE * 0.9,
        density: 1,
        friction: 0,
        restitution: 0,
      },
    },
  },
  entities: createLevelEntities(),
  rules: [
    {
      id: "swipe_up",
      name: "Swipe Up",
      trigger: { type: "swipe", direction: "up" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
        { type: "variable", name: "gameState", comparison: "eq", value: "idle" },
      ],
      actions: [
        { type: "set_variable", name: "canMove", operation: "set", value: 0 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "gameState", operation: "set", value: "sliding" },
        { type: "event", eventName: "swipe_detected" },
        { type: "event", eventName: "slide_blocks_up" },
      ],
    },
    {
      id: "swipe_down",
      name: "Swipe Down",
      trigger: { type: "swipe", direction: "down" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
        { type: "variable", name: "gameState", comparison: "eq", value: "idle" },
      ],
      actions: [
        { type: "set_variable", name: "canMove", operation: "set", value: 0 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "gameState", operation: "set", value: "sliding" },
        { type: "event", eventName: "swipe_detected" },
        { type: "event", eventName: "slide_blocks_down" },
      ],
    },
    {
      id: "swipe_left",
      name: "Swipe Left",
      trigger: { type: "swipe", direction: "left" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
        { type: "variable", name: "gameState", comparison: "eq", value: "idle" },
      ],
      actions: [
        { type: "set_variable", name: "canMove", operation: "set", value: 0 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "gameState", operation: "set", value: "sliding" },
        { type: "event", eventName: "swipe_detected" },
        { type: "event", eventName: "slide_blocks_left" },
      ],
    },
    {
      id: "swipe_right",
      name: "Swipe Right",
      trigger: { type: "swipe", direction: "right" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
        { type: "variable", name: "gameState", comparison: "eq", value: "idle" },
      ],
      actions: [
        { type: "set_variable", name: "canMove", operation: "set", value: 0 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "gameState", operation: "set", value: "sliding" },
        { type: "event", eventName: "swipe_detected" },
        { type: "event", eventName: "slide_blocks_right" },
      ],
    },
    {
      id: "blocks_stopped_handler",
      name: "Handle Blocks Stopped",
      trigger: { type: "event", eventName: "blocks_stopped" },
      actions: [
        { type: "set_variable", name: "gameState", operation: "set", value: "checking" },
        { type: "event", eventName: "check_win" },
      ],
    },
    {
      id: "check_complete",
      name: "Check Complete - Return to Idle",
      trigger: { type: "timer", time: 0.2, repeat: false },
      conditions: [
        { type: "variable", name: "gameState", comparison: "eq", value: "checking" },
      ],
      actions: [
        { type: "set_variable", name: "gameState", operation: "set", value: "idle" },
        { type: "set_variable", name: "canMove", operation: "set", value: 1 },
      ],
    },
    {
      id: "win_condition",
      name: "Win When All Blocks On Goals",
      trigger: { type: "collision", entityATag: "iceBlock", entityBTag: "goal" },
      conditions: [
        { type: "variable", name: "gameState", comparison: "eq", value: "checking" },
      ],
      actions: [
        { type: "game_state", state: "win" },
      ],
    },
  ],
};

export default game;
