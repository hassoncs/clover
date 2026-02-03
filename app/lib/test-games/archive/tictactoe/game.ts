import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Tic-Tac-Toe",
  description: "Classic two-player strategy game",
  status: "archived",
};

const GRID_SIZE = 3;
const CELL_SIZE = 1.5;
const CELL_GAP = 0.1;
const BOARD_PADDING = 0.5;
const WORLD_WIDTH = 8;
const WORLD_HEIGHT = 8;

function gridToWorld(row: number, col: number): { x: number; y: number } {
  const startX = -((GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP) / 2) + CELL_SIZE / 2;
  const startY = ((GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP) / 2) - CELL_SIZE / 2;
  return {
    x: startX + col * (CELL_SIZE + CELL_GAP),
    y: startY - row * (CELL_SIZE + CELL_GAP),
  };
}

const X_COLOR = "#FF5252";
const O_COLOR = "#448AFF";
const CELL_OUTLINE_COLOR = "#FFFFFF";
const CELL_BG_COLOR = "rgba(255, 255, 255, 0.05)";

// Generated asset URLs
const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/tictactoe";
const PIECE_X_URL = `${ASSET_BASE}/c6210842-1564-4aec-adb7-5443b8955db7/5afb115e-a83b-43eb-829a-9c547947375c.png`;
const PIECE_O_URL = `${ASSET_BASE}/fc1d73fa-c5d2-443a-aeb6-ce1371c4f905/1c383a7a-522c-4141-908e-e1963e8e2128.png`;
const BACKGROUND_URL = `${ASSET_BASE}/121b959c-b807-45d0-9db7-184afe6489fe/14507b68-9550-49a3-8482-2b55b56c8e17.png`;
const BOARD_URL = `${ASSET_BASE}/f0c7d248-b9c7-4ece-bc59-1b599ed6a315/126a752c-f1b3-4b85-987e-e6c101c609e0.png`;

const cellEntities: GameEntity[] = [];
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    const pos = gridToWorld(row, col);
    const cellId = `cell${row}${col}`;
    cellEntities.push({
      id: cellId,
      name: `Cell ${row},${col}`,
      template: "cellZone",
      tags: ["cell", `cell-${row}-${col}`, "empty"],
      transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
    });
  }
}

