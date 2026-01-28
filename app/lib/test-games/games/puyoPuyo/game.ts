import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/puyoPuyo";

export const metadata: TestGameMeta = {
  title: "Puyo Puyo",
  description: "Match 4+ same-colored puyos to pop them and create chains!",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  status: "archived",
};

const GRID_COLS = 6;
const GRID_ROWS = 12;
const CELL_SIZE = 0.8;
const CELL_GAP = 0.05;
const TOTAL_CELL_SIZE = CELL_SIZE + CELL_GAP;
const GRID_PADDING = 0.2;

const GRID_WIDTH = GRID_COLS * TOTAL_CELL_SIZE - CELL_GAP + GRID_PADDING * 2;
const GRID_HEIGHT = GRID_ROWS * TOTAL_CELL_SIZE - CELL_GAP + GRID_PADDING * 2;
const WORLD_WIDTH = GRID_WIDTH + 2;
const WORLD_HEIGHT = GRID_HEIGHT + 2;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const PUYO_RADIUS = CELL_SIZE / 2 - 0.02;
const WALL_THICKNESS = 0.3;

const PUYO_COLORS = {
  red: "#E53935",
  blue: "#1E88E5",
  green: "#43A047",
  yellow: "#FDD835",
  garbage: "#757575",
};

function gridToWorld(row: number, col: number): { x: number; y: number } {
  const gridStartX = -GRID_WIDTH / 2 + GRID_PADDING + CELL_SIZE / 2;
  const gridStartY = GRID_HEIGHT / 2 - GRID_PADDING - CELL_SIZE / 2;
  return {
    x: gridStartX + col * TOTAL_CELL_SIZE,
    y: gridStartY - row * TOTAL_CELL_SIZE,
  };
}

function createPuyoTemplate(color: keyof typeof PUYO_COLORS) {
  return {
    id: `puyo_${color}`,
    tags: ["puyo", `puyo_${color}`, color === "garbage" ? "garbage" : "colored"],
    sprite: {
      type: "image" as const,
      imageUrl: `${ASSET_BASE}/puyo_${color}.png`,
      imageWidth: PUYO_RADIUS * 2,
      imageHeight: PUYO_RADIUS * 2,
    },
    physics: {
      bodyType: "dynamic" as const,
      shape: "circle" as const,
      radius: PUYO_RADIUS,
      density: 1,
      friction: 0.3,
      restitution: 0,
      fixedRotation: true,
      linearDamping: 5,
    },
  };
}

