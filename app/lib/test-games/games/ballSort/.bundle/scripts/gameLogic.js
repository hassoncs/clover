// Ball Sort Runtime Scripts
// Handles pickup, drop, and win checking logic

export function onPickup(ctx) {
  const tubeSensor = ctx.getTappedEntity();
  if (!tubeSensor) return;
  
  const tubeIndex = ctx.getEntityVariable(tubeSensor, 'tubeIndex');
  if (tubeIndex === undefined) return;
  
  const balls = ctx.queryEntities({ 
    tag: 'ball',
    hasVariable: { name: 'inTube', value: tubeIndex }
  });
  
  if (balls.length === 0) {
    ctx.emit('pickup_cancelled');
    return;
  }
  
  const topBall = balls[balls.length - 1];
  const ballColor = ctx.getEntityVariable(topBall, 'color');
  
  ctx.setVariable('heldBallColor', ballColor);
  ctx.setVariable('sourceTubeIndex', tubeIndex);
  ctx.setVariable('heldBallId', topBall);
  
  ctx.addTag(topBall, 'held');
  ctx.emit('ball_picked');
}

export function onDrop(ctx) {
  const tubeSensor = ctx.getTappedEntity();
  if (!tubeSensor) return;
  
  const destTubeIndex = ctx.getEntityVariable(tubeSensor, 'tubeIndex');
  const sourceTubeIndex = ctx.getVariable('sourceTubeIndex');
  const heldBallId = ctx.getVariable('heldBallId');
  const heldBallColor = ctx.getVariable('heldBallColor');
  
  if (destTubeIndex === sourceTubeIndex) {
    ctx.emit('pickup_cancelled');
    return;
  }
  
  const destBalls = ctx.queryEntities({
    tag: 'ball',
    hasVariable: { name: 'inTube', value: destTubeIndex }
  });
  
  const capacity = ctx.getConstant('BALLS_PER_TUBE');
  if (destBalls.length >= capacity) {
    ctx.addTag(heldBallId, 'invalid');
    ctx.emit('pickup_cancelled');
    return;
  }
  
  if (destBalls.length > 0) {
    const destTopBall = destBalls[destBalls.length - 1];
    const destTopColor = ctx.getEntityVariable(destTopBall, 'color');
    
    if (destTopColor !== heldBallColor) {
      ctx.addTag(heldBallId, 'invalid');
      ctx.emit('pickup_cancelled');
      return;
    }
  }
  
  ctx.removeTag(heldBallId, 'held');
  ctx.setEntityVariable(heldBallId, 'inTube', destTubeIndex);
  ctx.setVariable('heldBallColor', -1);
  ctx.setVariable('heldBallId', '');
  ctx.setVariable('moveCount', ctx.getVariable('moveCount') + 1);
  
  ctx.emit('ball_dropped');
}

export function checkWin(ctx) {
  const NUM_TUBES = ctx.getConstant('NUM_TUBES');
  const BALLS_PER_TUBE = ctx.getConstant('BALLS_PER_TUBE');
  
  for (let tubeIdx = 0; tubeIdx < NUM_TUBES; tubeIdx++) {
    const balls = ctx.queryEntities({
      tag: 'ball',
      hasVariable: { name: 'inTube', value: tubeIdx }
    });
    
    if (balls.length === 0) continue;
    if (balls.length !== BALLS_PER_TUBE) return;
    
    const firstColor = ctx.getEntityVariable(balls[0], 'color');
    const allSame = balls.every(ball => 
      ctx.getEntityVariable(ball, 'color') === firstColor
    );
    
    if (!allSame) return;
  }
  
  ctx.win();
}
