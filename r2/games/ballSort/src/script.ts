import type { ScriptContext } from '@slopcade/shared/scripting/authoring';
import { LEVELS } from './levels';
import { calculateBallPosition, NUM_TUBES } from './layout';

exports.generateLevel = function(ctx: ScriptContext) {
  const levelNum = (ctx.getVariable('currentLevel') as number) || 1;
  const levelIndex = Math.min(levelNum, LEVELS.length) - 1;
  const level = LEVELS[levelIndex];
  
  console.log(`[BallSort] Loading level ${levelNum} (index ${levelIndex})`);

  const existingBalls = ctx.queryEntities({ tag: 'ball' });
  for (const ballId of existingBalls) {
    ctx.destroyEntity(ballId);
  }

  let ballIndex = 0;
  for (let tubeIdx = 0; tubeIdx < level.tubes.length; tubeIdx++) {
    const balls = level.tubes[tubeIdx];
    for (let slot = 0; slot < balls.length; slot++) {
      const colorIndex = balls[slot];
      const pos = calculateBallPosition(tubeIdx, slot);
      
      const spawnedId = ctx.spawnEntity(`ball${colorIndex}`, pos);
      if (spawnedId) {
        ctx.addTag(spawnedId, `color-${colorIndex}`);
        ctx.addTag(spawnedId, `in-container-tube-${tubeIdx}`);
      }
      ballIndex++;
    }
  }

  for (let i = 0; i < NUM_TUBES; i++) {
    const tubeCount = level.tubes[i]?.length ?? 0;
    ctx.setVariable(`tube${i}_count`, tubeCount);
    
    const topColor = tubeCount > 0 ? level.tubes[i][tubeCount - 1] : -1;
    ctx.setVariable(`tube${i}_topColor`, topColor);
  }

  ctx.setVariable('moveCount', 0);
  console.log(`[BallSort] Level ${levelNum} loaded with ${ballIndex} balls (min moves: ${level.minMoves})`);
};

exports.onStart = function(ctx: ScriptContext) {
  ctx.setVariable('startTime', Date.now());
};
