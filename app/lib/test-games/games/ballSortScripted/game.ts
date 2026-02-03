import type { GameDefinition, GameEntity, StackContainerConfig, EntityTemplate } from "@slopcade/shared";
import { distributeRow } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";
import {
  BallSortProgressSchema,
  type BallSortProgress,
  type PersistenceConfig,
} from "@slopcade/shared";
import { generateVerifiedPuzzle, type PuzzleConfig, type GeneratedPuzzle } from "../ballSort/puzzleGenerator";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort";

export const metadata: TestGameMeta = {
  title: "Ball Sort (Scripted)",
  description: "Sort colored balls into tubes - using the generic scripting system",
};

const BASE_WORLD_WIDTH = 12;
const WORLD_WIDTH = 14.4;
const WORLD_HEIGHT = 25.6;
const WORLD_SCALE = WORLD_WIDTH / BASE_WORLD_WIDTH;

const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const TUBE_WIDTH = 1.4 * WORLD_SCALE;
const TUBE_HEIGHT = 5.0 * WORLD_SCALE;
const TUBE_WALL_THICKNESS = 0.15 * WORLD_SCALE;
const BALL_RADIUS = 0.5 * WORLD_SCALE;
const BALL_SPACING = 1.1 * WORLD_SCALE;
const NUM_TUBES = 6;
const BALLS_PER_TUBE = 4;
const TUBE_Y = WORLD_HEIGHT * 0.625;
const LIFT_HEIGHT = 2.0;
const TUBE_BOTTOM_PADDING = 0.18;

const tubePositions = distributeRow({
  count: NUM_TUBES,
  containerWidth: WORLD_WIDTH,
  itemWidth: TUBE_WIDTH,
  align: "space-evenly",
  padding: 0.3 * WORLD_SCALE,
});

export function getPuzzleConfigForLevel(level: number): PuzzleConfig {
  let numColors: number;
  if (level === 1) {
    numColors = 2;
  } else if (level <= 3) {
    numColors = 3;
  } else {
    numColors = Math.min(8, 4 + Math.floor((level - 4) / 10));
  }

  const extraTubes = level <= 3 ? 1 : 2;
  const difficulty = Math.min(10, 1 + Math.floor((level - 1) / 5));

  return {
    numColors,
    ballsPerColor: BALLS_PER_TUBE,
    extraTubes,
    difficulty,
    seed: level * 1000,
  };
}

