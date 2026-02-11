// Ball Sort game script - bundle-format version of the game's QuickJS script exports.
// The full compiled script (with Zod, levels data, layout helpers) is in definition.json.
// This bundle version contains the core game logic exports for compilation testing.

exports.generateLevel = function(ctx) {
  var levelNum = (ctx.getVariable('currentLevel')) || 1;
  var existingTubes = ctx.queryEntities({ tag: 'tube' });
  for (var i = 0; i < existingTubes.length; i++) {
    ctx.destroyEntity(existingTubes[i]);
  }
  var existingBalls = ctx.queryEntities({ tag: 'ball' });
  for (var j = 0; j < existingBalls.length; j++) {
    ctx.destroyEntity(existingBalls[j]);
  }
  ctx.setVariable('activeTubeCount', 0);
  ctx.setVariable('moveCount', 0);
};

exports.nextLevel = function(ctx) {
  var currentLevel = (ctx.getVariable('currentLevel')) || 1;
  ctx.setVariable('currentLevel', currentLevel + 1);
  ctx.setVariable('startTime', Date.now());
  exports.generateLevel(ctx);
};

exports.replayLevel = function(ctx) {
  ctx.setVariable('startTime', Date.now());
  exports.generateLevel(ctx);
};

exports.onStart = function(ctx) {
  ctx.setVariable('startTime', Date.now());
};
