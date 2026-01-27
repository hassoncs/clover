import type { GameDefinition, GameEntity } from "@slopcade/shared";
import { createCoordinateHelpers, generateGridEntities } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Stack & Match",
  description: "Place tiles on a grid to match 3+ adjacent same-color tiles",
  status: "archived",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const { cx, cy } = createCoordinateHelpers(WORLD_WIDTH, WORLD_HEIGHT);

const GRID_COLS = 5;
const GRID_ROWS = 5;
const TILE_SIZE = 1.6;
const TILE_GAP = 0.2;
const GRID_START_X = 1.0;
const GRID_START_Y = 2.5;

const CHOICE_Y = 14.0;
const CHOICE_SPACING = 3.0;
const CHOICE_START_X = 3.0;

const TILE_COLORS = ["#E53935", "#1E88E5", "#43A047", "#FDD835", "#8E24AA"];
const SLOT_COLOR = "#37474F";

function generateChoiceTiles(): GameEntity[] {
  const choices: GameEntity[] = [];
  for (let i = 0; i < 3; i++) {
    const x = CHOICE_START_X + i * CHOICE_SPACING;
    const colorIndex = i % TILE_COLORS.length;
    choices.push({
      id: `choice-${i}`,
      name: `Choice ${i + 1}`,
      template: `tile${colorIndex}`,
      tags: ["choice", "selectable", `color${colorIndex}`],
      transform: { x: cx(x), y: cy(CHOICE_Y), angle: 0, scaleX: 1, scaleY: 1 },
    });
  }
  return choices;
}

const gridSlots = generateGridEntities({
  rows: GRID_ROWS,
  cols: GRID_COLS,
  startX: GRID_START_X,
  startY: GRID_START_Y,
  cellSize: TILE_SIZE,
  gap: TILE_GAP,
  template: "gridSlot",
  tags: ["slot", "empty"],
  idPrefix: "slot",
  namePrefix: "Slot",
  coordinateHelpers: { cx, cy },
});
const choiceTiles = generateChoiceTiles();

