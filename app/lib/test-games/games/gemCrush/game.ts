import {
  createGridConfig,
  gridCellToWorld,
  type GameDefinition,
  type ConditionalBehavior,
} from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/gem-crush";

export const metadata: TestGameMeta = {
  title: "Gem Crush",
  description: "Match 3 or more gems to clear them and score points!",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
};

const GRID_COLS = 7;
const GRID_ROWS = 7;
const CELL_SIZE = 1.2;
const WORLD_WIDTH = GRID_COLS * CELL_SIZE; // 8.4m to match grid exactly
const WORLD_HEIGHT = GRID_ROWS * CELL_SIZE; // 8.4m to match grid exactly
const GEM_SIZE = CELL_SIZE * 0.85;

const gemConditionalBehaviors: ConditionalBehavior[] = [
  {
    when: { hasTag: "sys.match3:hovered" },
    priority: 1,
    behaviors: [{ type: "sprite_effect", effect: "rim_light" }],
  },
  {
    when: { hasTag: "sys.match3:selected" },
    priority: 2,
    behaviors: [
      { type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 },
      { type: "sprite_effect", effect: "glow", params: { pulse: true } },
    ],
  },
  {
    when: { hasTag: "sys.match3:matched" },
    priority: 3,
    behaviors: [
      { type: "sprite_effect", effect: "fade_out", params: { duration: 0.4 } },
    ],
  },
];

const gridConfig = createGridConfig(GRID_ROWS, GRID_COLS, CELL_SIZE);

const game: GameDefinition = {
  metadata: {
    id: "gem-crush",
    title: "Gem Crush",
    description: "Match 3 or more gems to clear them!",
    instructions:
      "Tap two adjacent gems to swap them. Match 3 or more of the same color to clear!",
    version: "1.0.0",
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: true,
    timerCountdown: true,
    backgroundColor: "#2d1b4e",
  },
  winCondition: {
    type: "score",
    score: 1000,
  },
  loseCondition: {
    type: "time_up",
    time: 120,
  },
  match3: {
    gridId: "gem_grid",
    rows: GRID_ROWS,
    cols: GRID_COLS,
    cellSize: CELL_SIZE,
    pieceTemplates: [
      "gem_red",
      "gem_blue",
      "gem_green",
      "gem_yellow",
      "gem_purple",
    ],
    minMatch: 3,
    swapDuration: 0.15,
    fallDuration: 0.1,
    clearDelay: 0.1,
    variantSheet: {
      enabled: true,
      groupId: "default",
      atlasUrl:
        "https://slopcade-api.hassoncs.workers.dev/assets/generated/test-gem-variants/gem-variants.png",
      metadataUrl:
        "https://slopcade-api.hassoncs.workers.dev/assets/generated/test-gem-variants/gem-variants.json",
      layout: { columns: 4, rows: 2, cellWidth: 64, cellHeight: 64 },
    },
  },
  templates: {
    gem_red: {
      id: "gem_red",
      tags: ["gem", "gem_red"],
      sprite: {
        type: "circle",
        radius: GEM_SIZE / 2,
        color: "#FF4444",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: GEM_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: gemConditionalBehaviors,
    },
    gem_blue: {
      id: "gem_blue",
      tags: ["gem", "gem_blue"],
      sprite: {
        type: "circle",
        radius: GEM_SIZE / 2,
        color: "#4444FF",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: GEM_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: gemConditionalBehaviors,
    },
    gem_green: {
      id: "gem_green",
      tags: ["gem", "gem_green"],
      sprite: {
        type: "circle",
        radius: GEM_SIZE / 2,
        color: "#44FF44",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: GEM_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: gemConditionalBehaviors,
    },
    gem_yellow: {
      id: "gem_yellow",
      tags: ["gem", "gem_yellow"],
      sprite: {
        type: "circle",
        radius: GEM_SIZE / 2,
        color: "#FFFF44",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: GEM_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: gemConditionalBehaviors,
    },
    gem_purple: {
      id: "gem_purple",
      tags: ["gem", "gem_purple"],
      sprite: {
        type: "circle",
        radius: GEM_SIZE / 2,
        color: "#AA44FF",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: GEM_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      conditionalBehaviors: gemConditionalBehaviors,
    },
    selection_highlight: {
      id: "selection_highlight",
      tags: ["highlight"],
      sprite: {
        type: "rect",
        width: CELL_SIZE * 1.15,
        height: CELL_SIZE * 1.15,
        color: "#FFFF00CC",
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: CELL_SIZE * 1.15,
        height: CELL_SIZE * 1.15,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    hover_highlight: {
      id: "hover_highlight",
      tags: ["highlight", "hover"],
      sprite: {
        type: "rect",
        width: CELL_SIZE * 1.1,
        height: CELL_SIZE * 1.1,
        color: "#FFFFFF66",
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: CELL_SIZE * 1.1,
        height: CELL_SIZE * 1.1,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    grid_cell: {
      id: "grid_cell",
      tags: ["grid"],
      sprite: {
        type: "rect",
        width: CELL_SIZE * 0.95,
        height: CELL_SIZE * 0.95,
        color: "#3d2b5e",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CELL_SIZE * 0.95,
        height: CELL_SIZE * 0.95,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    ...Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
      const row = Math.floor(i / GRID_COLS);
      const col = i % GRID_COLS;
      const pos = gridCellToWorld(gridConfig, row, col);
      return {
        id: `grid_${row}_${col}`,
        name: `Grid Cell ${row},${col}`,
        template: "grid_cell",
        transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
        layer: -1,
      };
    }),
  ],
  rules: [],
};

export default game;
