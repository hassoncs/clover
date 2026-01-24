import type { GameDefinition, GameEntity } from "@slopcade/shared";
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
const GRID_ORIGIN_X = -(GRID_COLS * CELL_SIZE) / 2;
const GRID_ORIGIN_Y = -(GRID_ROWS * CELL_SIZE) / 2;

const CANDY_COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];

function cellToWorld(row: number, col: number): { x: number; y: number } {
  return {
    x: GRID_ORIGIN_X + col * CELL_SIZE + CELL_SIZE / 2,
    y: GRID_ORIGIN_Y + row * CELL_SIZE + CELL_SIZE / 2,
  };
}

function generateInitialBoard(): Array<{ row: number; col: number; color: string }> {
  const board: Array<{ row: number; col: number; color: string }> = [];
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      let color: string;
      let attempts = 0;
      
      do {
        color = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
        attempts++;
      } while (
        attempts < 10 && 
        wouldCreateMatch(board, row, col, color)
      );
      
      board.push({ row, col, color });
    }
  }
  
  return board;
}

function wouldCreateMatch(
  board: Array<{ row: number; col: number; color: string }>,
  row: number,
  col: number,
  color: string
): boolean {
  const getColor = (r: number, c: number): string | null => {
    const cell = board.find(b => b.row === r && b.col === c);
    return cell?.color ?? null;
  };
  
  if (col >= 2) {
    if (getColor(row, col - 1) === color && getColor(row, col - 2) === color) {
      return true;
    }
  }
  
  if (row >= 2) {
    if (getColor(row - 1, col) === color && getColor(row - 2, col) === color) {
      return true;
    }
  }
  
  return false;
}

const initialBoard = generateInitialBoard();

const candyEntities: GameEntity[] = initialBoard.map(({ row, col, color }) => {
  const pos = cellToWorld(row, col);
  return {
    id: `candy_${row}_${col}`,
    name: `Candy ${row},${col}`,
    template: `candy_${color}`,
    transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
    tags: ['candy', `candy_${color}`, `row_${row}`, `col_${col}`],
  };
});

const CANDY_SIZE = CELL_SIZE * 0.85;