const game: GameDefinition = {
  metadata: {
    id: "test-stack-match",
    title: "Stack & Match",
    description: "Place tiles on a grid to match 3+ adjacent same-color tiles",
    instructions:
      "Tap a tile choice to select it, then tap an empty grid slot to place it. Match 3+ adjacent same-color tiles to clear them and score points!",
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
    tilesPlaced: 0,
    matchesFound: 0,
  },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a237e",
    variableDisplays: [
      { name: "matchesFound", label: "Matches", color: "#4CAF50" },
    ],
  },
  winCondition: {
    type: "score",
    score: 500,
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
        { id: "placing" },
        {
          id: "checking",
          timeout: 0.3,
          timeoutTransition: "clearing",
        },
        {
          id: "clearing",
          timeout: 0.3,
          timeoutTransition: "spawning",
          onEnter: [{ type: "event", eventName: "clear_matches" }],
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
          to: "placing",
          trigger: { type: "event", eventName: "tile_selected" },
        },
        {
          id: "t2",
          from: "placing",
          to: "checking",
          trigger: { type: "event", eventName: "tile_placed" },
        },
        {
          id: "t3",
          from: "placing",
          to: "choosing",
          trigger: { type: "event", eventName: "cancel_selection" },
        },
      ],
    },
  ],
  templates: {
    gridSlot: {
      id: "gridSlot",
      tags: ["slot"],
      sprite: { type: "rect", width: TILE_SIZE, height: TILE_SIZE, color: SLOT_COLOR },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE,
        height: TILE_SIZE,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    tile0: {
      id: "tile0",
      tags: ["tile", "color0"],
      sprite: { type: "rect", width: TILE_SIZE * 0.9, height: TILE_SIZE * 0.9, color: TILE_COLORS[0] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.9,
        height: TILE_SIZE * 0.9,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    tile1: {
      id: "tile1",
      tags: ["tile", "color1"],
      sprite: { type: "rect", width: TILE_SIZE * 0.9, height: TILE_SIZE * 0.9, color: TILE_COLORS[1] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.9,
        height: TILE_SIZE * 0.9,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    tile2: {
      id: "tile2",
      tags: ["tile", "color2"],
      sprite: { type: "rect", width: TILE_SIZE * 0.9, height: TILE_SIZE * 0.9, color: TILE_COLORS[2] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.9,
        height: TILE_SIZE * 0.9,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    tile3: {
      id: "tile3",
      tags: ["tile", "color3"],
      sprite: { type: "rect", width: TILE_SIZE * 0.9, height: TILE_SIZE * 0.9, color: TILE_COLORS[3] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.9,
        height: TILE_SIZE * 0.9,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    tile4: {
      id: "tile4",
      tags: ["tile", "color4"],
      sprite: { type: "rect", width: TILE_SIZE * 0.9, height: TILE_SIZE * 0.9, color: TILE_COLORS[4] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.9,
        height: TILE_SIZE * 0.9,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    placedTile0: {
      id: "placedTile0",
      tags: ["placed", "color0"],
      sprite: { type: "rect", width: TILE_SIZE * 0.85, height: TILE_SIZE * 0.85, color: TILE_COLORS[0] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.85,
        height: TILE_SIZE * 0.85,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    placedTile1: {
      id: "placedTile1",
      tags: ["placed", "color1"],
      sprite: { type: "rect", width: TILE_SIZE * 0.85, height: TILE_SIZE * 0.85, color: TILE_COLORS[1] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.85,
        height: TILE_SIZE * 0.85,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    placedTile2: {
      id: "placedTile2",
      tags: ["placed", "color2"],
      sprite: { type: "rect", width: TILE_SIZE * 0.85, height: TILE_SIZE * 0.85, color: TILE_COLORS[2] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.85,
        height: TILE_SIZE * 0.85,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    placedTile3: {
      id: "placedTile3",
      tags: ["placed", "color3"],
      sprite: { type: "rect", width: TILE_SIZE * 0.85, height: TILE_SIZE * 0.85, color: TILE_COLORS[3] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.85,
        height: TILE_SIZE * 0.85,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    placedTile4: {
      id: "placedTile4",
      tags: ["placed", "color4"],
      sprite: { type: "rect", width: TILE_SIZE * 0.85, height: TILE_SIZE * 0.85, color: TILE_COLORS[4] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: TILE_SIZE * 0.85,
        height: TILE_SIZE * 0.85,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [...gridSlots, ...choiceTiles],
  rules: [
    {
      id: "select_choice",
      name: "Select a tile choice",
      trigger: { type: "tap", target: "choice" },
      conditions: [
        { type: "variable", name: "selectedChoiceIndex", comparison: "eq", value: -1 },
      ],
      actions: [
        { type: "event", eventName: "tile_selected" },
      ],
    },
    {
      id: "place_tile",
      name: "Place tile on empty slot",
      trigger: { type: "tap", target: "empty" },
      conditions: [
        { type: "variable", name: "selectedChoiceIndex", comparison: "gte", value: 0 },
      ],
      actions: [
        { type: "set_variable", name: "tilesPlaced", operation: "add", value: 1 },
        { type: "event", eventName: "tile_placed" },
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
        { type: "event", eventName: "tile_selected" },
      ],
    },
    {
      id: "handle_match_clear",
      name: "Handle clearing matched tiles",
      trigger: { type: "event", eventName: "clear_matches" },
      actions: [
        { type: "set_variable", name: "matchesFound", operation: "add", value: 1 },
        { type: "score", operation: "add", value: 50 },
        { type: "camera_shake", intensity: 0.05, duration: 0.15 },
      ],
    },
    {
      id: "spawn_choices",
      name: "Spawn new choice tiles",
      trigger: { type: "event", eventName: "spawn_new_choices" },
      actions: [
        { type: "destroy", target: { type: "by_tag", tag: "choice" } },
        {
          type: "spawn",
          template: "tile0",
          position: { type: "fixed", x: cx(CHOICE_START_X), y: cy(CHOICE_Y) },
        },
        {
          type: "spawn",
          template: "tile1",
          position: { type: "fixed", x: cx(CHOICE_START_X + CHOICE_SPACING), y: cy(CHOICE_Y) },
        },
        {
          type: "spawn",
          template: "tile2",
          position: { type: "fixed", x: cx(CHOICE_START_X + CHOICE_SPACING * 2), y: cy(CHOICE_Y) },
        },
      ],
    },
  ],
};

export default game;