const gridCellEntities: GameEntity[] = [];
for (let row = 0; row < GRID_ROWS; row++) {
  for (let col = 0; col < GRID_COLS; col++) {
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

const spawnPos = gridToWorld(0, 2);
const satellitePos = gridToWorld(-1, 2);

const game: GameDefinition = {
  metadata: {
    id: "test-puyo-puyo",
    title: "Puyo Puyo",
    description: "Match 4+ same-colored puyos to pop them and create chains!",
    instructions: "Use D-pad to move, A/B to rotate. Match 4+ same-colored puyos to pop them. Create chains for bonus points!",
    version: "1.0.0",
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  },
  world: {
    gravity: { x: 0, y: -3 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,
  },
  camera: { type: "fixed", zoom: 1 },
  input: {
    virtualDPad: {
      id: "dpad",
      size: 100,
      buttonSize: 35,
      color: "rgba(255, 255, 255, 0.3)",
      activeColor: "rgba(255, 255, 255, 0.7)",
    },
    virtualButtons: [
      {
        id: "btn_a",
        button: "action",
        label: "A",
        size: 50,
        color: "rgba(255, 100, 100, 0.5)",
        activeColor: "rgba(255, 100, 100, 0.9)",
      },
      {
        id: "btn_b",
        button: "jump",
        label: "B",
        size: 50,
        color: "rgba(100, 100, 255, 0.5)",
        activeColor: "rgba(100, 100, 255, 0.9)",
      },
    ],
  },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
    variableDisplays: [
      { name: "chainCount", label: "Chain", color: "#FFD700" },
      { name: "level", label: "Level", color: "#00BFFF" },
    ],
  },
  variables: {
    chainCount: 0,
    level: 1,
    dropSpeed: 1,
    canControl: 1,
    pairRotation: 0,
    settleTimer: 0,
    isSettling: 0,
  },
  loseCondition: {
    type: "custom",
  },
  templates: {
    emptyCell: {
      id: "emptyCell",
      tags: ["cell"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/emptyCell.png`,
        imageWidth: CELL_SIZE,
        imageHeight: CELL_SIZE,
      },
      type: "zone",
      zone: {
        shape: { type: "box", width: CELL_SIZE, height: CELL_SIZE },
      },
    },
    puyo_red: createPuyoTemplate("red"),
    puyo_blue: createPuyoTemplate("blue"),
    puyo_green: createPuyoTemplate("green"),
    puyo_yellow: createPuyoTemplate("yellow"),
    puyo_garbage: createPuyoTemplate("garbage"),
    puyoPair: {
      id: "puyoPair",
      tags: ["pair", "active"],
      sprite: {
        type: "rect",
        width: 0.1,
        height: 0.1,
        color: "#00000000",
      },
      type: "zone",
      zone: {
        shape: { type: "box", width: 0.1, height: 0.1 },
        movement: "kinematic",
      },
    },
    wall: {
      id: "wall",
      tags: ["wall", "boundary"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/wall.png`,
        imageWidth: WALL_THICKNESS,
        imageHeight: GRID_HEIGHT + 2,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WALL_THICKNESS,
        height: GRID_HEIGHT + 2,
        density: 0,
        friction: 0.5,
        restitution: 0,
      },
    },
    wallBottom: {
      id: "wallBottom",
      tags: ["wall", "boundary", "floor"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/wallBottom.png`,
        imageWidth: GRID_WIDTH + WALL_THICKNESS * 2,
        imageHeight: WALL_THICKNESS,
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: GRID_WIDTH + WALL_THICKNESS * 2,
        height: WALL_THICKNESS,
        density: 0,
        friction: 0.5,
        restitution: 0,
      },
    },
    spawnZone: {
      id: "spawnZone",
      tags: ["spawn-zone", "danger"],
      sprite: {
        type: "rect",
        width: CELL_SIZE * 2,
        height: CELL_SIZE,
        color: "#FF000033",
      },
      type: "zone",
      zone: {
        shape: { type: "box", width: CELL_SIZE * 2, height: CELL_SIZE },
      },
    },
    gridBackground: {
      id: "gridBackground",
      tags: ["background"],
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/gridBackground.png`,
        imageWidth: GRID_WIDTH,
        imageHeight: GRID_HEIGHT,
      },
      type: "zone",
      zone: {
        shape: { type: "box", width: GRID_WIDTH, height: GRID_HEIGHT },
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
    {
      id: "wall-left",
      name: "Left Wall",
      template: "wall",
      transform: {
        x: -GRID_WIDTH / 2 - WALL_THICKNESS / 2,
        y: 0,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "wall-right",
      name: "Right Wall",
      template: "wall",
      transform: {
        x: GRID_WIDTH / 2 + WALL_THICKNESS / 2,
        y: 0,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "wall-bottom",
      name: "Bottom Wall",
      template: "wallBottom",
      transform: {
        x: 0,
        y: -GRID_HEIGHT / 2 - WALL_THICKNESS / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "spawn-zone",
      name: "Spawn Zone",
      template: "spawnZone",
      transform: {
        x: gridToWorld(0, 2).x + CELL_SIZE / 2,
        y: gridToWorld(-1, 2).y,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "pivot-puyo",
      name: "Pivot Puyo",
      template: "puyo_red",
      tags: ["puyo", "puyo_red", "colored", "pivot", "active"],
      transform: { x: spawnPos.x, y: spawnPos.y, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "satellite-puyo",
      name: "Satellite Puyo",
      template: "puyo_blue",
      tags: ["puyo", "puyo_blue", "colored", "satellite", "active"],
      transform: { x: satellitePos.x, y: satellitePos.y, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    {
      id: "move_left",
      name: "Move pair left",
      trigger: { type: "button", button: "left", state: "pressed" },
      conditions: [
        { type: "variable", name: "canControl", comparison: "eq", value: 1 },
      ],
      actions: [
        {
          type: "apply_impulse",
          target: { type: "by_tag", tag: "active" },
          x: -TOTAL_CELL_SIZE * 5,
          y: 0,
        },
      ],
    },
    {
      id: "move_right",
      name: "Move pair right",
      trigger: { type: "button", button: "right", state: "pressed" },
      conditions: [
        { type: "variable", name: "canControl", comparison: "eq", value: 1 },
      ],
      actions: [
        {
          type: "apply_impulse",
          target: { type: "by_tag", tag: "active" },
          x: TOTAL_CELL_SIZE * 5,
          y: 0,
        },
      ],
    },
    {
      id: "soft_drop",
      name: "Soft drop - speed up falling",
      trigger: { type: "button", button: "down", state: "held" },
      conditions: [
        { type: "variable", name: "canControl", comparison: "eq", value: 1 },
      ],
      actions: [
        {
          type: "apply_impulse",
          target: { type: "by_tag", tag: "active" },
          x: 0,
          y: -2,
        },
      ],
    },
    {
      id: "hard_drop",
      name: "Hard drop - instant drop",
      trigger: { type: "button", button: "up", state: "pressed" },
      conditions: [
        { type: "variable", name: "canControl", comparison: "eq", value: 1 },
      ],
      actions: [
        {
          type: "apply_impulse",
          target: { type: "by_tag", tag: "active" },
          x: 0,
          y: -15,
        },
      ],
    },
    {
      id: "rotate_cw",
      name: "Rotate pair clockwise",
      trigger: { type: "button", button: "action", state: "pressed" },
      conditions: [
        { type: "variable", name: "canControl", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "pairRotation", operation: "add", value: 1 },
        { type: "event", eventName: "rotate_pair" },
      ],
    },
    {
      id: "rotate_ccw",
      name: "Rotate pair counter-clockwise",
      trigger: { type: "button", button: "jump", state: "pressed" },
      conditions: [
        { type: "variable", name: "canControl", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "pairRotation", operation: "subtract", value: 1 },
        { type: "event", eventName: "rotate_pair" },
      ],
    },
    {
      id: "pair_lands",
      name: "When active puyos hit floor or other puyos",
      trigger: { type: "collision", entityATag: "active", entityBTag: "floor" },
      actions: [
        { type: "set_variable", name: "canControl", operation: "set", value: 0 },
        { type: "set_variable", name: "isSettling", operation: "set", value: 1 },
        { type: "event", eventName: "start_settle" },
      ],
    },
    {
      id: "pair_lands_on_puyo",
      name: "When active puyos hit settled puyos",
      trigger: { type: "collision", entityATag: "active", entityBTag: "settled" },
      conditions: [
        { type: "variable", name: "canControl", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "canControl", operation: "set", value: 0 },
        { type: "set_variable", name: "isSettling", operation: "set", value: 1 },
        { type: "event", eventName: "start_settle" },
      ],
    },
    {
      id: "settle_complete",
      name: "After settling, check for matches",
      trigger: { type: "event", eventName: "settle_complete" },
      actions: [
        { type: "event", eventName: "check_matches" },
      ],
    },
    {
      id: "check_matches",
      name: "Check for 4+ connected puyos",
      trigger: { type: "event", eventName: "check_matches" },
      actions: [
        { type: "event", eventName: "pop_matches" },
      ],
    },
    {
      id: "pop_matches",
      name: "Pop matched puyos and add score",
      trigger: { type: "event", eventName: "pop_matches" },
      actions: [
        { type: "set_variable", name: "chainCount", operation: "add", value: 1 },
        { type: "score", operation: "add", value: 100 },
        { type: "event", eventName: "gravity_settle" },
      ],
    },
    {
      id: "gravity_settle",
      name: "Puyos above fall down",
      trigger: { type: "event", eventName: "gravity_settle" },
      actions: [
        { type: "event", eventName: "check_matches" },
      ],
    },
    {
      id: "spawn_next",
      name: "Spawn new pair after settling",
      trigger: { type: "event", eventName: "spawn_next" },
      actions: [
        { type: "set_variable", name: "chainCount", operation: "set", value: 0 },
        { type: "set_variable", name: "canControl", operation: "set", value: 1 },
        { type: "set_variable", name: "isSettling", operation: "set", value: 0 },
        {
          type: "spawn",
          template: ["puyo_red", "puyo_blue", "puyo_green", "puyo_yellow"],
          position: { type: "fixed", x: spawnPos.x, y: spawnPos.y },
        },
        {
          type: "spawn",
          template: ["puyo_red", "puyo_blue", "puyo_green", "puyo_yellow"],
          position: { type: "fixed", x: satellitePos.x, y: satellitePos.y },
        },
      ],
    },
    {
      id: "check_game_over",
      name: "Check if spawn zone is blocked",
      trigger: { type: "collision", entityATag: "settled", entityBTag: "danger" },
      actions: [
        { type: "game_state", state: "lose" },
      ],
    },
    {
      id: "level_up",
      name: "Increase level every 1000 points",
      trigger: { type: "score", threshold: 1000, comparison: "gte" },
      actions: [
        { type: "set_variable", name: "level", operation: "add", value: 1 },
        { type: "set_variable", name: "dropSpeed", operation: "add", value: 0.5 },
      ],
    },
  ],
};

export default game;
