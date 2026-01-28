import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Block Drop",
  description: "Drop colored blocks into columns. Match adjacent same-colored blocks to merge and score!",
  status: "archived",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const GRID_COLS = 6;
const GRID_ROWS = 8;
const BLOCK_SIZE = 1.4;
const BLOCK_GAP = 0.15;
const GRID_START_X = 1.0;
const GRID_START_Y = 1.5;

const CHOICE_Y = 14.0;
const CHOICE_SPACING = 3.0;
const CHOICE_START_X = 3.0;

const BLOCK_COLORS = ["#E53935", "#1E88E5", "#43A047", "#FDD835"];
const SLOT_COLOR = "#263238";
const COLUMN_HEADER_COLOR = "#37474F";

function generateColumnHeaders(): GameEntity[] {
  const headers: GameEntity[] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    const x = GRID_START_X + col * (BLOCK_SIZE + BLOCK_GAP);
    headers.push({
      id: `column-header-${col}`,
      name: `Column ${col}`,
      template: "columnHeader",
      tags: ["column", "droppable", `col${col}`],
      transform: { x: cx(x), y: cy(GRID_START_Y - 1.2), angle: 0, scaleX: 1, scaleY: 1 },
    });
  }
  return headers;
}

function generateGridSlots(): GameEntity[] {
  const slots: GameEntity[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = GRID_START_X + col * (BLOCK_SIZE + BLOCK_GAP);
      const y = GRID_START_Y + row * (BLOCK_SIZE + BLOCK_GAP);
      slots.push({
        id: `slot-${row}-${col}`,
        name: `Slot ${row},${col}`,
        template: "gridSlot",
        tags: ["slot", `row${row}`, `col${col}`],
        transform: { x: cx(x), y: cy(y), angle: 0, scaleX: 1, scaleY: 1 },
      });
    }
  }
  return slots;
}

function generateChoiceTiles(): GameEntity[] {
  const choices: GameEntity[] = [];
  for (let i = 0; i < 3; i++) {
    const x = CHOICE_START_X + i * CHOICE_SPACING;
    const colorIndex = i % BLOCK_COLORS.length;
    choices.push({
      id: `choice-${i}`,
      name: `Choice ${i + 1}`,
      template: `block${colorIndex}`,
      tags: ["choice", "selectable", `color${colorIndex}`],
      transform: { x: cx(x), y: cy(CHOICE_Y), angle: 0, scaleX: 1, scaleY: 1 },
    });
  }
  return choices;
}

const columnHeaders = generateColumnHeaders();
const gridSlots = generateGridSlots();
const choiceTiles = generateChoiceTiles();

