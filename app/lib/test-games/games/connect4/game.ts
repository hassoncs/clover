import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Connect 4",
  description: "Drop discs to connect four in a row",
};

const COLS = 7;
const ROWS = 6;
const DISC_SIZE = 1.0;
const CELL_GAP = 0.1;
const TOTAL_CELL_SIZE = DISC_SIZE + CELL_GAP;
const BOARD_PADDING = 0.3;
const BOARD_WIDTH = COLS * TOTAL_CELL_SIZE - CELL_GAP + BOARD_PADDING * 2;
const BOARD_HEIGHT = ROWS * TOTAL_CELL_SIZE - CELL_GAP + BOARD_PADDING * 2;
const WORLD_WIDTH = BOARD_WIDTH + 1;
const WORLD_HEIGHT = BOARD_HEIGHT + 2;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const SELECTOR_HEIGHT = 1.0;

const RED_COLOR = "#E53935";
const YELLOW_COLOR = "#FDD835";
const BOARD_COLOR = "#1976D2";
const EMPTY_SLOT_COLOR = "#1565C0";
const EMPTY_SLOT_INNER = "#0D47A1";

function gridToWorld(row: number, col: number): { x: number; y: number } {
  const startX = -HALF_W + (WORLD_WIDTH - BOARD_WIDTH) / 2 + BOARD_PADDING + DISC_SIZE / 2;
  const startY = HALF_H - (WORLD_HEIGHT - BOARD_HEIGHT) / 2 - BOARD_PADDING - DISC_SIZE / 2 - SELECTOR_HEIGHT;
  return {
    x: startX + col * TOTAL_CELL_SIZE,
    y: startY - row * TOTAL_CELL_SIZE,
  };
}

function selectorPosition(col: number): { x: number; y: number } {
  const startX = -HALF_W + (WORLD_WIDTH - BOARD_WIDTH) / 2 + BOARD_PADDING + DISC_SIZE / 2;
  const y = HALF_H - SELECTOR_HEIGHT / 2;
  return {
    x: startX + col * TOTAL_CELL_SIZE,
    y,
  };
}

const emptySlotEntities: GameEntity[] = [];
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const pos = gridToWorld(row, col);
    emptySlotEntities.push({
      id: `slot-${row}-${col}`,
      name: `Slot ${row},${col}`,
      template: "emptySlot",
      tags: ["slot", `col-${col}`, `row-${row}`],
      transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
    });
  }
}

const columnSelectorEntities: GameEntity[] = [];
for (let col = 0; col < COLS; col++) {
  const pos = selectorPosition(col);
  columnSelectorEntities.push({
    id: `selector-${col}`,
    name: `Column ${col} Selector`,
    template: "columnSelector",
    tags: ["selector", `selector-col-${col}`],
    transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
  });
}