const game: GameDefinition = {
  metadata: {
    id: "test-candy-crush",
    title: "Candy Crush",
    description: "Match 3 or more candies to clear them!",
    instructions: "Tap two adjacent candies to swap them. Match 3 or more of the same color to clear!",
    version: "1.0.0",
  },
  background: {
    type: "static",
    color: "#2d1b4e",
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
    variableDisplays: [
      { name: "moves", label: "Moves", color: "#FFD700" },
    ],
  },
  variables: {
    moves: 30,
    selected_row: -1,
    selected_col: -1,
    tap_grid_row: -1,
    tap_grid_col: -1,
    game_phase: 0,
    prev_selected_row: -1,
    prev_selected_col: -1,
  },
  winCondition: {
    type: "score",
    score: 1000,
  },
  loseCondition: {
    type: "time_up",
    time: 120,
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
      const pos = cellToWorld(row, col);
      return {
        id: `grid_${row}_${col}`,
        name: `Grid Cell ${row},${col}`,
        template: "grid_cell",
        transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
        layer: -1,
      };
    }),
    {
      id: "highlight",
      name: "Selection Highlight",
      template: "selection_highlight",
      transform: { x: -100, y: -100, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 1,
    },
    ...candyEntities,
  ],
  rules: [
    {
      id: "tap_candy",
      name: "Handle tap on candy - compute grid position",
      trigger: { type: "tap" },
      conditions: [
        { type: "variable", name: "game_phase", comparison: "eq", value: 0 },
      ],
      actions: [
        {
          type: "set_variable",
          name: "tap_grid_col",
          operation: "set",
          value: { expr: `floor((input.tap.worldX - (${GRID_ORIGIN_X})) / ${CELL_SIZE})` },
        },
        {
          type: "set_variable", 
          name: "tap_grid_row",
          operation: "set",
          value: { expr: `floor((input.tap.worldY - (${GRID_ORIGIN_Y})) / ${CELL_SIZE})` },
        },
      ],
    },
    {
      id: "first_selection",
      name: "Select first candy when none selected",
      trigger: { type: "frame" },
      conditions: [
        { type: "variable", name: "game_phase", comparison: "eq", value: 0 },
        { type: "variable", name: "selected_row", comparison: "eq", value: -1 },
        { type: "expression", expr: `tap_grid_row >= 0 && tap_grid_row < ${GRID_ROWS}` },
        { type: "expression", expr: `tap_grid_col >= 0 && tap_grid_col < ${GRID_COLS}` },
      ],
      actions: [
        { type: "set_variable", name: "selected_row", operation: "set", value: { expr: "tap_grid_row" } },
        { type: "set_variable", name: "selected_col", operation: "set", value: { expr: "tap_grid_col" } },
        { type: "set_variable", name: "tap_grid_row", operation: "set", value: -1 },
        { type: "set_variable", name: "tap_grid_col", operation: "set", value: -1 },
      ],
    },
    {
      id: "second_selection_swap",
      name: "Select second candy and swap if adjacent",
      trigger: { type: "frame" },
      conditions: [
        { type: "variable", name: "game_phase", comparison: "eq", value: 0 },
        { type: "expression", expr: "selected_row >= 0" },
        { type: "expression", expr: `tap_grid_row >= 0 && tap_grid_row < ${GRID_ROWS}` },
        { type: "expression", expr: `tap_grid_col >= 0 && tap_grid_col < ${GRID_COLS}` },
        { type: "expression", expr: "abs(tap_grid_row - selected_row) + abs(tap_grid_col - selected_col) == 1" },
      ],
      actions: [
        { type: "set_variable", name: "swap_row_a", operation: "set", value: { expr: "selected_row" } },
        { type: "set_variable", name: "swap_col_a", operation: "set", value: { expr: "selected_col" } },
        { type: "set_variable", name: "swap_row_b", operation: "set", value: { expr: "tap_grid_row" } },
        { type: "set_variable", name: "swap_col_b", operation: "set", value: { expr: "tap_grid_col" } },
        { type: "set_variable", name: "game_phase", operation: "set", value: 1 },
        { type: "set_variable", name: "selected_row", operation: "set", value: -1 },
        { type: "set_variable", name: "selected_col", operation: "set", value: -1 },
        { type: "set_variable", name: "tap_grid_row", operation: "set", value: -1 },
        { type: "set_variable", name: "tap_grid_col", operation: "set", value: -1 },
        { type: "set_variable", name: "moves", operation: "subtract", value: 1 },
        { type: "score", operation: "add", value: 50 },
      ],
    },
    {
      id: "deselect_same",
      name: "Deselect if tapping same candy",
      trigger: { type: "frame" },
      conditions: [
        { type: "expression", expr: "selected_row >= 0" },
        { type: "expression", expr: "tap_grid_row == selected_row && tap_grid_col == selected_col" },
      ],
      actions: [
        { type: "set_variable", name: "selected_row", operation: "set", value: -1 },
        { type: "set_variable", name: "selected_col", operation: "set", value: -1 },
        { type: "set_variable", name: "tap_grid_row", operation: "set", value: -1 },
        { type: "set_variable", name: "tap_grid_col", operation: "set", value: -1 },
      ],
    },
    {
      id: "select_different",
      name: "Select different candy if not adjacent",
      trigger: { type: "frame" },
      conditions: [
        { type: "variable", name: "game_phase", comparison: "eq", value: 0 },
        { type: "expression", expr: "selected_row >= 0" },
        { type: "expression", expr: `tap_grid_row >= 0 && tap_grid_row < ${GRID_ROWS}` },
        { type: "expression", expr: `tap_grid_col >= 0 && tap_grid_col < ${GRID_COLS}` },
        { type: "expression", expr: "tap_grid_row != selected_row || tap_grid_col != selected_col" },
        { type: "expression", expr: "abs(tap_grid_row - selected_row) + abs(tap_grid_col - selected_col) != 1" },
      ],
      actions: [
        { type: "set_variable", name: "selected_row", operation: "set", value: { expr: "tap_grid_row" } },
        { type: "set_variable", name: "selected_col", operation: "set", value: { expr: "tap_grid_col" } },
        { type: "set_variable", name: "tap_grid_row", operation: "set", value: -1 },
        { type: "set_variable", name: "tap_grid_col", operation: "set", value: -1 },
      ],
    },
    {
      id: "complete_swap",
      name: "Complete swap animation and check for matches",
      trigger: { type: "timer", time: 0.3 },
      conditions: [
        { type: "variable", name: "game_phase", comparison: "eq", value: 1 },
      ],
      actions: [
        { type: "set_variable", name: "game_phase", operation: "set", value: 0 },
      ],
    },
    {
      id: "move_highlight_to_selection",
      name: "Move highlight to selected candy",
      trigger: { type: "frame" },
      conditions: [
        { type: "expression", expr: "selected_row >= 0" },
      ],
      actions: [
        {
          type: "modify",
          target: { type: "by_id", entityId: "highlight" },
          property: "transform.x",
          operation: "set",
          value: { expr: `(${GRID_ORIGIN_X}) + selected_col * ${CELL_SIZE} + ${CELL_SIZE / 2}` },
        },
        {
          type: "modify",
          target: { type: "by_id", entityId: "highlight" },
          property: "transform.y",
          operation: "set",
          value: { expr: `(${GRID_ORIGIN_Y}) + selected_row * ${CELL_SIZE} + ${CELL_SIZE / 2}` },
        },
      ],
    },
    {
      id: "hide_highlight_no_selection",
      name: "Hide highlight when nothing selected",
      trigger: { type: "frame" },
      conditions: [
        { type: "expression", expr: "selected_row < 0" },
      ],
      actions: [
        {
          type: "modify",
          target: { type: "by_id", entityId: "highlight" },
          property: "transform.x",
          operation: "set",
          value: -100,
        },
      ],
    },
  ],
};

export default game;
