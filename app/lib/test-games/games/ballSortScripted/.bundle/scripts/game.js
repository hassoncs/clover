// Ball Sort Game Logic - 100% Script-Based
// This script handles all game logic through the generic scripting system

// Helper: Get tube index from entity ID
function getTubeIndex(entityId) {
  if (!entityId) return -1;
  var match = entityId.match(/^tube-(\d+)$/);
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
  var tubeHeight = 6;
  var ballRadius = 0.6;
  var ballSpacing = 1.32;
  var bottomPadding = 0.18;

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
    var liftY = tubeData.position.y + 3 + 2;
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