const game: GameDefinition = {
  metadata: {
    id: "test-connect4",
    title: "Connect 4",
    description: "Drop discs to connect four in a row",
    instructions: "Tap a column to drop your disc. Connect four discs horizontally, vertically, or diagonally to win!",
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
    backgroundColor: "#0D47A1",
    variableDisplays: [
      { name: "currentPlayer", label: "Player", color: "#FFFFFF" },
    ],
  },
  variables: {
    isPlayerTurn: 1,
    moveCount: 0,
    col0Height: 0,
    col1Height: 0,
    col2Height: 0,
    col3Height: 0,
    col4Height: 0,
    col5Height: 0,
    col6Height: 0,
  },
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
          trigger: { type: "event", eventName: "disc_dropped" },
        },
        {
          id: "p2_to_p1",
          from: "player2Turn",
          to: "player1Turn",
          trigger: { type: "event", eventName: "disc_dropped" },
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
  winCondition: {
    type: "custom",
  },
  loseCondition: {
    type: "custom",
  },
  templates: {
    boardBackground: {
      id: "boardBackground",
      tags: ["board"],
      sprite: {
        type: "rect",
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        color: BOARD_COLOR,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    emptySlot: {
      id: "emptySlot",
      tags: ["slot"],
      sprite: {
        type: "circle",
        radius: DISC_SIZE / 2,
        color: EMPTY_SLOT_INNER,
      },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: DISC_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    columnSelector: {
      id: "columnSelector",
      tags: ["selector"],
      sprite: {
        type: "rect",
        width: DISC_SIZE,
        height: SELECTOR_HEIGHT,
        color: "rgba(255, 255, 255, 0.1)",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: DISC_SIZE,
        height: SELECTOR_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    redDisc: {
      id: "redDisc",
      tags: ["disc", "red"],
      sprite: {
        type: "circle",
        radius: DISC_SIZE / 2 - 0.05,
        color: RED_COLOR,
      },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: DISC_SIZE / 2 - 0.05,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    yellowDisc: {
      id: "yellowDisc",
      tags: ["disc", "yellow"],
      sprite: {
        type: "circle",
        radius: DISC_SIZE / 2 - 0.05,
        color: YELLOW_COLOR,
      },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: DISC_SIZE / 2 - 0.05,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "board-bg",
      name: "Board Background",
      template: "boardBackground",
      transform: {
        x: 0,
        y: -SELECTOR_HEIGHT / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
      layer: -2,
    },
    ...emptySlotEntities,
    ...columnSelectorEntities,
  ],
  rules: [
     {
       id: "tap_column_0",
       name: "Tap Column 0",
       trigger: { type: "tap", target: "selector-col-0" },
       conditions: [
         { type: "expression", expr: '!stateIs("turnFlow", "gameOver")' },
         { type: "variable", name: "col0Height", comparison: "lt", value: ROWS },
       ],
       actions: [
         { type: "event", eventName: "drop_col_0" },
       ],
     },
     {
       id: "tap_column_1",
       name: "Tap Column 1",
       trigger: { type: "tap", target: "selector-col-1" },
       conditions: [
         { type: "expression", expr: '!stateIs("turnFlow", "gameOver")' },
         { type: "variable", name: "col1Height", comparison: "lt", value: ROWS },
       ],
       actions: [
         { type: "event", eventName: "drop_col_1" },
       ],
     },
     {
       id: "tap_column_2",
       name: "Tap Column 2",
       trigger: { type: "tap", target: "selector-col-2" },
       conditions: [
         { type: "expression", expr: '!stateIs("turnFlow", "gameOver")' },
         { type: "variable", name: "col2Height", comparison: "lt", value: ROWS },
       ],
       actions: [
         { type: "event", eventName: "drop_col_2" },
       ],
     },
     {
       id: "tap_column_3",
       name: "Tap Column 3",
       trigger: { type: "tap", target: "selector-col-3" },
       conditions: [
         { type: "expression", expr: '!stateIs("turnFlow", "gameOver")' },
         { type: "variable", name: "col3Height", comparison: "lt", value: ROWS },
       ],
       actions: [
         { type: "event", eventName: "drop_col_3" },
       ],
     },
     {
       id: "tap_column_4",
       name: "Tap Column 4",
       trigger: { type: "tap", target: "selector-col-4" },
       conditions: [
         { type: "expression", expr: '!stateIs("turnFlow", "gameOver")' },
         { type: "variable", name: "col4Height", comparison: "lt", value: ROWS },
       ],
       actions: [
         { type: "event", eventName: "drop_col_4" },
       ],
     },
     {
       id: "tap_column_5",
       name: "Tap Column 5",
       trigger: { type: "tap", target: "selector-col-5" },
       conditions: [
         { type: "expression", expr: '!stateIs("turnFlow", "gameOver")' },
         { type: "variable", name: "col5Height", comparison: "lt", value: ROWS },
       ],
       actions: [
         { type: "event", eventName: "drop_col_5" },
       ],
     },
     {
       id: "tap_column_6",
       name: "Tap Column 6",
       trigger: { type: "tap", target: "selector-col-6" },
       conditions: [
         { type: "expression", expr: '!stateIs("turnFlow", "gameOver")' },
         { type: "variable", name: "col6Height", comparison: "lt", value: ROWS },
       ],
       actions: [
         { type: "event", eventName: "drop_col_6" },
       ],
     },
    {
      id: "handle_drop_col_0",
      name: "Handle Drop Column 0",
      trigger: { type: "event", eventName: "drop_col_0" },
      actions: [
        { type: "set_variable", name: "col0Height", operation: "add", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "event", eventName: "disc_dropped" },
      ],
    },
    {
      id: "handle_drop_col_1",
      name: "Handle Drop Column 1",
      trigger: { type: "event", eventName: "drop_col_1" },
      actions: [
        { type: "set_variable", name: "col1Height", operation: "add", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "event", eventName: "disc_dropped" },
      ],
    },
    {
      id: "handle_drop_col_2",
      name: "Handle Drop Column 2",
      trigger: { type: "event", eventName: "drop_col_2" },
      actions: [
        { type: "set_variable", name: "col2Height", operation: "add", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "event", eventName: "disc_dropped" },
      ],
    },
    {
      id: "handle_drop_col_3",
      name: "Handle Drop Column 3",
      trigger: { type: "event", eventName: "drop_col_3" },
      actions: [
        { type: "set_variable", name: "col3Height", operation: "add", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "event", eventName: "disc_dropped" },
      ],
    },
    {
      id: "handle_drop_col_4",
      name: "Handle Drop Column 4",
      trigger: { type: "event", eventName: "drop_col_4" },
      actions: [
        { type: "set_variable", name: "col4Height", operation: "add", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "event", eventName: "disc_dropped" },
      ],
    },
    {
      id: "handle_drop_col_5",
      name: "Handle Drop Column 5",
      trigger: { type: "event", eventName: "drop_col_5" },
      actions: [
        { type: "set_variable", name: "col5Height", operation: "add", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "event", eventName: "disc_dropped" },
      ],
    },
    {
      id: "handle_drop_col_6",
      name: "Handle Drop Column 6",
      trigger: { type: "event", eventName: "drop_col_6" },
      actions: [
        { type: "set_variable", name: "col6Height", operation: "add", value: 1 },
        { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
        { type: "event", eventName: "disc_dropped" },
      ],
    },

     {
       id: "check_draw",
       name: "Check for Draw",
       trigger: { type: "event", eventName: "disc_dropped" },
       conditions: [
         { type: "variable", name: "moveCount", comparison: "gte", value: 42 },
       ],
       actions: [
         { type: "event", eventName: "game_ended" },
       ],
     },
  ],
};

export default game;