function createBallEntitiesFromLayout(tubeLayout: number[][]): GameEntity[] {
  const entities: GameEntity[] = [];
  let ballId = 0;

  for (let tubeIndex = 0; tubeIndex < NUM_TUBES; tubeIndex++) {
    const tubeX = tubePositions[tubeIndex].x;
    const balls = tubeLayout[tubeIndex] ?? [];

    for (let slot = 0; slot < balls.length; slot++) {
      const colorIndex = balls[slot];
      const ballY = TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS - BALL_RADIUS - slot * BALL_SPACING;

      entities.push({
        id: `ball-${ballId}`,
        name: `Ball ${ballId}`,
        template: `ball${colorIndex}`,
        tags: ["ball", `color-${colorIndex}`, `in-container-tube-${tubeIndex}`],
        transform: {
          x: tubeX,
          y: cy(ballY),
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      });
      ballId++;
    }
  }

  return entities;
}

function createTubeContainers(): StackContainerConfig[] {
  return tubePositions.map((pos, index) => ({
    id: `tube-${index}`,
    type: "stack" as const,
    capacity: BALLS_PER_TUBE,
    layout: {
      direction: "vertical" as const,
      spacing: BALL_SPACING,
      basePosition: { x: pos.x, y: cy(TUBE_Y) },
      anchor: "bottom" as const,
    },
  }));
}

function createTubeEntities(): GameEntity[] {
  const entities: GameEntity[] = [];

  for (let i = 0; i < NUM_TUBES; i++) {
    const x = tubePositions[i].x;
    const tubeY = cy(TUBE_Y);

    entities.push({
      id: `tube-${i}`,
      name: `Tube ${i}`,
      template: "tube",
      tags: ["tube", `tube-${i}`],
      transform: {
        x: x,
        y: tubeY,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });
  }

  return entities;
}

export const ballSortPersistence: PersistenceConfig<BallSortProgress> = {
  storageKey: "ball-sort-scripted-progress",
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

const BALL_SORT_SCRIPT = `
// Ball Sort Game Logic - 100% Script-Based
// This script handles all game logic through the generic scripting system

// Helper: Get tube index from entity ID
function getTubeIndex(entityId) {
  if (!entityId) return -1;
  var match = entityId.match(/^tube-(\\d+)$/);
  return match ? parseInt(match[1], 10) : -1;
}

// Helper: Find the top ball in a tube (highest Y position)
function findTopBallInTube(ctx, tubeIndex) {
  var balls = ctx.queryEntitiesWithData({ tag: 'in-container-tube-' + tubeIndex });
  if (balls.length === 0) return null;

  var topBall = balls[0];
  for (var i = 1; i < balls.length; i++) {
    if (balls[i].position.y > topBall.position.y) {
      topBall = balls[i];
    }
  }
  return topBall;
}

// Helper: Get ball color from tags
function getBallColor(ball) {
  for (var i = 0; i < ball.tags.length; i++) {
    if (ball.tags[i].indexOf('color-') === 0) {
      return parseInt(ball.tags[i].substring(6), 10);
    }
  }
  return -1;
}

// Helper: Calculate ball drop position in tube
function calculateDropPosition(ctx, tubeIndex, slot) {
  var tubeData = ctx.getEntityData('tube-' + tubeIndex);
  if (!tubeData) return null;

  var tubeX = tubeData.position.x;
  var tubeY = tubeData.position.y;
  var tubeHeight = ${TUBE_HEIGHT};
  var ballRadius = ${BALL_RADIUS};
  var ballSpacing = ${BALL_SPACING};
  var bottomPadding = ${TUBE_BOTTOM_PADDING};

  var y = tubeY - tubeHeight / 2 + bottomPadding + ballRadius + slot * ballSpacing;
  return { x: tubeX, y: y };
}

// Pickup handler - called when tapping a tube in idle state
exports.onPickup = function(ctx, args) {
  var tapTarget = ctx.getTapTargetId();
  var tubeIndex = getTubeIndex(tapTarget);

  if (tubeIndex < 0) {
    ctx.emit('pickup_cancelled');
    return;
  }

  var count = ctx.getVariable('tube' + tubeIndex + '_count') || 0;
  if (count === 0) {
    ctx.emit('pickup_cancelled');
    return;
  }

  var topBall = findTopBallInTube(ctx, tubeIndex);
  if (!topBall) {
    ctx.emit('pickup_cancelled');
    return;
  }

  var ballColor = getBallColor(topBall);

  // Store pickup state
  ctx.setVariable('heldBallId', topBall.id);
  ctx.setVariable('heldBallColor', ballColor);
  ctx.setVariable('sourceTubeIndex', tubeIndex);

  // Update tube state
  ctx.setVariable('tube' + tubeIndex + '_count', count - 1);

  // Update top color for source tube
  var remainingBalls = ctx.queryEntitiesWithData({ tag: 'in-container-tube-' + tubeIndex });
  remainingBalls = remainingBalls.filter(function(b) { return b.id !== topBall.id; });
  if (remainingBalls.length > 0) {
    var newTop = remainingBalls[0];
    for (var i = 1; i < remainingBalls.length; i++) {
      if (remainingBalls[i].position.y > newTop.position.y) {
        newTop = remainingBalls[i];
      }
    }
    ctx.setVariable('tube' + tubeIndex + '_topColor', getBallColor(newTop));
  } else {
    ctx.setVariable('tube' + tubeIndex + '_topColor', -1);
  }

  // Update tags
  ctx.addTag(topBall.id, 'held');
  ctx.removeTag(topBall.id, 'in-container-tube-' + tubeIndex);

  // Animate ball up above tube
  var tubeData = ctx.getEntityData('tube-' + tubeIndex);
  if (tubeData) {
    var liftY = tubeData.position.y + ${TUBE_HEIGHT / 2} + ${LIFT_HEIGHT};
    ctx.animateEntity(topBall.id, {
      x: tubeData.position.x,
      y: liftY,
      duration: 0.2,
      easing: 'easeOutQuad'
    });
  }

  ctx.emit('ball_picked');
};

// Drop handler - called when tapping a tube in holding state
exports.onDrop = function(ctx, args) {
  var tapTarget = ctx.getTapTargetId();
  var targetTubeIndex = getTubeIndex(tapTarget);
  var sourceTubeIndex = ctx.getVariable('sourceTubeIndex');
  var heldBallId = ctx.getVariable('heldBallId');
  var heldBallColor = ctx.getVariable('heldBallColor');

  if (targetTubeIndex < 0 || sourceTubeIndex < 0 || !heldBallId) {
    ctx.emit('pickup_cancelled');
    return;
  }

  // Same tube = cancel
  if (targetTubeIndex === sourceTubeIndex) {
    cancelPickup(ctx);
    return;
  }

  var targetCount = ctx.getVariable('tube' + targetTubeIndex + '_count') || 0;
  var targetTopColor = ctx.getVariable('tube' + targetTubeIndex + '_topColor');

  // Check if tube is full
  if (targetCount >= 4) {
    showInvalidFeedback(ctx, heldBallId);
    return;
  }

  // Check color match (or empty tube)
  if (targetCount > 0 && targetTopColor !== heldBallColor) {
    showInvalidFeedback(ctx, heldBallId);
    return;
  }

  // Valid drop - animate ball to position
  var dropPos = calculateDropPosition(ctx, targetTubeIndex, targetCount);
  if (!dropPos) {
    cancelPickup(ctx);
    return;
  }

  ctx.animateEntity(heldBallId, {
    x: dropPos.x,
    y: dropPos.y,
    duration: 0.2,
    easing: 'easeOutQuad'
  });

  // Update tags
  ctx.removeTag(heldBallId, 'held');
  ctx.addTag(heldBallId, 'in-container-tube-' + targetTubeIndex);

  // Update tube state
  ctx.setVariable('tube' + targetTubeIndex + '_count', targetCount + 1);
  ctx.setVariable('tube' + targetTubeIndex + '_topColor', heldBallColor);

  // Clear held state
  ctx.setVariable('heldBallId', '');
  ctx.setVariable('sourceTubeIndex', -1);
  ctx.setVariable('heldBallColor', -1);

  // Increment move count
  var moveCount = ctx.getVariable('moveCount') || 0;
  ctx.setVariable('moveCount', moveCount + 1);

  ctx.emit('ball_dropped');
};

// Check win - called after each drop
exports.checkWin = function(ctx, args) {
  // Check each tube: must be empty or have 4 balls of same color
  for (var i = 0; i < 6; i++) {
    var count = ctx.getVariable('tube' + i + '_count') || 0;

    // Empty tubes are OK
    if (count === 0) continue;

    // Must be full (4 balls)
    if (count !== 4) return;

    // Check all balls are same color
    var balls = ctx.queryEntitiesWithData({ tag: 'in-container-tube-' + i });
    if (balls.length === 0) return;

    var firstColor = getBallColor(balls[0]);
    for (var j = 1; j < balls.length; j++) {
      if (getBallColor(balls[j]) !== firstColor) return;
    }
  }

  // All tubes pass the check - schedule win after animation
  ctx.setVariable('_winAtElapsed', ctx.elapsed + 0.3);
};

// Helper: Cancel pickup and return ball to source
function cancelPickup(ctx) {
  var heldBallId = ctx.getVariable('heldBallId');
  var sourceTubeIndex = ctx.getVariable('sourceTubeIndex');
  var heldBallColor = ctx.getVariable('heldBallColor');

  if (heldBallId && sourceTubeIndex >= 0) {
    var count = ctx.getVariable('tube' + sourceTubeIndex + '_count') || 0;

    // Calculate return position
    var returnPos = calculateDropPosition(ctx, sourceTubeIndex, count);
    if (returnPos) {
      ctx.animateEntity(heldBallId, {
        x: returnPos.x,
        y: returnPos.y,
        duration: 0.2,
        easing: 'easeOutQuad'
      });
    }

    // Restore tags
    ctx.removeTag(heldBallId, 'held');
    ctx.addTag(heldBallId, 'in-container-tube-' + sourceTubeIndex);

    // Restore tube state
    ctx.setVariable('tube' + sourceTubeIndex + '_count', count + 1);
    ctx.setVariable('tube' + sourceTubeIndex + '_topColor', heldBallColor);
  }

  // Clear held state
  ctx.setVariable('heldBallId', '');
  ctx.setVariable('sourceTubeIndex', -1);
  ctx.setVariable('heldBallColor', -1);

  ctx.emit('pickup_cancelled');
}

// Helper: Show invalid move feedback
function showInvalidFeedback(ctx, ballId) {
  ctx.addTag(ballId, 'invalid');
  // The 'invalid' tag will be removed by a frame rule after 300ms
}
`;

function createBallTemplate(colorIndex: number) {
  const ballDiameter = BALL_RADIUS * 2;

  return {
    id: `ball${colorIndex}`,
    tags: ["ball", `color-${colorIndex}`],
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

export function createBallSortScriptedGame(level: number = 1): GameDefinition {
  const puzzleConfig = getPuzzleConfigForLevel(level);
  const generatedPuzzle = generateVerifiedPuzzle(puzzleConfig);
  const tubeLayout = generatedPuzzle.tubes;

  const tubeContainers = createTubeContainers();
  const tubeEntities = createTubeEntities();
  const ballEntities = createBallEntitiesFromLayout(tubeLayout);

  const game: GameDefinition = {
    metadata: {
      id: "test-ball-sort-scripted",
      title: "Ball Sort (Scripted)",
      description: "Sort colored balls into tubes - using the generic scripting system",
      instructions: "Tap a tube to pick up the top ball, then tap another tube to drop it. You can only drop on the same color or an empty tube.",
      version: "1.0.0",
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
    script: BALL_SORT_SCRIPT,
    variables: {
      currentLevel: level,
      heldBallColor: -1,
      sourceTubeIndex: -1,
      heldBallId: "",
      moveCount: 0,
      startTime: 0,
      _winAtElapsed: 0,
      _invalidFeedbackStart: 0,
      ...Object.fromEntries(
        Array.from({ length: NUM_TUBES }, (_, i) => [
          `tube${i}_count`,
          tubeLayout[i]?.length ?? 0,
        ])
      ),
      ...Object.fromEntries(
        Array.from({ length: NUM_TUBES }, (_, i) => [
          `tube${i}_topColor`,
          tubeLayout[i]?.length > 0 ? tubeLayout[i][tubeLayout[i].length - 1] : -1,
        ])
      ),
    },
    containers: tubeContainers,
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
      tube: {
        id: "tube",
        tags: ["tube"],
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
      ...tubeEntities,
      ...ballEntities,
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
        id: "init_start_time",
        name: "Initialize start time",
        trigger: { type: "gameStart" },
        actions: [{ type: "set_variable", name: "startTime", operation: "set", value: { expr: "now()" } }],
      },
      {
        id: "tap_tube_idle",
        name: "Pick up ball from tube when in idle state",
        trigger: { type: "tap", target: "tube" },
        conditions: [{ type: "expression", expr: "stateIs('gameFlow', 'idle')" }],
        actions: [{ type: "run_script", script: BALL_SORT_SCRIPT, export: "onPickup" }],
      },
      {
        id: "tap_tube_holding",
        name: "Drop ball into tube when holding",
        trigger: { type: "tap", target: "tube" },
        conditions: [{ type: "expression", expr: "stateIs('gameFlow', 'holding')" }],
        actions: [{ type: "run_script", script: BALL_SORT_SCRIPT, export: "onDrop" }],
      },
      {
        id: "check_win",
        name: "Check win condition after each move",
        trigger: { type: "event", eventName: "ball_dropped" },
        actions: [{ type: "run_script", script: BALL_SORT_SCRIPT, export: "checkWin" }],
      },
      {
        id: "handle_delayed_win",
        name: "Trigger win after animation delay",
        trigger: { type: "frame" },
        conditions: [
          { type: "expression", expr: "_winAtElapsed > 0 && elapsed() >= _winAtElapsed" },
        ],
        actions: [
          { type: "set_variable", name: "_winAtElapsed", operation: "set", value: 0 },
          { type: "game_state", state: "win" },
        ],
      },
      {
        id: "clear_invalid_feedback",
        name: "Clear invalid feedback after delay",
        trigger: { type: "frame" },
        conditions: [
          { type: "expression", expr: "_invalidFeedbackStart > 0 && elapsed() >= _invalidFeedbackStart + 0.3" },
        ],
        actions: [
          { type: "set_variable", name: "_invalidFeedbackStart", operation: "set", value: 0 },
        ],
      },
    ],
    persistence: ballSortPersistence,
    hoverHighlight: {
      targetTag: "tube",
      highlightEntityId: "tube-hover-highlight",
    },
  };

  return game;
}

const defaultGame = createBallSortScriptedGame(1);
export default defaultGame;
