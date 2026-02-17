exports.onCollision = (ctx, collision) => {
	var ballId = null;
	var hitDrain = false;
	var tagsA = ctx.getEntityTags(collision.entityA);
	var tagsB = ctx.getEntityTags(collision.entityB);
	var lives;

	if (tagsA.indexOf("ball") !== -1 && tagsB.indexOf("drain") !== -1) {
		ballId = collision.entityA;
		hitDrain = true;
	} else if (tagsB.indexOf("ball") !== -1 && tagsA.indexOf("drain") !== -1) {
		ballId = collision.entityB;
		hitDrain = true;
	}

	if (hitDrain && ballId) {
		lives = ctx.getVariable("lives") || 0;
		ctx.setVariable("lives", lives - 1);
		ctx.cameraShake(0.3, 0.2);
		ctx.haptic("Medium");
		ctx.destroyByTag("ball");
		ctx.spawnEntity("ball", { x: 0, y: -7 });
	}
};

exports.onUpdate = (ctx, dt) => {
	var paddles = ctx.queryEntities({ tag: "paddle" });
	var i, pos;
	for (i = 0; i < paddles.length; i++) {
		pos = ctx.getEntityPosition(paddles[i]);
		if (pos && pos.y !== -8) {
			ctx.setEntityPosition(paddles[i], { x: pos.x, y: -8 });
		}
	}
};

exports.onInput = (ctx, event) => {
	var paddles, paddleId, tapImpulse;
	if (event.type !== "tap") return;
	if (!event.position) return;

	paddles = ctx.queryEntities({ tag: "paddle" });
	if (paddles.length === 0) return;

	paddleId = paddles[0];
	tapImpulse = ctx.getVariable("tapImpulse") || 25;

	if (event.position.x < 0) {
		ctx.applyImpulse(paddleId, { x: -tapImpulse, y: 0 });
	} else {
		ctx.applyImpulse(paddleId, { x: tapImpulse, y: 0 });
	}
};
