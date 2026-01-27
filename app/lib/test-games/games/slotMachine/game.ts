import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Fruit Slots",
  description: "Classic 5-reel fruit machine with free spins and bonuses",
  status: "archived",
};

// Configuration constants
const REELS = 5;
const ROWS = 3;
const CELL_SIZE = 1.4;
const GRID_WIDTH = REELS * CELL_SIZE;
const GRID_HEIGHT = ROWS * CELL_SIZE;
const GRID_OFFSET_X = GRID_WIDTH / 2 - CELL_SIZE / 2;
const GRID_OFFSET_Y = GRID_HEIGHT / 2 - CELL_SIZE / 2;

// Symbol indices (match order in symbolTemplates)
const SYMBOLS = {
  cherry: 0,
  lemon: 1,
  orange: 2,
  plum: 3,
  bell: 4,
  bar: 5,
  seven: 6,
  wild: 7,
  scatter: 8,
} as const;

type SymbolKey = keyof typeof SYMBOLS;

// Reel strips - weighted symbol distribution per reel
const reelStrips: number[][] = [
  // Reel 1 - More low symbols
  [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8],
  // Reel 2 - Balanced distribution
  [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8],
  // Reel 3 - More medium symbols
  [0, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 8],
  // Reel 4 - More high symbols
  [1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8],
  // Reel 5 - Jackpot reel with more premium symbols
  [2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 7, 7, 7, 8, 8, 8],
];

// Payout configurations
const payouts = [
  { symbolIndex: SYMBOLS.cherry, counts: { 3: 5, 4: 20, 5: 50 } },
  { symbolIndex: SYMBOLS.lemon, counts: { 3: 5, 4: 20, 5: 50 } },
  { symbolIndex: SYMBOLS.orange, counts: { 3: 10, 4: 40, 5: 100 } },
  { symbolIndex: SYMBOLS.plum, counts: { 3: 10, 4: 40, 5: 100 } },
  { symbolIndex: SYMBOLS.bell, counts: { 3: 20, 4: 75, 5: 200 } },
  { symbolIndex: SYMBOLS.bar, counts: { 3: 30, 4: 100, 5: 300 } },
  { symbolIndex: SYMBOLS.seven, counts: { 3: 50, 4: 150, 5: 500 } },
];

// Symbol colors for visual fallback
const symbolColors: Record<SymbolKey, string> = {
  cherry: "#FF1744",
  lemon: "#FFEB3B",
  orange: "#FF9100",
  plum: "#9C27B0",
  bell: "#FFD700",
  bar: "#37474F",
  seven: "#D50000",
  wild: "#00E676",
  scatter: "#2979FF",
};

function createRectSymbolTemplate(key: Exclude<SymbolKey, "scatter">) {
  return {
    id: key,
    tags: ["symbol", key, key === "wild" ? "wild" : ""].filter(Boolean),
    sprite: {
      type: "rect" as const,
      width: CELL_SIZE * 0.85,
      height: CELL_SIZE * 0.85,
      color: symbolColors[key],
    },
    physics: {
      bodyType: "static" as const,
      shape: "box" as const,
      width: CELL_SIZE * 0.85,
      height: CELL_SIZE * 0.85,
      density: 0,
      friction: 0,
      restitution: 0,
      isSensor: true,
    },
  };
}

function createCircleSymbolTemplate() {
  return {
    id: "scatter",
    tags: ["symbol", "scatter"],
    sprite: {
      type: "circle" as const,
      radius: (CELL_SIZE * 0.85) / 2,
      color: symbolColors.scatter,
    },
    physics: {
      bodyType: "static" as const,
      shape: "circle" as const,
      radius: (CELL_SIZE * 0.85) / 2,
      density: 0,
      friction: 0,
      restitution: 0,
      isSensor: true,
    },
  };
}

