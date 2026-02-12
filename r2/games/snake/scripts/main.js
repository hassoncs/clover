
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
