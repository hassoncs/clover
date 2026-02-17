// Ball Sort - Script-first game logic
// LEVELS is defined in levels.js (loaded before this file alphabetically)

var WORLD_WIDTH = 14.4;
var WORLD_HEIGHT = 25.6;
var WORLD_SCALE = WORLD_WIDTH / 12;
var HALF_W = WORLD_WIDTH / 2;
var HALF_H = WORLD_HEIGHT / 2;

var TUBE_WIDTH = 1.4 * WORLD_SCALE;
var TUBE_HEIGHT = 5 * WORLD_SCALE;
var TUBE_WALL_THICKNESS = 0.15 * WORLD_SCALE;
var BALL_RADIUS = 0.5 * WORLD_SCALE;
var BALL_SPACING = 1.1 * WORLD_SCALE;
var MAX_TUBES = 10;
var TUBE_CAPACITY = 4;
var TUBE_Y = WORLD_HEIGHT * 0.625;
var TUBE_PADDING = 0.3 * WORLD_SCALE;
var LIFT_HEIGHT = 2.0;
var ANIM_DURATION = 200;

var gameFlow = "idle";
var heldBallId = null;
var heldBallColor = -1;
var sourceTubeIndex = -1;
var lastPickupElapsed = -1;
var winAtElapsed = 0;
var invalidClearAt = 0;
var tubeStacks = {};
var activeTubeCount = 0;
var containers = require("slopcade/containers");

function cy(y) {
	return HALF_H - y;
}

function computeTubePositions(count) {
	var totalWidth = count * TUBE_WIDTH;
	var totalPadding = 2 * TUBE_PADDING;
	var availableWidth = WORLD_WIDTH - totalPadding;
	var spacing = (availableWidth - totalWidth) / (count + 1);
	var positions = [];
	for (var i = 0; i < count; i++) {
		var x =
			-HALF_W +
			TUBE_PADDING +
			spacing +
			TUBE_WIDTH / 2 +
			i * (TUBE_WIDTH + spacing);
		positions.push({ x: x, y: 0, index: i });
	}
	return positions;
}

function calculateBallPosition(tubeIndex, slot, positions) {
	var tubeX = positions[tubeIndex].x;
	var ballY =
		TUBE_Y +
		TUBE_HEIGHT / 2 -
		TUBE_WALL_THICKNESS -
		BALL_RADIUS -
		slot * BALL_SPACING;
	return { x: tubeX, y: cy(ballY) };
}

function getTubeDimensions(ctx, tubeIndex) {
	var pos = ctx.getEntityPosition("tube-" + tubeIndex);
	if (!pos) return null;
	var tubeHeight = TUBE_HEIGHT;
	var topY = pos.y + tubeHeight / 2;
	var bottomY = pos.y - tubeHeight / 2 + TUBE_WALL_THICKNESS;
	return { x: pos.x, topY: topY, bottomY: bottomY, height: tubeHeight };
}

function calculateBallPositionInTube(ctx, tubeIndex, slot) {
	var dims = getTubeDimensions(ctx, tubeIndex);
	if (!dims) return null;
	var y = dims.bottomY + BALL_RADIUS + slot * BALL_SPACING;
	return { x: dims.x, y: y };
}

function findTubeAtPosition(ctx, worldX, worldY) {
	var tubes = ctx.queryEntities({ tag: "tube" });
	var bestIndex = -1;
	var bestDist = Infinity;
	for (var i = 0; i < tubes.length; i++) {
		var tubeId = tubes[i];
		var match = tubeId.match(/^tube-(\d+)$/);
		if (!match) continue;
		var idx = parseInt(match[1], 10);
		var pos = ctx.getEntityPosition(tubeId);
		if (!pos) continue;
		var dx = worldX - pos.x;
		var dy = worldY - pos.y;
		if (Math.abs(dx) > 1.5 || Math.abs(dy) > 4.0) continue;
		var dist = Math.abs(dx) + Math.abs(dy);
		if (dist < bestDist) {
			bestDist = dist;
			bestIndex = idx;
		}
	}
	return bestIndex;
}

function getTubeIndexFromEntityId(entityId) {
	if (!entityId) return -1;
	var match = entityId.match(/^tube-(\d+)$/);
	if (match) return parseInt(match[1], 10);
	return -1;
}

function getBallColor(ctx, ballId) {
	var tags = ctx.getEntityTags(ballId);
	for (var i = 0; i < tags.length; i++) {
		if (tags[i].indexOf("color-") === 0) {
			return parseInt(tags[i].substring(6), 10);
		}
	}
	return -1;
}

