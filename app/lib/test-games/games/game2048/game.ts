import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "2048",
  description: "Slide tiles to combine matching numbers and reach 2048!",
};

const GRID_SIZE = 4;
const CELL_SIZE = 1.8;
const CELL_GAP = 0.15;
const GRID_PADDING = 0.3;
const TOTAL_CELL_SIZE = CELL_SIZE + CELL_GAP;
const GRID_TOTAL = GRID_SIZE * TOTAL_CELL_SIZE - CELL_GAP + GRID_PADDING * 2;
const WORLD_WIDTH = GRID_TOTAL;
const WORLD_HEIGHT = GRID_TOTAL;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const TILE_COLORS: Record<number, string> = {
  2: "#eee4da",
  4: "#ede0c8",
  8: "#f2b179",
  16: "#f59563",
  32: "#f67c5f",
  64: "#f65e3b",
  128: "#edcf72",
  256: "#edcc61",
  512: "#edc850",
  1024: "#edc53f",
  2048: "#edc22e",
};

function gridToWorld(row: number, col: number): { x: number; y: number } {
  const startX = -HALF_W + GRID_PADDING + CELL_SIZE / 2;
  const startY = HALF_H - GRID_PADDING - CELL_SIZE / 2;
  return {
    x: startX + col * TOTAL_CELL_SIZE,
    y: startY - row * TOTAL_CELL_SIZE,
  };
}

function createTileTemplate(value: number) {
  return {
    id: `tile${value}`,
    tags: ["tile", `tile${value}`, `value-${value}`],
    sprite: {
      type: "rect" as const,
      width: CELL_SIZE,
      height: CELL_SIZE,
      color: TILE_COLORS[value] || "#3c3a32",
    },
    physics: {
      bodyType: "kinematic" as const,
      shape: "box" as const,
      width: CELL_SIZE,
      height: CELL_SIZE,
      density: 0,
      friction: 0,
      restitution: 0,
      isSensor: true,
    },
  };
}

const gridCellEntities: GameEntity[] = [];
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const pos = gridToWorld(row, col);
    gridCellEntities.push({
      id: `cell-${row}-${col}`,
      name: `Cell ${row},${col}`,
      template: "emptyCell",
      transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
      layer: -1,
    });
  }
}

const pos1 = gridToWorld(3, 1);
const pos2 = gridToWorld(2, 2);

const initialTiles: GameEntity[] = [
  {
    id: "tile-0",
    name: "Starting Tile 1",
    template: "tile2",
    tags: ["tile", "tile2", "value-2"],
    transform: { x: pos1.x, y: pos1.y, angle: 0, scaleX: 1, scaleY: 1 },
  },
  {
    id: "tile-1",
    name: "Starting Tile 2",
    template: "tile2",
    tags: ["tile", "tile2", "value-2"],
    transform: { x: pos2.x, y: pos2.y, angle: 0, scaleX: 1, scaleY: 1 },
  },
];

