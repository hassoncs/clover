import {
  createGridConfig,
  gridCellToWorld,
  type GameDefinition,
} from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Candy Crush",
  description: "Match 3 or more candies to clear them and score points!",
};

const GRID_COLS = 7;
const GRID_ROWS = 7;
const CELL_SIZE = 1.2;
const WORLD_WIDTH = GRID_COLS * CELL_SIZE + 2;
const WORLD_HEIGHT = GRID_ROWS * CELL_SIZE + 4;
const CANDY_SIZE = CELL_SIZE * 0.85;

const gridConfig = createGridConfig(GRID_ROWS, GRID_COLS, CELL_SIZE, "center");

function getCellPosition(row: number, col: number): { x: number; y: number } {
  return gridCellToWorld(gridConfig, row, col);
}

const game: GameDefinition = {
  metadata: {
    id: "test-candy-crush",
    title: "Candy Crush",
    description: "Match 3 or more candies to clear them!",
    instructions:
      "Tap two adjacent candies to swap them. Match 3 or more of the same color to clear!",
    version: "1.0.0",
  },
  background: {
    type: "static",
    color: "#fd1b4e",
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
    gridId: "candy_grid",
    rows: GRID_ROWS,
    cols: GRID_COLS,
    cellSize: CELL_SIZE,
    originX: gridConfig.originX,
    originY: gridConfig.originY,
    pieceTemplates: [
      "candy_red",
      "candy_blue",
      "candy_green",
      "candy_yellow",
      "candy_purple",
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
    candy_red: {
      id: "candy_red",
      tags: ["candy", "candy_red"],
      sprite: {
        type: "circle",
        radius: CANDY_SIZE / 2,
        color: "#FF4444",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: CANDY_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    candy_blue: {
      id: "candy_blue",
      tags: ["candy", "candy_blue"],
      sprite: {
        type: "circle",
        radius: CANDY_SIZE / 2,
        color: "#4444FF",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: CANDY_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    candy_green: {
      id: "candy_green",
      tags: ["candy", "candy_green"],
      sprite: {
        type: "circle",
        radius: CANDY_SIZE / 2,
        color: "#44FF44",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: CANDY_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    candy_yellow: {
      id: "candy_yellow",
      tags: ["candy", "candy_yellow"],
      sprite: {
        type: "circle",
        radius: CANDY_SIZE / 2,
        color: "#FFFF44",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: CANDY_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    candy_purple: {
      id: "candy_purple",
      tags: ["candy", "candy_purple"],
      sprite: {
        type: "circle",
        radius: CANDY_SIZE / 2,
        color: "#AA44FF",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: CANDY_SIZE / 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
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
      const pos = getCellPosition(row, col);
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