function getTubeIndexFromBallTags(ctx, ballId) {
	var tags = ctx.getEntityTags(ballId);
	for (var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		if (tag.indexOf("in-container-tube-") === 0) {
			return parseInt(tag.substring(18), 10);
		}
	}
	return -1;
}

function pickupBall(ctx, tubeIndex) {
	var stack = tubeStacks[tubeIndex];
	if (!stack || stack.isEmpty()) {
		return;
	}

	var ballId = stack.peek();
	if (!ballId) {
		return;
	}

	var color = getBallColor(ctx, ballId);
	if (color < 0) {
		return;
	}

	stack.pop();
	heldBallId = ballId;
	heldBallColor = color;
	sourceTubeIndex = tubeIndex;
	lastPickupElapsed = ctx.elapsed;
	gameFlow = "holding";

	ctx.addTag(ballId, "held");
	ctx.removeTag(ballId, "in-container-tube-" + tubeIndex);

	var dims = getTubeDimensions(ctx, tubeIndex);
	if (dims) {
		ctx.animateEntity(
			ballId,
			{ y: dims.topY + LIFT_HEIGHT },
			{ duration: ANIM_DURATION, easing: "easeOutQuad" },
		);
	}

	ctx.emit("ball_picked");
	ctx.hapticSelection();
}

function dropBall(ctx, targetTubeIndex) {
	if (ctx.elapsed - lastPickupElapsed < 0.05) return;

	if (
		targetTubeIndex < 0 ||
		sourceTubeIndex < 0 ||
		!heldBallId ||
		heldBallColor < 0
	) {
		cancelPickup(ctx);
		return;
	}

	if (targetTubeIndex === sourceTubeIndex) {
		cancelPickup(ctx);
		return;
	}

	var targetStack = tubeStacks[targetTubeIndex];
	if (!targetStack) {
		cancelPickup(ctx);
		return;
	}

	if (targetStack.isFull()) {
		showInvalidFeedback(ctx, heldBallId);
		return;
	}

	if (!targetStack.isEmpty()) {
		var topBallId = targetStack.peek();
		var topColor = getBallColor(ctx, topBallId);
		if (topColor !== heldBallColor) {
			showInvalidFeedback(ctx, heldBallId);
			return;
		}
	}

	var dropPos = calculateBallPositionInTube(
		ctx,
		targetTubeIndex,
		targetStack.length,
	);
	if (!dropPos) {
		cancelPickup(ctx);
		return;
	}

	targetStack.push(heldBallId);

	ctx.removeTag(heldBallId, "held");
	ctx.addTag(heldBallId, "in-container-tube-" + targetTubeIndex);

	ctx.animateEntity(
		heldBallId,
		{ x: dropPos.x, y: dropPos.y },
		{ duration: ANIM_DURATION, easing: "easeOutQuad" },
	);

	var moveCount = (ctx.getVariable("moveCount") || 0) + 1;
	ctx.setVariable("moveCount", moveCount);

	heldBallId = null;
	heldBallColor = -1;
	sourceTubeIndex = -1;
	gameFlow = "idle";

	ctx.emit("ball_dropped");
	ctx.haptic("Light");

	checkWin(ctx);
}

function cancelPickup(ctx) {
	if (heldBallId && sourceTubeIndex >= 0) {
		var stack = tubeStacks[sourceTubeIndex];
		if (stack) {
			var returnPos = calculateBallPositionInTube(
				ctx,
				sourceTubeIndex,
				stack.length,
			);
			if (returnPos) {
				ctx.animateEntity(
					heldBallId,
					{ x: returnPos.x, y: returnPos.y },
					{ duration: ANIM_DURATION, easing: "easeOutQuad" },
				);
			}
			stack.push(heldBallId);
			ctx.removeTag(heldBallId, "held");
			ctx.addTag(heldBallId, "in-container-tube-" + sourceTubeIndex);
		}
	}

	heldBallId = null;
	heldBallColor = -1;
	sourceTubeIndex = -1;
	gameFlow = "idle";

	ctx.emit("pickup_cancelled");
}

function showInvalidFeedback(ctx, ballId) {
	ctx.addTag(ballId, "invalid");
	invalidClearAt = ctx.elapsed + 0.3;
	ctx.hapticNotification("Error");
}