const game: GameDefinition = {
  metadata: {
    id: "test-game-2048",
    title: "2048",
    description: "Slide tiles to combine matching numbers and reach 2048!",
    instructions: "Swipe in any direction to slide all tiles. When two tiles with the same number touch, they merge into one with double the value. Reach 2048 to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  input: {
    virtualDPad: {
      id: "dpad",
      size: 120,
      buttonSize: 40,
      color: "rgba(255, 255, 255, 0.3)",
      activeColor: "rgba(255, 255, 255, 0.7)",
    },
  },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#faf8ef",
    variableDisplays: [
      { name: "highScore", label: "Best", color: "#bbada0" },
    ],
  },
  variables: {
    tileCount: 2,
    highScore: 0,
    canMove: 1,
    lastMoveDirection: "",
  },
  winCondition: {
    type: "score",
    score: 2048,
  },
  loseCondition: {
    type: "custom",
  },
  templates: {
    emptyCell: {
      id: "emptyCell",
      tags: ["cell"],
      sprite: {
        type: "rect",
        width: CELL_SIZE,
        height: CELL_SIZE,
        color: "#cdc1b4",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CELL_SIZE,
        height: CELL_SIZE,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    tile2: createTileTemplate(2),
    tile4: createTileTemplate(4),
    tile8: createTileTemplate(8),
    tile16: createTileTemplate(16),
    tile32: createTileTemplate(32),
    tile64: createTileTemplate(64),
    tile128: createTileTemplate(128),
    tile256: createTileTemplate(256),
    tile512: createTileTemplate(512),
    tile1024: createTileTemplate(1024),
    tile2048: createTileTemplate(2048),
    gridBackground: {
      id: "gridBackground",
      tags: ["background"],
      sprite: {
        type: "rect",
        width: GRID_TOTAL,
        height: GRID_TOTAL,
        color: "#bbada0",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: GRID_TOTAL,
        height: GRID_TOTAL,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "grid-bg",
      name: "Grid Background",
      template: "gridBackground",
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      layer: -2,
    },
    ...gridCellEntities,
    ...initialTiles,
  ],
  rules: [
    {
      id: "swipe_up",
      name: "Swipe Up",
      trigger: { type: "swipe", direction: "up" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "lastMoveDirection", operation: "set", value: "up" },
        { type: "event", eventName: "move_tiles" },
      ],
    },
    {
      id: "swipe_down",
      name: "Swipe Down",
      trigger: { type: "swipe", direction: "down" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "lastMoveDirection", operation: "set", value: "down" },
        { type: "event", eventName: "move_tiles" },
      ],
    },
    {
      id: "swipe_left",
      name: "Swipe Left",
      trigger: { type: "swipe", direction: "left" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "lastMoveDirection", operation: "set", value: "left" },
        { type: "event", eventName: "move_tiles" },
      ],
    },
    {
      id: "swipe_right",
      name: "Swipe Right",
      trigger: { type: "swipe", direction: "right" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "lastMoveDirection", operation: "set", value: "right" },
        { type: "event", eventName: "move_tiles" },
      ],
    },
    {
      id: "button_up",
      name: "D-Pad Up",
      trigger: { type: "button", button: "up", state: "pressed" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "lastMoveDirection", operation: "set", value: "up" },
        { type: "event", eventName: "move_tiles" },
      ],
    },
    {
      id: "button_down",
      name: "D-Pad Down",
      trigger: { type: "button", button: "down", state: "pressed" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "lastMoveDirection", operation: "set", value: "down" },
        { type: "event", eventName: "move_tiles" },
      ],
    },
    {
      id: "button_left",
      name: "D-Pad Left",
      trigger: { type: "button", button: "left", state: "pressed" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "lastMoveDirection", operation: "set", value: "left" },
        { type: "event", eventName: "move_tiles" },
      ],
    },
    {
      id: "button_right",
      name: "D-Pad Right",
      trigger: { type: "button", button: "right", state: "pressed" },
      conditions: [
        { type: "variable", name: "canMove", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "lastMoveDirection", operation: "set", value: "right" },
        { type: "event", eventName: "move_tiles" },
      ],
    },
    {
      id: "spawn_new_tile",
      name: "Spawn New Tile After Move",
      trigger: { type: "event", eventName: "move_complete" },
      actions: [
        { type: "set_variable", name: "tileCount", operation: "add", value: 1 },
        { type: "set_variable", name: "canMove", operation: "set", value: 1 },
      ],
    },
    {
      id: "check_win",
      name: "Check for 2048 Tile",
      trigger: { type: "score", threshold: 2048, comparison: "gte" },
      actions: [
        { type: "game_state", state: "win" },
      ],
      fireOnce: true,
    },
    {
      id: "check_game_over",
      name: "Check Game Over",
      trigger: { type: "event", eventName: "check_game_over" },
      conditions: [
        { type: "entity_count", tag: "tile", min: 16 },
      ],
      actions: [
        { type: "event", eventName: "verify_no_moves" },
      ],
    },
  ],
};

export default game;
