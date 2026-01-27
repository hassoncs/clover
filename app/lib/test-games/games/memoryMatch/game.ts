import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Memory Match",
  description: "Flip cards to find matching pairs",
  status: "archived",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const CARD_WIDTH = 1.8;
const CARD_HEIGHT = 2.4;
const GRID_COLS = 4;
const GRID_ROWS = 4;
const CARD_SPACING_X = 2.4;
const CARD_SPACING_Y = 3.0;
const GRID_START_X = 1.8;
const GRID_START_Y = 3.0;

const CARD_COLORS = [
  "#E53935",
  "#1E88E5",
  "#43A047",
  "#FDD835",
  "#8E24AA",
  "#FB8C00",
  "#EC407A",
  "#00ACC1",
];

const CARD_BACK_COLOR = "#37474F";

function generateCardLayout(): Array<{ x: number; y: number; pairId: number }> {
  const cards: Array<{ x: number; y: number; pairId: number }> = [];
  const pairIds: number[] = [];
  
  for (let i = 0; i < 8; i++) {
    pairIds.push(i, i);
  }
  
  for (let i = pairIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairIds[i], pairIds[j]] = [pairIds[j], pairIds[i]];
  }
  
  let idx = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      cards.push({
        x: GRID_START_X + col * CARD_SPACING_X,
        y: GRID_START_Y + row * CARD_SPACING_Y,
        pairId: pairIds[idx],
      });
      idx++;
    }
  }
  
  return cards;
}

const cardLayout = generateCardLayout();

const cardEntities: GameEntity[] = cardLayout.map((card, i) => ({
  id: `card-${i}`,
  name: `Card ${i + 1}`,
  template: "cardBack",
  tags: ["card", "face-down", `pair-${card.pairId}`],
  transform: { x: cx(card.x), y: cy(card.y), angle: 0, scaleX: 1, scaleY: 1 },
  variables: {
    pairId: card.pairId,
    cardIndex: i,
  },
}));

const game: GameDefinition = {
  metadata: {
    id: "test-memory-match",
    title: "Memory Match",
    description: "Flip cards to find matching pairs",
    instructions: "Tap cards to flip them. Find all 8 matching pairs to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  variables: {
    firstCardId: "",
    secondCardId: "",
    firstPairId: -1,
    secondPairId: -1,
    matchedPairs: 0,
  },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: true,
    timerCountdown: false,
    backgroundColor: "#1a237e",
    variableDisplays: [
      { name: "matchedPairs", label: "Pairs Found", color: "#4CAF50" },
    ],
  },
  winCondition: {
    type: "score",
    score: 800,
  },
  stateMachines: [
    {
      id: "gameFlow",
      initialState: "idle",
      states: [
        { id: "idle" },
        { id: "firstCardFlipped" },
        { id: "secondCardFlipped" },
        { id: "checkingMatch", timeout: 1.0, timeoutTransition: "idle" },
      ],
      transitions: [
        {
          id: "flip_first",
          from: "idle",
          to: "firstCardFlipped",
          trigger: { type: "event", eventName: "card_flipped" },
        },
        {
          id: "flip_second",
          from: "firstCardFlipped",
          to: "secondCardFlipped",
          trigger: { type: "event", eventName: "card_flipped" },
        },
        {
          id: "check_match",
          from: "secondCardFlipped",
          to: "checkingMatch",
          trigger: { type: "event", eventName: "check_match" },
        },
        {
          id: "match_found",
          from: "checkingMatch",
          to: "idle",
          trigger: { type: "event", eventName: "match_success" },
        },
      ],
    },
  ],
  templates: {
    cardBack: {
      id: "cardBack",
      tags: ["card", "face-down"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_BACK_COLOR },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    card0: {
      id: "card0",
      tags: ["card", "face-up"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_COLORS[0] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    card1: {
      id: "card1",
      tags: ["card", "face-up"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_COLORS[1] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    card2: {
      id: "card2",
      tags: ["card", "face-up"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_COLORS[2] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    card3: {
      id: "card3",
      tags: ["card", "face-up"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_COLORS[3] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    card4: {
      id: "card4",
      tags: ["card", "face-up"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_COLORS[4] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    card5: {
      id: "card5",
      tags: ["card", "face-up"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_COLORS[5] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    card6: {
      id: "card6",
      tags: ["card", "face-up"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_COLORS[6] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    card7: {
      id: "card7",
      tags: ["card", "face-up"],
      sprite: { type: "rect", width: CARD_WIDTH, height: CARD_HEIGHT, color: CARD_COLORS[7] },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [...cardEntities],
  rules: [
    {
      id: "tap_card",
      name: "Flip a face-down card when tapped",
      trigger: { type: "tap", target: "face-down" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'idle') || stateIs('gameFlow', 'firstCardFlipped')" },
      ],
      actions: [
        { type: "event", eventName: "card_flipped" },
      ],
    },
    {
      id: "first_card_flipped",
      name: "Track first card flip",
      trigger: { type: "event", eventName: "card_flipped" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'idle')" },
      ],
      actions: [
        { type: "state_transition", machineId: "gameFlow", toState: "firstCardFlipped" },
      ],
    },
    {
      id: "second_card_flipped",
      name: "Track second card flip and check match",
      trigger: { type: "event", eventName: "card_flipped" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'firstCardFlipped')" },
      ],
      actions: [
        { type: "state_transition", machineId: "gameFlow", toState: "secondCardFlipped" },
        { type: "event", eventName: "check_match" },
      ],
    },
    {
      id: "match_found",
      name: "Handle matching pair",
      trigger: { type: "event", eventName: "match_success" },
      actions: [
        { type: "score", operation: "add", value: 100 },
        { type: "set_variable", name: "matchedPairs", operation: "add", value: 1 },
        { type: "destroy", target: { type: "by_tag", tag: "face-up" } },
        { type: "state_transition", machineId: "gameFlow", toState: "idle" },
        { type: "camera_shake", intensity: 0.05, duration: 0.15 },
      ],
    },
    {
      id: "no_match",
      name: "Handle non-matching pair - flip back after delay",
      trigger: { type: "event", eventName: "match_fail" },
      actions: [
        { type: "state_transition", machineId: "gameFlow", toState: "idle" },
      ],
    },
    {
      id: "reset_after_delay",
      name: "Reset cards after no match",
      trigger: { type: "timer", time: 1, repeat: false },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'checkingMatch')" },
      ],
      actions: [
        { type: "event", eventName: "match_fail" },
      ],
    },
  ],
};

export default game;