const game: GameDefinition = {
  metadata: {
    id: "test-tictactoe",
    title: "Tic-Tac-Toe",
    description: "Classic two-player strategy game",
    instructions: "Tap a square to place your mark. Three in a row wins! Tap anywhere after game over to play again.",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  background: {
    type: "static",
  },
  ui: {
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  variables: {
    cell00: 0,
    cell01: 0,
    cell02: 0,
    cell10: 0,
    cell11: 0,
    cell12: 0,
    cell20: 0,
    cell21: 0,
    cell22: 0,
    moveCount: 0,
    lastPlayer: 0,
    winner: 0,
    currentPlayer: 1,
    statusText: "Player X's turn",
  },
  winCondition: {},
  loseCondition: {
    type: "custom",
  },
  templates: {
    board: {
      id: "board",
      tags: ["board"],
      visual: {
        type: "image",
        imageWidth: 5.2,
        imageHeight: 5.2,
      },
    },
    cellZone: {
      id: "cellZone",
      tags: ["cell", "empty"],
      visual: {
        type: "rect",
        width: CELL_SIZE,
        height: CELL_SIZE,
        color: "rgba(255, 255, 255, 0.1)",
        strokeColor: "#FFFFFF",
        strokeWidth: 0.02,
      },
      collider: {
        shape: "box",
        width: CELL_SIZE,
        height: CELL_SIZE,
        isSensor: true,
      },
    },
    pieceX: {
      id: "pieceX",
      tags: ["piece", "x"],
      visual: {
        type: "image",
        imageWidth: CELL_SIZE * 0.8,
        imageHeight: CELL_SIZE * 0.8,
      },
      collider: {
        shape: "box",
        width: CELL_SIZE * 0.8,
        height: CELL_SIZE * 0.8,
        isSensor: true,
      },
    },
    pieceO: {
      id: "pieceO",
      tags: ["piece", "o"],
      visual: {
        type: "image",
        imageWidth: CELL_SIZE * 0.8,
        imageHeight: CELL_SIZE * 0.8,
      },
      collider: {
        shape: "circle",
        radius: (CELL_SIZE * 0.8) / 2,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "board",
      name: "Board",
      template: "board",
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    ...cellEntities,
  ],
  rules: [
    // Tap rules for each cell
    {
      id: "tap_cell_00",
      trigger: { type: "tap", target: "cell00" },
      conditions: [
        { type: "expression", expr: "cell00 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_00" },
      ],
    },
    {
      id: "tap_cell_01",
      trigger: { type: "tap", target: "cell01" },
      conditions: [
        { type: "expression", expr: "cell01 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_01" },
      ],
    },
    {
      id: "tap_cell_02",
      trigger: { type: "tap", target: "cell02" },
      conditions: [
        { type: "expression", expr: "cell02 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_02" },
      ],
    },
    {
      id: "tap_cell_10",
      trigger: { type: "tap", target: "cell10" },
      conditions: [
        { type: "expression", expr: "cell10 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_10" },
      ],
    },
    {
      id: "tap_cell_11",
      trigger: { type: "tap", target: "cell11" },
      conditions: [
        { type: "expression", expr: "cell11 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_11" },
      ],
    },
    {
      id: "tap_cell_12",
      trigger: { type: "tap", target: "cell12" },
      conditions: [
        { type: "expression", expr: "cell12 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_12" },
      ],
    },
    {
      id: "tap_cell_20",
      trigger: { type: "tap", target: "cell20" },
      conditions: [
        { type: "expression", expr: "cell20 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_20" },
      ],
    },
    {
      id: "tap_cell_21",
      trigger: { type: "tap", target: "cell21" },
      conditions: [
        { type: "expression", expr: "cell21 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_21" },
      ],
    },
    {
      id: "tap_cell_22",
      trigger: { type: "tap", target: "cell22" },
      conditions: [
        { type: "expression", expr: "cell22 == 0" },
      ],
      actions: [
        { type: "event", eventName: "attempt_place_22" },
      ],
    },

    // Placement rules for cell00
    {
      id: "place_x_00",
      trigger: { type: "event", eventName: "attempt_place_00" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: -1.6, y: 1.6 } },
        { type: "set_variable", name: "cell00", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_00",
      trigger: { type: "event", eventName: "attempt_place_00" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: -1.6, y: 1.6 } },
        { type: "set_variable", name: "cell00", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Placement rules for cell01
    {
      id: "place_x_01",
      trigger: { type: "event", eventName: "attempt_place_01" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: 0, y: 1.6 } },
        { type: "set_variable", name: "cell01", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_01",
      trigger: { type: "event", eventName: "attempt_place_01" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: 0, y: 1.6 } },
        { type: "set_variable", name: "cell01", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Placement rules for cell02
    {
      id: "place_x_02",
      trigger: { type: "event", eventName: "attempt_place_02" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: 1.6, y: 1.6 } },
        { type: "set_variable", name: "cell02", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_02",
      trigger: { type: "event", eventName: "attempt_place_02" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: 1.6, y: 1.6 } },
        { type: "set_variable", name: "cell02", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Placement rules for cell10
    {
      id: "place_x_10",
      trigger: { type: "event", eventName: "attempt_place_10" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: -1.6, y: 0 } },
        { type: "set_variable", name: "cell10", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_10",
      trigger: { type: "event", eventName: "attempt_place_10" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: -1.6, y: 0 } },
        { type: "set_variable", name: "cell10", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Placement rules for cell11
    {
      id: "place_x_11",
      trigger: { type: "event", eventName: "attempt_place_11" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: 0, y: 0 } },
        { type: "set_variable", name: "cell11", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_11",
      trigger: { type: "event", eventName: "attempt_place_11" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: 0, y: 0 } },
        { type: "set_variable", name: "cell11", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Placement rules for cell12
    {
      id: "place_x_12",
      trigger: { type: "event", eventName: "attempt_place_12" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: 1.6, y: 0 } },
        { type: "set_variable", name: "cell12", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_12",
      trigger: { type: "event", eventName: "attempt_place_12" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: 1.6, y: 0 } },
        { type: "set_variable", name: "cell12", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Placement rules for cell20
    {
      id: "place_x_20",
      trigger: { type: "event", eventName: "attempt_place_20" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: -1.6, y: -1.6 } },
        { type: "set_variable", name: "cell20", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_20",
      trigger: { type: "event", eventName: "attempt_place_20" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: -1.6, y: -1.6 } },
        { type: "set_variable", name: "cell20", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Placement rules for cell21
    {
      id: "place_x_21",
      trigger: { type: "event", eventName: "attempt_place_21" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: 0, y: -1.6 } },
        { type: "set_variable", name: "cell21", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_21",
      trigger: { type: "event", eventName: "attempt_place_21" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: 0, y: -1.6 } },
        { type: "set_variable", name: "cell21", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Placement rules for cell22
    {
      id: "place_x_22",
      trigger: { type: "event", eventName: "attempt_place_22" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "spawn", template: "pieceX", position: { type: "fixed", x: 1.6, y: -1.6 } },
        { type: "set_variable", name: "cell22", operation: "set", value: 1 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },
    {
      id: "place_o_22",
      trigger: { type: "event", eventName: "attempt_place_22" },
      conditions: [
        { type: "variable", name: "currentPlayer", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "spawn", template: "pieceO", position: { type: "fixed", x: 1.6, y: -1.6 } },
        { type: "set_variable", name: "cell22", operation: "set", value: 2 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 2 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "event", eventName: "move_committed" },
      ],
    },

    // Win detection (X)
    {
      id: "win_x_row0",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell00", comparison: "eq", value: 1 },
        { type: "variable", name: "cell01", comparison: "eq", value: 1 },
        { type: "variable", name: "cell02", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_x_row1",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell10", comparison: "eq", value: 1 },
        { type: "variable", name: "cell11", comparison: "eq", value: 1 },
        { type: "variable", name: "cell12", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_x_row2",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell20", comparison: "eq", value: 1 },
        { type: "variable", name: "cell21", comparison: "eq", value: 1 },
        { type: "variable", name: "cell22", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_x_col0",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell00", comparison: "eq", value: 1 },
        { type: "variable", name: "cell10", comparison: "eq", value: 1 },
        { type: "variable", name: "cell20", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_x_col1",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell01", comparison: "eq", value: 1 },
        { type: "variable", name: "cell11", comparison: "eq", value: 1 },
        { type: "variable", name: "cell21", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_x_col2",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell02", comparison: "eq", value: 1 },
        { type: "variable", name: "cell12", comparison: "eq", value: 1 },
        { type: "variable", name: "cell22", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_x_diag",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell00", comparison: "eq", value: 1 },
        { type: "variable", name: "cell11", comparison: "eq", value: 1 },
        { type: "variable", name: "cell22", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_x_anti_diag",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell02", comparison: "eq", value: 1 },
        { type: "variable", name: "cell11", comparison: "eq", value: 1 },
        { type: "variable", name: "cell20", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },

    // Win detection (O)
    {
      id: "win_o_row0",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell00", comparison: "eq", value: 2 },
        { type: "variable", name: "cell01", comparison: "eq", value: 2 },
        { type: "variable", name: "cell02", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_o_row1",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell10", comparison: "eq", value: 2 },
        { type: "variable", name: "cell11", comparison: "eq", value: 2 },
        { type: "variable", name: "cell12", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_o_row2",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell20", comparison: "eq", value: 2 },
        { type: "variable", name: "cell21", comparison: "eq", value: 2 },
        { type: "variable", name: "cell22", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_o_col0",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell00", comparison: "eq", value: 2 },
        { type: "variable", name: "cell10", comparison: "eq", value: 2 },
        { type: "variable", name: "cell20", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_o_col1",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell01", comparison: "eq", value: 2 },
        { type: "variable", name: "cell11", comparison: "eq", value: 2 },
        { type: "variable", name: "cell21", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_o_col2",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell02", comparison: "eq", value: 2 },
        { type: "variable", name: "cell12", comparison: "eq", value: 2 },
        { type: "variable", name: "cell22", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_o_diag",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell00", comparison: "eq", value: 2 },
        { type: "variable", name: "cell11", comparison: "eq", value: 2 },
        { type: "variable", name: "cell22", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },
    {
      id: "win_o_anti_diag",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "cell02", comparison: "eq", value: 2 },
        { type: "variable", name: "cell11", comparison: "eq", value: 2 },
        { type: "variable", name: "cell20", comparison: "eq", value: 2 },
      ],
      actions: [
        { type: "set_variable", name: "winner", operation: "set", value: 2 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player O wins!" },
        { type: "event", eventName: "game_ended" },
      ],
    },

    // Tie detection
    {
      id: "check_tie",
      trigger: { type: "event", eventName: "move_committed" },
      conditions: [
        { type: "variable", name: "moveCount", comparison: "eq", value: 9 },
        { type: "variable", name: "winner", comparison: "eq", value: 0 },
      ],
      actions: [
        { type: "set_variable", name: "statusText", operation: "set", value: "Tie game!" },
        { type: "event", eventName: "game_ended" },
      ],
    },

    // Reset
    {
      id: "tap_to_reset",
      trigger: { type: "tap" },
      conditions: [
        { type: "expression", expr: 'stateIs("turnFlow", "gameOver")' },
      ],
      actions: [
        { type: "destroy", target: { type: "by_tag", tag: "piece" } },
        { type: "set_variable", name: "cell00", operation: "set", value: 0 },
        { type: "set_variable", name: "cell01", operation: "set", value: 0 },
        { type: "set_variable", name: "cell02", operation: "set", value: 0 },
        { type: "set_variable", name: "cell10", operation: "set", value: 0 },
        { type: "set_variable", name: "cell11", operation: "set", value: 0 },
        { type: "set_variable", name: "cell12", operation: "set", value: 0 },
        { type: "set_variable", name: "cell20", operation: "set", value: 0 },
        { type: "set_variable", name: "cell21", operation: "set", value: 0 },
        { type: "set_variable", name: "cell22", operation: "set", value: 0 },
        { type: "set_variable", name: "moveCount", operation: "set", value: 0 },
        { type: "set_variable", name: "lastPlayer", operation: "set", value: 0 },
        { type: "set_variable", name: "winner", operation: "set", value: 0 },
        { type: "set_variable", name: "currentPlayer", operation: "set", value: 1 },
        { type: "set_variable", name: "statusText", operation: "set", value: "Player X's turn" },
        { type: "state_transition", machineId: "turnFlow", toState: "player1Turn" },
      ],
    },
  ],
  stateMachines: [
    {
      id: "turnFlow",
      initialState: "player1Turn",
      states: [
        { id: "player1Turn" },
        { id: "player2Turn" },
        { id: "gameOver" },
      ],
      transitions: [
        {
          id: "p1_to_p2",
          from: "player1Turn",
          to: "player2Turn",
          trigger: { type: "event", eventName: "move_committed" },
        },
        {
          id: "p2_to_p1",
          from: "player2Turn",
          to: "player1Turn",
          trigger: { type: "event", eventName: "move_committed" },
        },
        {
          id: "end_game_p1",
          from: "player1Turn",
          to: "gameOver",
          trigger: { type: "event", eventName: "game_ended" },
        },
        {
          id: "end_game_p2",
          from: "player2Turn",
          to: "gameOver",
          trigger: { type: "event", eventName: "game_ended" },
        },
      ],
    },
  ],
};

export default game;