function checkWin(ctx) {
	if (activeTubeCount === 0) return;

	for (var i = 0; i < activeTubeCount; i++) {
		var stack = tubeStacks[i];
		if (!stack) return;
		if (stack.isEmpty()) continue;
		if (stack.length !== TUBE_CAPACITY) return;

		var items = stack.items;
		var firstColor = getBallColor(ctx, items[0]);
		for (var j = 1; j < items.length; j++) {
			if (getBallColor(ctx, items[j]) !== firstColor) return;
		}
	}

	winAtElapsed = ctx.elapsed + 0.3;
}

function generateLevel(ctx) {
	var levelNum = ctx.getVariable("currentLevel") || 1;
	var levelIndex = Math.min(levelNum, LEVELS.length) - 1;
	var level = LEVELS[levelIndex];
	activeTubeCount = level.tubes.length;

	var existingTubes = ctx.queryEntities({ tag: "tube" });
	for (var t = 0; t < existingTubes.length; t++) {
		ctx.destroyEntity(existingTubes[t]);
	}
	var existingBalls = ctx.queryEntities({ tag: "ball" });
	for (var b = 0; b < existingBalls.length; b++) {
		ctx.destroyEntity(existingBalls[b]);
	}

	tubeStacks = {};
	var positions = computeTubePositions(activeTubeCount);
	var tubeY = cy(TUBE_Y);

	for (var i = 0; i < activeTubeCount; i++) {
		ctx.spawnEntity(
			"tube",
			{ x: positions[i].x, y: tubeY },
			{ entityId: "tube-" + i },
		);
		tubeStacks[i] = containers.createStack(TUBE_CAPACITY);
	}

	ctx.setVariable("activeTubeCount", activeTubeCount);

	for (var tubeIdx = 0; tubeIdx < activeTubeCount; tubeIdx++) {
		var balls = level.tubes[tubeIdx];
		for (var slot = 0; slot < balls.length; slot++) {
			var colorIndex = balls[slot];
			var pos = calculateBallPosition(tubeIdx, slot, positions);
			var spawnedId = ctx.spawnEntity("ball" + colorIndex, pos);
			if (spawnedId) {
				ctx.addTag(spawnedId, "color-" + colorIndex);
				ctx.addTag(spawnedId, "in-container-tube-" + tubeIdx);
				tubeStacks[tubeIdx].push(spawnedId);
			}
		}
	}

	ctx.setVariable("moveCount", 0);
	heldBallId = null;
	heldBallColor = -1;
	sourceTubeIndex = -1;
	gameFlow = "idle";
	winAtElapsed = 0;
}

exports.onStart = (ctx) => {
	ctx.setVariable("startTime", Date.now());
	generateLevel(ctx);
};

exports.onInput = (ctx, event) => {
	if (!event || !event.position) return;

	if (event.type === "tap") {
		var tubeIndex = -1;

		if (event.entityId) {
			tubeIndex = getTubeIndexFromEntityId(event.entityId);
			if (tubeIndex < 0) {
				tubeIndex = getTubeIndexFromBallTags(ctx, event.entityId);
			}
		}

		if (tubeIndex < 0) {
			tubeIndex = findTubeAtPosition(ctx, event.position.x, event.position.y);
		}

		if (tubeIndex < 0) return;

		if (gameFlow === "idle") {
			pickupBall(ctx, tubeIndex);
		} else if (gameFlow === "holding") {
			dropBall(ctx, tubeIndex);
		}
	}
};

exports.onUpdate = (ctx, dt) => {
	if (winAtElapsed > 0 && ctx.elapsed >= winAtElapsed) {
		winAtElapsed = 0;
		ctx.showDialog("levelComplete");
	}

	if (invalidClearAt > 0 && ctx.elapsed >= invalidClearAt) {
		invalidClearAt = 0;
		var invalidBalls = ctx.queryEntities({ tag: "invalid" });
		for (var i = 0; i < invalidBalls.length; i++) {
			ctx.removeTag(invalidBalls[i], "invalid");
		}
	}
};

exports.nextLevel = (ctx) => {
	ctx.dismissDialog();
	var currentLevel = ctx.getVariable("currentLevel") || 1;
	ctx.setVariable("currentLevel", currentLevel + 1);
	ctx.setVariable("startTime", Date.now());
	generateLevel(ctx);
};

exports.replayLevel = (ctx) => {
	ctx.dismissDialog();
	ctx.setVariable("startTime", Date.now());
	generateLevel(ctx);
};
