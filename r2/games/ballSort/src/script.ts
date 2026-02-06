import type { ScriptContext } from '@slopcade/shared/scripting/authoring';
import { LEVELS } from './levels';
import { calculateBallPosition, computeTubePositions, MAX_TUBES, cy, TUBE_Y } from './layout';

exports.generateLevel = function(ctx: ScriptContext) {
  const levelNum = (ctx.getVariable('currentLevel') as number) || 1;
  const levelIndex = Math.min(levelNum, LEVELS.length) - 1;
  const level = LEVELS[levelIndex];
  const activeTubeCount = level.tubes.length;

  console.log(`[BallSort] Loading level ${levelNum} (index ${levelIndex}, ${activeTubeCount} tubes)`);

  // --- Nuke everything from previous level ---
  const existingTubes = ctx.queryEntities({ tag: 'tube' });
  for (const tubeId of existingTubes) {
    ctx.destroyEntity(tubeId);
  }
  const existingBalls = ctx.queryEntities({ tag: 'ball' });
  for (const ballId of existingBalls) {
    ctx.destroyEntity(ballId);
  }

  // --- Spawn fresh tubes at computed positions ---
  const positions = computeTubePositions(activeTubeCount);
  const tubeY = cy(TUBE_Y);

  for (let i = 0; i < activeTubeCount; i++) {
    ctx.spawnEntity('tube', { x: positions[i].x, y: tubeY }, {
      entityId: `tube-${i}`,
    });
  }

  ctx.setVariable('activeTubeCount', activeTubeCount);

  // --- Spawn balls into tubes ---
  let ballIndex = 0;
  for (let tubeIdx = 0; tubeIdx < activeTubeCount; tubeIdx++) {
    const balls = level.tubes[tubeIdx];
    for (let slot = 0; slot < balls.length; slot++) {
      const colorIndex = balls[slot];
      const pos = calculateBallPosition(tubeIdx, slot, positions);

      const spawnedId = ctx.spawnEntity(`ball${colorIndex}`, pos);
      if (spawnedId) {
        ctx.addTag(spawnedId, `color-${colorIndex}`);
        ctx.addTag(spawnedId, `in-container-tube-${tubeIdx}`);
      }
      ballIndex++;
    }
  }

  // --- Set tube tracking variables ---
  for (let i = 0; i < MAX_TUBES; i++) {
    const tubeCount = level.tubes[i]?.length ?? 0;
    ctx.setVariable(`tube${i}_count`, tubeCount);

    const topColor = tubeCount > 0 ? level.tubes[i][tubeCount - 1] : -1;
    ctx.setVariable(`tube${i}_topColor`, topColor);
  }

  ctx.setVariable('moveCount', 0);
  console.log(`[BallSort] Level ${levelNum} loaded with ${ballIndex} balls, ${activeTubeCount} tubes (min moves: ${level.minMoves})`);
};

exports.nextLevel = function(ctx: ScriptContext) {
  const currentLevel = (ctx.getVariable('currentLevel') as number) || 1;
  ctx.setVariable('currentLevel', currentLevel + 1);
  ctx.setVariable('startTime', Date.now());
  exports.generateLevel(ctx);
};

exports.replayLevel = function(ctx: ScriptContext) {
  ctx.setVariable('startTime', Date.now());
  exports.generateLevel(ctx);
};

exports.onStart = function(ctx: ScriptContext) {
  ctx.setVariable('startTime', Date.now());
};