const game: GameDefinition = {
  metadata: {
    id: "fruit-slots",
    title: "Fruit Slots",
    description: "Classic 5-reel fruit machine with free spins and bonuses!",
    instructions:
      "Tap SPIN to play. Match 3+ symbols from left for wins. 3+ Scatter symbols trigger Free Spins!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: GRID_WIDTH + 2, height: GRID_HEIGHT + 4 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
    variableDisplays: [
      { name: "credits", label: "Credits", color: "#FFD700" },
      { name: "bet", label: "Bet", color: "#4FC3F7" },
      { name: "lastWin", label: "Win", color: "#69F0AE" },
      { name: "freeSpins", label: "Free Spins", color: "#FF4081" },
    ],
  },
  variables: {
    credits: 1000,
    bet: 1,
    lastWin: 0,
    freeSpins: 0,
    isSpinning: 0,
  },
  templates: {
    // Symbol templates
    cherry: createRectSymbolTemplate("cherry"),
    lemon: createRectSymbolTemplate("lemon"),
    orange: createRectSymbolTemplate("orange"),
    plum: createRectSymbolTemplate("plum"),
    bell: createRectSymbolTemplate("bell"),
    bar: createRectSymbolTemplate("bar"),
    seven: createRectSymbolTemplate("seven"),
    wild: createRectSymbolTemplate("wild"),
    scatter: createCircleSymbolTemplate(),
    
    // Grid cell background
    gridCell: {
      id: "gridCell",
      tags: ["grid"],
      sprite: {
        type: "rect",
        width: CELL_SIZE * 0.9,
        height: CELL_SIZE * 0.9,
        color: "#2D2D44",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CELL_SIZE * 0.9,
        height: CELL_SIZE * 0.9,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    
    // UI templates
    spinButton: {
      id: "spinButton",
      tags: ["ui", "button"],
      sprite: {
        type: "rect",
        width: 2.2,
        height: 0.9,
        color: "#4CAF50",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 2.2,
        height: 0.9,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    betButton: {
      id: "betButton",
      tags: ["ui", "button"],
      sprite: {
        type: "rect",
        width: 1.2,
        height: 0.6,
        color: "#2196F3",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 1.2,
        height: 0.6,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    // Grid background
    {
      id: "slot-grid-bg",
      name: "Slot Grid Background",
      template: "gridCell",
      transform: {
        x: GRID_OFFSET_X,
        y: GRID_OFFSET_Y,
        angle: 0,
        scaleX: REELS,
        scaleY: ROWS,
      },
      layer: -2,
    },
    
    // Spin button
    {
      id: "spin_button",
      name: "Spin Button",
      template: "spinButton",
      transform: { x: GRID_WIDTH / 2, y: -1.5, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 10,
    },
    
    // Bet buttons (hidden by default, can be shown via system)
    {
      id: "bet_decrease",
      name: "Bet Decrease",
      template: "betButton",
      transform: { x: GRID_WIDTH / 2 - 2, y: -1.5, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 10,
      visible: false,
    },
    {
      id: "bet_increase",
      name: "Bet Increase",
      template: "betButton",
      transform: { x: GRID_WIDTH / 2 + 2, y: -1.5, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 10,
      visible: false,
    },
  ],
  rules: [
    {
      id: "spin_on_tap",
      name: "Spin on Button Tap",
      trigger: { type: "tap", target: "spin_button" },
      conditions: [
        { type: "variable", name: "isSpinning", comparison: "eq", value: 0 },
      ],
      actions: [
        { type: "set_variable", name: "isSpinning", operation: "set", value: 1 },
        { type: "event", eventName: "spin" },
      ],
    },
  ],
  slotMachine: {
    gridId: "slot_grid",
    reels: REELS,
    rows: ROWS,
    cellSize: CELL_SIZE,
    symbolTemplates: ["cherry", "lemon", "orange", "plum", "bell", "bar", "seven", "wild", "scatter"],
    reelStrips,
    wildSymbolIndex: SYMBOLS.wild,
    scatterSymbolIndex: SYMBOLS.scatter,
    payouts,
    freeSpins: {
      scatterCount: [10, 15, 20], // 3, 4, 5 scatters
    },
    cascading: true,
    spinDuration: 2000,
    reelStopDelay: 300,
  },
};

export default game;
