import type { GameDefinition, GameEntity } from "@slopcade/shared";

export const metadata = {
  title: "Snake",
  description: "Classic snake game. Eat food, grow longer, don't hit the walls!",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const GRID_SIZE = 0.6;
const GRID_COLS = 18;
const GRID_ROWS = 24;
const MOVE_DELAY = 0.15;

function generateWalls(): GameEntity[] {
  const walls: GameEntity[] = [];
  const leftX = cx(0.5);
  const rightX = cx(WORLD_WIDTH - 0.5);
  const topY = cy(0.5);
  const bottomY = cy(WORLD_HEIGHT - 0.5);
  
  for (let row = 0; row < GRID_ROWS; row++) {
    const y = cy(row * GRID_SIZE + 1);
    walls.push(
      {
        id: `wall-left-${row}`,
        name: `Wall Left ${row}`,
        template: "wall",
        transform: { x: leftX, y, angle: 0, scaleX: 1, scaleY: 1 },
      },
      {
        id: `wall-right-${row}`,
        name: `Wall Right ${row}`,
        template: "wall",
        transform: { x: rightX, y, angle: 0, scaleX: 1, scaleY: 1 },
      }
    );
  }

  for (let col = 0; col < GRID_COLS; col++) {
    const x = cx(col * GRID_SIZE + 1);
    walls.push(
      {
        id: `wall-top-${col}`,
        name: `Wall Top ${col}`,
        template: "wall",
        transform: { x, y: topY, angle: 0, scaleX: 1, scaleY: 1 },
      },
      {
        id: `wall-bottom-${col}`,
        name: `Wall Bottom ${col}`,
        template: "wall",
        transform: { x, y: bottomY, angle: 0, scaleX: 1, scaleY: 1 },
      }
    );
  }
  
  return walls;
}

const game: GameDefinition = {
  metadata: {
    id: "test-snake",
    title: "Snake",
    description: "Classic snake game. Eat food, grow longer, don't hit the walls!",
    instructions: "Swipe up/down/left/right to control the snake. Eat red food to grow!",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    color: "#1a1a2e",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#1a1a2e",
    variableDisplays: [
      { name: 'score', label: 'Score', position: 'top-center' },
    ],
  },
  loseCondition: {
    type: "custom",
    expr: "gameOver == 1",
  },
  variables: {
    score: 0,
    gameOver: 0,
    snakeX: 9,
    snakeY: 12,
    direction: 1,
    nextDirection: 1,
    moveTimer: 0,
    foodX: 15,
    foodY: 12,
  },
  templates: {
    snakeHead: {
      id: "snakeHead",
      tags: ["snake", "player"],
      visual: {
        type: "rect",
        width: GRID_SIZE * 0.9,
        height: GRID_SIZE * 0.9,
        color: "#4ade80",
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "box",
        width: GRID_SIZE * 0.9,
        height: GRID_SIZE * 0.9,
        isSensor: true,
      },
    },
    snakeBody: {
      id: "snakeBody",
      tags: ["snake", "body"],
      visual: {
        type: "rect",
        width: GRID_SIZE * 0.85,
        height: GRID_SIZE * 0.85,
        color: "#22c55e",
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "box",
        width: GRID_SIZE * 0.85,
        height: GRID_SIZE * 0.85,
        isSensor: true,
      },
    },
    food: {
      id: "food",
      tags: ["food"],
      visual: {
        type: "circle",
        radius: GRID_SIZE * 0.35,
        color: "#ef4444",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: GRID_SIZE * 0.35,
        isSensor: true,
      },
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      visual: {
        type: "rect",
        width: GRID_SIZE,
        height: GRID_SIZE,
        color: "#374151",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: GRID_SIZE,
        height: GRID_SIZE,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "snake-head",
      name: "Snake Head",
      template: "snakeHead",
      transform: { x: cx(9 * GRID_SIZE + 1), y: cy(12 * GRID_SIZE + 1), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "food",
      name: "Food",
      template: "food",
      transform: { x: cx(15 * GRID_SIZE + 1), y: cy(12 * GRID_SIZE + 1), angle: 0, scaleX: 1, scaleY: 1 },
    },
    ...generateWalls(),
  ],
  rules: [
    {
      id: "swipe_up",
      name: "Swipe up",
      trigger: { type: "swipe", direction: "up" },
      conditions: [{ type: "expression", expr: "direction != 2" }],
      actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 0 }],
    },
    {
      id: "swipe_right",
      name: "Swipe right",
      trigger: { type: "swipe", direction: "right" },
      conditions: [{ type: "expression", expr: "direction != 3" }],
      actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 1 }],
    },
    {
      id: "swipe_down",
      name: "Swipe down",
      trigger: { type: "swipe", direction: "down" },
      conditions: [{ type: "expression", expr: "direction != 0" }],
      actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 2 }],
    },
    {
      id: "swipe_left",
      name: "Swipe left",
      trigger: { type: "swipe", direction: "left" },
      conditions: [{ type: "expression", expr: "direction != 1" }],
      actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 3 }],
    },
    {
      id: "eat_food",
      name: "Eat food",
      trigger: {
        type: "collision",
        entityATag: "snake",
        entityBTag: "food",
      },
      actions: [
        { type: "set_variable", name: "score", operation: "add", value: 10 },
        { type: "destroy", target: { type: "by_tag", tag: "food" } },
        {
          type: "spawn",
          template: "food",
          position: { type: "random", bounds: { minX: cx(2), maxX: cx(16), minY: cy(2), maxY: cy(22) } },
        },
      ],
    },
    {
      id: "hit_wall",
      name: "Hit wall - game over",
      trigger: {
        type: "collision",
        entityATag: "snake",
        entityBTag: "wall",
      },
      actions: [{ type: "set_variable", name: "gameOver", operation: "set", value: 1 }],
    },
  ],
  script: `
const GRID_SIZE = 0.6;
const MOVE_DELAY = 0.15;
const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x) => x - HALF_W;
const cy = (y) => HALF_H - y;

let snake = [{ x: 9, y: 12 }];
let moveAccumulator = 0;

exports.onStart = function(ctx) {
  snake = [{ x: 9, y: 12 }];
  moveAccumulator = 0;
  ctx.setVariable('score', 0);
  ctx.setVariable('gameOver', 0);
  ctx.setVariable('direction', 1);
  ctx.setVariable('nextDirection', 1);
};

exports.onUpdate = function(ctx, dt) {
  if (ctx.getVariable('gameOver') === 1) return;
  
  moveAccumulator += dt;
  if (moveAccumulator < MOVE_DELAY) return;
  moveAccumulator = 0;
  
  const nextDir = ctx.getVariable('nextDirection');
  ctx.setVariable('direction', nextDir);
  
  const head = snake[0];
  let newX = head.x;
  let newY = head.y;
  
  if (nextDir === 0) newY -= 1;
  else if (nextDir === 1) newX += 1;
  else if (nextDir === 2) newY += 1;
  else if (nextDir === 3) newX -= 1;
  
  if (newX < 1 || newX >= 17 || newY < 1 || newY >= 23) {
    ctx.setVariable('gameOver', 1);
    return;
  }
  
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === newX && snake[i].y === newY) {
      ctx.setVariable('gameOver', 1);
      return;
    }
  }
  
  snake.unshift({ x: newX, y: newY });
  
  const foodX = ctx.getVariable('foodX');
  const foodY = ctx.getVariable('foodY');
  if (newX === foodX && newY === foodY) {
    ctx.setVariable('score', (ctx.getVariable('score') || 0) + 10);
    ctx.setVariable('foodX', Math.floor(Math.random() * 16) + 1);
    ctx.setVariable('foodY', Math.floor(Math.random() * 22) + 1);
  } else {
    snake.pop();
  }
  
  const headEntity = ctx.queryEntities({ tag: 'snake' })[0];
  if (headEntity) {
    ctx.setEntityPosition(headEntity, { x: cx(newX * GRID_SIZE + 1), y: cy(newY * GRID_SIZE + 1) });
  }
};
`,
};

export default game;