const game: GameDefinition = {
  metadata: {
    id: "test-block-drop",
    title: "Block Drop",
    description: "Drop colored blocks into columns. Match adjacent same-colored blocks to merge and score!",
    instructions:
      "Tap a block choice to select it, then tap a column to drop it. When 2+ same-colored blocks are adjacent, they merge and you score points!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  variables: {
    selectedChoiceIndex: -1,
    selectedColorIndex: -1,
    blocksDropped: 0,
    mergesPerformed: 0,
  },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#0d1b2a",
    variableDisplays: [
      { name: "mergesPerformed", label: "Merges", color: "#4CAF50" },
    ],
  },
  winCondition: {
    type: "score",
    score: 1000,
  },
  stateMachines: [
    {
      id: "gameFlow",
      initialState: "choosing",
      states: [
        {
          id: "choosing",
          onEnter: [
            { type: "set_variable", name: "selectedChoiceIndex", operation: "set", value: -1 },
            { type: "set_variable", name: "selectedColorIndex", operation: "set", value: -1 },
          ],
        },
        { id: "dropping" },
        {
          id: "merging",
          timeout: 0.3,
          timeoutTransition: "checking",
          onEnter: [{ type: "event", eventName: "check_merges" }],
        },
        {
          id: "checking",
          timeout: 0.1,
          timeoutTransition: "spawning",
          onEnter: [{ type: "event", eventName: "check_game_over" }],
        },
        {
          id: "spawning",
          timeout: 0.1,
          timeoutTransition: "choosing",
          onEnter: [{ type: "event", eventName: "spawn_new_choices" }],
        },
      ],
      transitions: [
        {
          id: "t1",
          from: "choosing",
          to: "dropping",
          trigger: { type: "event", eventName: "block_selected" },
        },
        {
          id: "t2",
          from: "dropping",
          to: "merging",
          trigger: { type: "event", eventName: "block_landed" },
        },
        {
          id: "t3",
          from: "dropping",
          to: "choosing",
          trigger: { type: "event", eventName: "cancel_selection" },
        },
      ],
    },
  ],
  templates: {
    columnHeader: {
      id: "columnHeader",
      tags: ["column"],
      sprite: { type: "rect", width: BLOCK_SIZE, height: 0.8, color: COLUMN_HEADER_COLOR },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE,
          height: 0.8,
        },
      },
    },
    gridSlot: {
      id: "gridSlot",
      tags: ["slot"],
      sprite: { type: "rect", width: BLOCK_SIZE, height: BLOCK_SIZE, color: SLOT_COLOR },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE,
          height: BLOCK_SIZE,
        },
      },
    },
    block0: {
      id: "block0",
      tags: ["block", "color0"],
      sprite: { type: "rect", width: BLOCK_SIZE * 0.9, height: BLOCK_SIZE * 0.9, color: BLOCK_COLORS[0] },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE * 0.9,
          height: BLOCK_SIZE * 0.9,
        },
      },
    },
    block1: {
      id: "block1",
      tags: ["block", "color1"],
      sprite: { type: "rect", width: BLOCK_SIZE * 0.9, height: BLOCK_SIZE * 0.9, color: BLOCK_COLORS[1] },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE * 0.9,
          height: BLOCK_SIZE * 0.9,
        },
      },
    },
    block2: {
      id: "block2",
      tags: ["block", "color2"],
      sprite: { type: "rect", width: BLOCK_SIZE * 0.9, height: BLOCK_SIZE * 0.9, color: BLOCK_COLORS[2] },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE * 0.9,
          height: BLOCK_SIZE * 0.9,
        },
      },
    },
    block3: {
      id: "block3",
      tags: ["block", "color3"],
      sprite: { type: "rect", width: BLOCK_SIZE * 0.9, height: BLOCK_SIZE * 0.9, color: BLOCK_COLORS[3] },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE * 0.9,
          height: BLOCK_SIZE * 0.9,
        },
      },
    },
    placedBlock0: {
      id: "placedBlock0",
      tags: ["placed", "color0"],
      sprite: { type: "rect", width: BLOCK_SIZE * 0.85, height: BLOCK_SIZE * 0.85, color: BLOCK_COLORS[0] },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE * 0.85,
          height: BLOCK_SIZE * 0.85,
        },
      },
    },
    placedBlock1: {
      id: "placedBlock1",
      tags: ["placed", "color1"],
      sprite: { type: "rect", width: BLOCK_SIZE * 0.85, height: BLOCK_SIZE * 0.85, color: BLOCK_COLORS[1] },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE * 0.85,
          height: BLOCK_SIZE * 0.85,
        },
      },
    },
    placedBlock2: {
      id: "placedBlock2",
      tags: ["placed", "color2"],
      sprite: { type: "rect", width: BLOCK_SIZE * 0.85, height: BLOCK_SIZE * 0.85, color: BLOCK_COLORS[2] },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE * 0.85,
          height: BLOCK_SIZE * 0.85,
        },
      },
    },
    placedBlock3: {
      id: "placedBlock3",
      tags: ["placed", "color3"],
      sprite: { type: "rect", width: BLOCK_SIZE * 0.85, height: BLOCK_SIZE * 0.85, color: BLOCK_COLORS[3] },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: BLOCK_SIZE * 0.85,
          height: BLOCK_SIZE * 0.85,
        },
      },
    },
  },
  entities: [...columnHeaders, ...gridSlots, ...choiceTiles],
  rules: [
    {
      id: "select_choice",
      name: "Select a block choice",
      trigger: { type: "tap", target: "choice" },
      conditions: [
        { type: "variable", name: "selectedChoiceIndex", comparison: "eq", value: -1 },
      ],
      actions: [
        { type: "event", eventName: "block_selected" },
      ],
    },
    {
      id: "drop_block",
      name: "Drop block into column",
      trigger: { type: "tap", target: "column" },
      conditions: [
        { type: "variable", name: "selectedChoiceIndex", comparison: "gte", value: 0 },
      ],
      actions: [
        { type: "set_variable", name: "blocksDropped", operation: "add", value: 1 },
        { type: "event", eventName: "block_landed" },
      ],
    },
    {
      id: "cancel_selection",
      name: "Cancel selection by tapping another choice",
      trigger: { type: "tap", target: "choice" },
      conditions: [
        { type: "variable", name: "selectedChoiceIndex", comparison: "gte", value: 0 },
      ],
      actions: [
        { type: "event", eventName: "block_selected" },
      ],
    },
    {
      id: "handle_merge",
      name: "Handle merging adjacent blocks",
      trigger: { type: "event", eventName: "check_merges" },
      actions: [
        { type: "set_variable", name: "mergesPerformed", operation: "add", value: 1 },
        { type: "score", operation: "add", value: 100 },
        { type: "camera_shake", intensity: 0.05, duration: 0.15 },
      ],
    },
    {
      id: "spawn_choices",
      name: "Spawn new choice blocks",
      trigger: { type: "event", eventName: "spawn_new_choices" },
      actions: [
        { type: "destroy", target: { type: "by_tag", tag: "choice" } },
        {
          type: "spawn",
          template: "block0",
          position: { type: "fixed", x: cx(CHOICE_START_X), y: cy(CHOICE_Y) },
        },
        {
          type: "spawn",
          template: "block1",
          position: { type: "fixed", x: cx(CHOICE_START_X + CHOICE_SPACING), y: cy(CHOICE_Y) },
        },
        {
          type: "spawn",
          template: "block2",
          position: { type: "fixed", x: cx(CHOICE_START_X + CHOICE_SPACING * 2), y: cy(CHOICE_Y) },
        },
      ],
    },
  ],
};

export default game;
