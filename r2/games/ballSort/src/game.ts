import type { GameDefinition, EntityTemplate, GameDialogsConfig } from "@slopcade/shared";
import {
  BallSortProgressSchema,
  type BallSortProgress,
  type PersistenceConfig,
} from "@slopcade/shared";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TUBE_WIDTH,
  TUBE_HEIGHT,
  TUBE_WALL_THICKNESS,
  BALL_RADIUS,
  NUM_TUBES,
} from "./layout";

export const metadata = {
  title: "Ball Sort",
  description: "Sort colored balls into tubes - each tube should contain only one color",
};



/**
 * Persistence configuration for Ball Sort.
 * Games opt-in to persistence by providing this configuration.
 */
export const ballSortPersistence: PersistenceConfig<BallSortProgress> = {
  storageKey: "ball-sort-progress",
  schema: BallSortProgressSchema as unknown as PersistenceConfig<BallSortProgress>["schema"],
  version: 1,
  defaultProgress: {
    version: 1,
    currentLevel: 1,
    highestLevelCompleted: 0,
    totalMoves: 0,
    bestTimePerLevel: {},
    bestMovesPerLevel: {},
    totalLevelsCompleted: 0,
    currentDifficulty: 1,
    totalPlayTime: 0,
    sessionsCompleted: 0,
  },
  autoSave: {
    onGameWin: true,
    onBackground: true,
  },
};

