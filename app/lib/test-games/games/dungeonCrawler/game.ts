import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Dungeon Crawler",
  description: "Grid-based dungeon exploration with inventory and state transitions",
};

const GRID_SIZE = 8;
const TILE_SIZE = 1;
const WORLD_WIDTH = GRID_SIZE;
const WORLD_HEIGHT = GRID_SIZE;

// Convert grid coordinates to world coordinates
const gridToWorld = (row: number, col: number) => ({
  x: col - GRID_SIZE / 2 + 0.5,
  y: GRID_SIZE / 2 - row - 0.5,
});

const game: GameDefinition = {
  metadata: {
    id: "test-dungeon-crawler",
    title: "Dungeon Crawler",
    description: "Grid-based dungeon exploration with inventory and state transitions",
    instructions: "Use arrow keys to move on the grid. Collect keys and reach the door to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: true,
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  initialLives: 3,
  winCondition: {
    type: "reach_entity",
    tag: "door",
  },
  loseCondition: {
    type: "lives_zero",
  },
  templates: {
    floor_tile: {
      id: "floor_tile",
      tags: ["floor"],
      sprite: { type: "rect", width: TILE_SIZE, height: TILE_SIZE, color: "#444444" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE,
        height: TILE_SIZE,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    player: {
      id: "player",
      tags: ["player"],
      sprite: { type: "rect", width: 0.8, height: 0.8, color: "#4A90E2" },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 0.8,
        height: 0.8,
        density: 0,
        friction: 0,
        restitution: 0,
        fixedRotation: true,
      },
      behaviors: [],
    },
    key: {
      id: "key",
      tags: ["key"],
      sprite: { type: "rect", width: 0.6, height: 0.6, color: "#FFD700" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.6,
        height: 0.6,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [],
    },
    enemy: {
      id: "enemy",
      tags: ["enemy"],
      sprite: { type: "rect", width: 0.7, height: 0.7, color: "#E74C3C" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.7,
        height: 0.7,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [],
    },
    door: {
      id: "door",
      tags: ["door"],
      sprite: { type: "rect", width: 0.9, height: 0.9, color: "#8B4513" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.9,
        height: 0.9,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [],
    },
  },
  entities: [
    // Floor tiles (8x8 grid)
    ...Array.from({ length: GRID_SIZE }, (_, row) =>
      Array.from({ length: GRID_SIZE }, (_, col) => {
        const { x, y } = gridToWorld(row, col);
        return {
          id: `floor-${row}-${col}`,
          name: `Floor ${row},${col}`,
          template: "floor_tile",
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        };
      })
    ).flat(),

    // Player at (0, 0)
    {
      id: "player",
      name: "Player",
      template: "player",
      transform: { ...gridToWorld(0, 0), angle: 0, scaleX: 1, scaleY: 1 },
    },

    // Keys scattered around
    {
      id: "key-1",
      name: "Key 1",
      template: "key",
      transform: { ...gridToWorld(2, 3), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "key-2",
      name: "Key 2",
      template: "key",
      transform: { ...gridToWorld(4, 5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "key-3",
      name: "Key 3",
      template: "key",
      transform: { ...gridToWorld(6, 2), angle: 0, scaleX: 1, scaleY: 1 },
    },

    // Enemies
    {
      id: "enemy-1",
      name: "Enemy 1",
      template: "enemy",
      transform: { ...gridToWorld(3, 3), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "enemy-2",
      name: "Enemy 2",
      template: "enemy",
      transform: { ...gridToWorld(5, 6), angle: 0, scaleX: 1, scaleY: 1 },
    },

    // Door at (7, 7)
    {
      id: "door",
      name: "Door",
      template: "door",
      transform: { ...gridToWorld(7, 7), angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    // Initialize player on grid
    {
      id: "init_player",
      name: "Initialize player position on grid",
      trigger: { type: "gameStart" },
      actions: [
        {
          type: "grid_place",
          gridId: "dungeon",
          entityId: "player",
          row: 0,
          col: 0,
        },
      ],
    },

    {
      id: "move_up",
      name: "Move player up with Up arrow",
      trigger: { type: "button", button: "up", state: "pressed" },
      actions: [
        {
          type: "grid_move",
          gridId: "dungeon",
          entityId: "player",
          toRow: { expr: "max(0, game.playerRow - 1)" },
          toCol: { expr: "game.playerCol" },
        },
      ],
    },

    {
      id: "move_down",
      name: "Move player down with Down arrow",
      trigger: { type: "button", button: "down", state: "pressed" },
      actions: [
        {
          type: "grid_move",
          gridId: "dungeon",
          entityId: "player",
          toRow: { expr: "min(7, game.playerRow + 1)" },
          toCol: { expr: "game.playerCol" },
        },
      ],
    },

    {
      id: "move_left",
      name: "Move player left with Left arrow",
      trigger: { type: "button", button: "left", state: "pressed" },
      actions: [
        {
          type: "grid_move",
          gridId: "dungeon",
          entityId: "player",
          toRow: { expr: "game.playerRow" },
          toCol: { expr: "max(0, game.playerCol - 1)" },
        },
      ],
    },

    {
      id: "move_right",
      name: "Move player right with Right arrow",
      trigger: { type: "button", button: "right", state: "pressed" },
      actions: [
        {
          type: "grid_move",
          gridId: "dungeon",
          entityId: "player",
          toRow: { expr: "game.playerRow" },
          toCol: { expr: "min(7, game.playerCol + 1)" },
        },
      ],
    },

    // Collect key
    {
      id: "collect_key",
      name: "Collect key when player touches it",
      trigger: { type: "collision", entityATag: "player", entityBTag: "key" },
      actions: [
        {
          type: "inventory_add",
          inventoryId: "player_inv",
          itemId: "key",
        },
        {
          type: "score",
          operation: "add",
          value: 100,
        },
        {
          type: "destroy",
          target: { type: "collision_entities" },
        },
      ],
    },

    // Touch enemy - transition to combat state
    {
      id: "touch_enemy",
      name: "Enter combat when touching enemy",
      trigger: { type: "collision", entityATag: "player", entityBTag: "enemy" },
      actions: [
        {
          type: "state_transition",
          machineId: "game_mode",
          toState: "combat",
        },
        {
          type: "lives",
          operation: "subtract",
          value: 1,
        },
      ],
    },
  ],
};

export default game;
