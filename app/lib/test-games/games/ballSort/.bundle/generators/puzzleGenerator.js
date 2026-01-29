// Ball Sort Puzzle Generator
// Generates guaranteed-solvable puzzles using backwards algorithm

export function generate(ctx) {
  const NUM_COLORS = ctx.getConstant("NUM_COLORS");
  const BALLS_PER_TUBE = ctx.getConstant("BALLS_PER_TUBE");
  const NUM_TUBES = ctx.getConstant("NUM_TUBES");
  const TUBE_WIDTH = ctx.getConstant("TUBE_WIDTH");
  const TUBE_HEIGHT = ctx.getConstant("TUBE_HEIGHT");
  const TUBE_WALL_THICKNESS = ctx.getConstant("TUBE_WALL_THICKNESS");
  const BALL_RADIUS = ctx.getConstant("BALL_RADIUS");
  const BALL_SPACING = ctx.getConstant("BALL_SPACING");
  const TUBE_Y = ctx.getConstant("TUBE_Y");
  const WORLD_WIDTH = ctx.getConstant("WORLD_WIDTH");
  const WORLD_HEIGHT = ctx.getConstant("WORLD_HEIGHT");
  const SEED = ctx.getConstant("SEED") || 12345;
  const DIFFICULTY = ctx.getConstant("DIFFICULTY") || 5;
  
  // Seeded RNG using Mulberry32
  let state = SEED;
  function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  
  function randomInt(min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
  }
  
  // Create solved state
  const tubes = [];
  for (let color = 0; color < NUM_COLORS; color++) {
    const tube = [];
    for (let i = 0; i < BALLS_PER_TUBE; i++) {
      tube.push(color);
    }
    tubes.push(tube);
  }
  for (let i = 0; i < (NUM_TUBES - NUM_COLORS); i++) {
    tubes.push([]);
  }
  
  // Calculate positions
  const cx = (x) => x - WORLD_WIDTH / 2;
  const cy = (y) => WORLD_HEIGHT / 2 - y;
  const totalWidth = NUM_TUBES * TUBE_WIDTH + (NUM_TUBES - 1) * 0.3;
  const startX = (WORLD_WIDTH - totalWidth) / 2 + TUBE_WIDTH / 2;
  const tubePositions = [];
  for (let i = 0; i < NUM_TUBES; i++) {
    tubePositions.push(startX + i * (TUBE_WIDTH + 0.3));
  }
  
  // Scramble by making valid reverse moves
  const capacity = BALLS_PER_TUBE;
  const targetMoves = Math.floor(5 * DIFFICULTY * (1 + random() * 0.3));
  let movesMade = 0;
  let lastMove = null;
  
  function getValidMoves() {
    const moves = [];
    for (let from = 0; from < NUM_TUBES; from++) {
      if (tubes[from].length === 0) continue;
      for (let to = 0; to < NUM_TUBES; to++) {
        if (from === to) continue;
        if (tubes[to].length < capacity) {
          moves.push({ from, to });
        }
      }
    }
    return moves;
  }
  
  while (movesMade < targetMoves) {
    const moves = getValidMoves();
    if (moves.length === 0) break;
    
    let candidateMoves = moves;
    if (lastMove) {
      candidateMoves = moves.filter(m => !(m.from === lastMove.to && m.to === lastMove.from));
      if (candidateMoves.length === 0) candidateMoves = moves;
    }
    
    const move = candidateMoves[randomInt(0, candidateMoves.length - 1)];
    const ball = tubes[move.from].pop();
    tubes[move.to].push(ball);
    lastMove = move;
    movesMade++;
  }
  
  // Generate entities from tube layout
  const entities = [];
  let ballId = 0;
  
  for (let tubeIdx = 0; tubeIdx < NUM_TUBES; tubeIdx++) {
    const tubeX = cx(tubePositions[tubeIdx]);
    const balls = tubes[tubeIdx];
    
    // Tube walls
    entities.push({
      id: `tube-${tubeIdx}-left`,
      name: `Tube ${tubeIdx} Left Wall`,
      template: "tubeWall",
      tags: ["tube-wall"],
      transform: {
        x: tubeX - TUBE_WIDTH / 2 + TUBE_WALL_THICKNESS / 2,
        y: cy(TUBE_Y),
        angle: 0,
        scaleX: 1,
        scaleY: 1
      }
    });
    
    entities.push({
      id: `tube-${tubeIdx}-right`,
      name: `Tube ${tubeIdx} Right Wall`,
      template: "tubeWall",
      tags: ["tube-wall"],
      transform: {
        x: tubeX + TUBE_WIDTH / 2 - TUBE_WALL_THICKNESS / 2,
        y: cy(TUBE_Y),
        angle: 0,
        scaleX: 1,
        scaleY: 1
      }
    });
    
    entities.push({
      id: `tube-${tubeIdx}-bottom`,
      name: `Tube ${tubeIdx} Bottom`,
      template: "tubeBottom",
      tags: ["tube-bottom"],
      transform: {
        x: tubeX,
        y: cy(TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1
      }
    });
    
    entities.push({
      id: `tube-${tubeIdx}-sensor`,
      name: `Tube ${tubeIdx} Sensor`,
      template: "tubeSensor",
      tags: ["tube", `tube-${tubeIdx}`],
      transform: {
        x: tubeX,
        y: cy(TUBE_Y),
        angle: 0,
        scaleX: 1,
        scaleY: 1
      }
    });
    
    // Balls in tube
    for (let slot = 0; slot < balls.length; slot++) {
      const colorIndex = balls[slot];
      const ballY = TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS - BALL_RADIUS - slot * BALL_SPACING;
      
      entities.push({
        id: `ball-${ballId}`,
        name: `Ball ${ballId}`,
        template: `ball${colorIndex}`,
        tags: ["ball", `color-${colorIndex}`, `in-container-tube-${tubeIdx}`],
        transform: {
          x: tubeX,
          y: cy(ballY),
          angle: 0,
          scaleX: 1,
          scaleY: 1
        }
      });
      ballId++;
    }
  }
  
  return entities;
}