export function createBallSortGame(): GameDefinition {
  const game: GameDefinition = {
    metadata: {
      id: "03c70657-5789-4550-b38d-787d4219a91b",
      slug: "ballSort",
      title: "Ball Sort",
      description: "Sort colored balls into tubes - each tube should contain only one color",
      instructions: "Tap a tube to pick up the top ball, then tap another tube to drop it. You can only drop on the same color or an empty tube.",
      version: "2.0.0",
    },
    assetSystem: {
      activePackId: "865c8006-ab66-4ddb-8ffd-b791beb6780a",
      packIds: [
        "f661beb6-1e5e-4b9e-a01f-314c87248b75",
        "a1d20e15-bc78-47bb-b0d4-01b75dfcbf35",
        "12e102fa-b833-4735-82ab-1c609b4a4fa6",
        "865c8006-ab66-4ddb-8ffd-b791beb6780a",
      ],
    },
    world: {
      gravity: { x: 0, y: 0 },
      pixelsPerMeter: 50,
      bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    },
    background: {
      type: "static",
    },
    camera: { type: "fixed", zoom: 1 },
    input: { debugInputs: true },
    variables: {
      currentLevel: 1,
      activeDialog: "",
      heldBallColor: -1,
      sourceTubeIndex: -1,
      heldBallId: "",
      activeTubeCount: 0,
      moveCount: 0,
      startTime: 0,
      _winAtElapsed: 0,
      ...Object.fromEntries(
        Array.from({ length: NUM_TUBES }, (_, i) => [`tube${i}_count`, 0])
      ),
      ...Object.fromEntries(
        Array.from({ length: NUM_TUBES }, (_, i) => [`tube${i}_topColor`, -1])
      ),
    },
    ui: {
      showTimer: true,
      timerCountdown: false,
      backgroundColor: "#1a237e",
      variableDisplays: [
        { name: "moveCount", label: "Moves", color: "#4CAF50" },
        { name: "currentLevel", label: "Level", color: "#FFD700" },
      ],
    },
    stateMachines: [
      {
        id: "gameFlow",
        initialState: "idle",
        states: [{ id: "idle" }, { id: "holding" }],
        transitions: [
          {
            id: "pickup",
            from: "idle",
            to: "holding",
            trigger: { type: "event", eventName: "ball_picked" },
          },
          {
            id: "drop",
            from: "holding",
            to: "idle",
            trigger: { type: "event", eventName: "ball_dropped" },
          },
          {
            id: "cancel",
            from: "holding",
            to: "idle",
            trigger: { type: "event", eventName: "pickup_cancelled" },
          },
        ],
      },
    ],
    winCondition: {},
    templates: {
      background: {
        id: "background",
        tags: ["background"],
        layer: -100,
        whatDescription: "a gradient puzzle game background with subtle patterns and soft lighting",
        visual: {
          type: "image",
          imageWidth: WORLD_WIDTH,
          imageHeight: WORLD_HEIGHT,
        },
      },
      tube: {
        id: "tube",
        tags: ["tube"],
        whatDescription: "a transparent cylindrical container tube",
        visual: {
          type: "image",
          imageWidth: TUBE_WIDTH,
          imageHeight: TUBE_HEIGHT,
        },
        collider: {
          shape: "box" as const,
          width: TUBE_WIDTH - TUBE_WALL_THICKNESS * 2,
          height: TUBE_HEIGHT,
          isSensor: true,
        },
      },
      tubeHoverHighlight: {
        id: "tubeHoverHighlight",
        tags: ["highlight", "hover"],
        layer: 500,
        visual: {
          type: "rect",
          width: TUBE_WIDTH * 1.05,
          height: TUBE_HEIGHT * 1.02,
          color: "#FFFFFF",
          opacity: 0.15,
          blendMode: "add",
        },
      },
      ball0: createBallTemplate(0) as EntityTemplate,
      ball1: createBallTemplate(1) as EntityTemplate,
      ball2: createBallTemplate(2) as EntityTemplate,
      ball3: createBallTemplate(3) as EntityTemplate,
      ball4: createBallTemplate(4) as EntityTemplate,
      ball5: createBallTemplate(5) as EntityTemplate,
      ball6: createBallTemplate(6) as EntityTemplate,
      ball7: createBallTemplate(7) as EntityTemplate,
      heldBallIndicator: {
        id: "heldBallIndicator",
        tags: ["held-indicator"],
        visual: {
          type: "circle",
          radius: BALL_RADIUS * 1.2,
          color: "#FFD700",
        },
        collider: {
          shape: "circle" as const,
          radius: BALL_RADIUS * 1.2,
        },
      },
    },
    entities: [
      {
        id: "background",
        name: "Background",
        template: "background",
        transform: {
          x: 0,
          y: 0,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
      {
        id: "tube-hover-highlight",
        name: "Tube Hover Highlight",
        template: "tubeHoverHighlight",
        visible: false,
        transform: {
          x: 0,
          y: 0,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },

    ],
    rules: [
      {
        id: "generate_level",
        name: "Generate level when game loads",
        trigger: { type: "game_loaded" },
        conditions: [{ type: "expression", expr: "entityCount('tube') == 0" }],
        actions: [{ type: "run_script", export: "generateLevel" }],
      },
      {
        id: "tap_tube_idle",
        name: "Pick up ball from tube when in idle state",
        trigger: { type: "tap", target: "tube" },
        conditions: [{ type: "expression", expr: "stateIs('gameFlow', 'idle')" }],
        actions: [{ type: "ball_sort_pickup" }],
      },
      {
        id: "tap_tube_holding",
        name: "Drop ball into tube when holding",
        trigger: { type: "tap", target: "tube" },
        conditions: [{ type: "expression", expr: "stateIs('gameFlow', 'holding')" }],
        actions: [{ type: "ball_sort_drop" }],
      },
      {
        id: "cancel_pickup_same_tube",
        name: "Cancel pickup when tapping same tube",
        trigger: { type: "event", eventName: "pickup_cancelled" },
        actions: [{ type: "event", eventName: "pickup_cancelled" }],
      },
      {
        id: "check_win",
        name: "Check win condition after each move",
        trigger: { type: "event", eventName: "ball_dropped" },
        actions: [{ type: "ball_sort_check_win" }],
      },
      {
        id: "handle_delayed_win",
        name: "Show level complete dialog after animation delay",
        trigger: { type: "frame" },
        conditions: [
          { type: "expression", expr: "_winAtElapsed > 0 && elapsed() >= _winAtElapsed" },
        ],
        actions: [
          { type: "set_variable", name: "_winAtElapsed", operation: "set", value: 0 },
          { type: "set_variable", name: "activeDialog", operation: "set", value: "levelComplete" },
        ],
      },
      {
        id: "dialog_next_level",
        name: "Advance to next level when Next Level clicked",
        trigger: { type: "event", eventName: "dialog_next_level" },
        actions: [
          { type: "set_variable", name: "activeDialog", operation: "set", value: "" },
          { type: "run_script", export: "nextLevel" },
        ],
      },
      {
        id: "dialog_replay_level",
        name: "Replay current level when Replay clicked",
        trigger: { type: "event", eventName: "dialog_replay_level" },
        actions: [
          { type: "set_variable", name: "activeDialog", operation: "set", value: "" },
          { type: "run_script", export: "replayLevel" },
        ],
      },
    ],
    persistence: ballSortPersistence,
    dialogs: {
      activeDialogVariable: "activeDialog",
      dialogs: [
        {
          id: "levelComplete",
          title: "Level Complete!",
          message: "Great job!",
          stats: [
            { label: "Moves", variable: "moveCount" },
          ],
          buttons: [
            { label: "Next Level", eventName: "dialog_next_level", variant: "primary" },
            { label: "Replay Level", eventName: "dialog_replay_level", variant: "secondary" },
          ],
        },
      ],
    },
    hoverHighlight: {
      targetTag: "tube",
      highlightEntityId: "tube-hover-highlight",
    },
  };

  return game;
}

/**
 * Helper to create ball templates with conditional behaviors.
 */
function createBallTemplate(colorIndex: number) {
  const ballDiameter = BALL_RADIUS * 2;

  return {
    id: `ball${colorIndex}`,
    tags: ["ball", `color-${colorIndex}`],
    whatDescription: "a small round droppable ball object",
    visual: {
      type: "image" as const,
      imageWidth: ballDiameter,
      imageHeight: ballDiameter,
    },
    conditionalBehaviors: [
      {
        when: { hasTag: "held" },
        priority: 1,
        behaviors: [
          { type: "scale_oscillate", min: 0.95, max: 1.15, speed: 4 },
          { type: "sprite_effect", effect: "glow", params: { pulse: true } },
        ],
      },
      {
        when: { hasTag: "invalid" },
        priority: 2,
        behaviors: [
          { type: "scale_oscillate", min: 0.85, max: 1.15, speed: 25 },
          { type: "sprite_effect", effect: "flash", params: { color: [255, 80, 80], intensity: 0.7 } },
        ],
      },
    ],
  };
}


const defaultGame = createBallSortGame();
export default defaultGame;
