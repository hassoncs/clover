var CANNON_Y = 7;
var LAUNCH_FORCE = 15;
var PROXIMITY_THRESHOLD = 1.2;
var lastOrangePegSlowmo = false;

function hasBall(ctx) {
	return ctx.queryEntities({ tag: "ball" }).length > 0;
}

function hasTag(tags, tag) {
	var i;
	for (i = 0; i < tags.length; i++) {
		if (tags[i] === tag) return true;
	}
	return false;
}

function fireBall(ctx, pos) {
	var dx = pos.x;
	var dy = pos.y - CANNON_Y;
	var len = Math.sqrt(dx * dx + dy * dy);
	var nx, ny, ball;
	if (len > 0.01) {
		nx = dx / len;
		ny = dy / len;
		ball = ctx.spawnEntity("ball", { x: 0, y: CANNON_Y });
		if (ball) {
			ctx.applyImpulse(ball, { x: nx * LAUNCH_FORCE, y: ny * LAUNCH_FORCE });
		}
		ctx.setVariable("turn", (ctx.getVariable("turn") || 0) + 1);
	}
}

function handleTurnEnd(ctx) {
	ctx.emit("turn_end");
	ctx.setVariable("multiplier", 1);
}

exports.onInput = (ctx, event) => {
	if (event.type === "dragStart") {
		if (!hasBall(ctx)) {
			ctx.spawnEntity("trajectoryLine", { x: 0, y: CANNON_Y });
		}
	} else if (event.type === "dragEnd") {
		ctx.destroyByTag("trajectory-line");
		if (!hasBall(ctx) && event.position) {
			fireBall(ctx, event.position);
		}
	} else if (event.type === "tap") {
		if (!hasBall(ctx) && event.position) {
			fireBall(ctx, event.position);
		}
	}
};

exports.onCollisionEnter = (ctx, event) => {
	var tagsA = event.tagsA;
	var tagsB = event.tagsB;
	var ballIsA = hasTag(tagsA, "ball");
	var ballIsB = hasTag(tagsB, "ball");
	var otherTags, orangePegs;

	if (!ballIsA && !ballIsB) return;

	otherTags = ballIsA ? tagsB : tagsA;

	if (hasTag(otherTags, "drain")) {
		handleTurnEnd(ctx);
		ctx.setVariable("lives", (ctx.getVariable("lives") || 0) - 1);
		ctx.destroyByTag("ball");
		return;
	}

	if (hasTag(otherTags, "bucket")) {
		handleTurnEnd(ctx);
		ctx.setVariable("score", (ctx.getVariable("score") || 0) + 500);
		ctx.setVariable("lives", (ctx.getVariable("lives") || 0) + 1);
		ctx.destroyByTag("ball");
		ctx.cameraShake(0.15, 0.2);
		return;
	}

	if (hasTag(otherTags, "peg")) {
		ctx.setVariable("multiplier", (ctx.getVariable("multiplier") || 1) + 1);
	}

	if (hasTag(otherTags, "blue-peg")) {
		ctx.cameraShake(0.03, 0.1);
	}

	if (hasTag(otherTags, "orange-peg")) {
		ctx.cameraShake(0.08, 0.15);

		if (!lastOrangePegSlowmo) {
			orangePegs = ctx.queryEntities({ tag: "orange-peg" });
			if (orangePegs.length <= 1) {
				lastOrangePegSlowmo = true;
				ctx.setTimeScale(0.25, 2.5);
				ctx.cameraShake(0.12, 0.3);
			}
		}
	}
};

exports.onUpdate = (ctx) => {
	var balls = ctx.queryEntities({ tag: "ball" });
	var ballPos, orangePegs, minDist, i, pegPos, dx, dy, dist;

	if (balls.length === 0) return;

	ballPos = ctx.getEntityPosition(balls[0]);
	if (!ballPos) return;

	orangePegs = ctx.queryEntities({ tag: "orange-peg" });
	if (orangePegs.length === 0) return;

	minDist = Infinity;
	for (i = 0; i < orangePegs.length; i++) {
		pegPos = ctx.getEntityPosition(orangePegs[i]);
		if (!pegPos) continue;
		dx = ballPos.x - pegPos.x;
		dy = ballPos.y - pegPos.y;
		dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < minDist) minDist = dist;
	}

	if (minDist < PROXIMITY_THRESHOLD) {
		ctx.setTimeScale(0.5);
		ctx.cameraZoom(1.4, 0.15);
	} else {
		ctx.setTimeScale(1);
		ctx.cameraZoom(1, 0.2);
	}
};
