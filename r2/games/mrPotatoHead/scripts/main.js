var INITIAL_POSITIONS = {
	leftEye: { x: -3.5, y: -3.2 },
	rightEye: { x: -2.0, y: -3.2 },
	nose: { x: -0.5, y: -3.2 },
	ears: { x: 1.5, y: -3.2 },
	hat: { x: 3.5, y: -3.2 },
	mouth: { x: -3.0, y: -5.2 },
	mustache: { x: -0.5, y: -5.2 },
	leftArm: { x: 2.0, y: -5.2 },
	rightArm: { x: 4.0, y: -5.2 },
};

exports.resetPieces = (ctx) => {
	if (ctx.isSequenceRunning("reset")) return;

	ctx.startSequence("reset", async (world) => {
		var keys = Object.keys(INITIAL_POSITIONS);
		var animations = [];
		for (var i = 0; i < keys.length; i++) {
			var id = keys[i];
			var target = INITIAL_POSITIONS[id];
			animations.push(
				world.animate(
					id,
					{ x: target.x, y: target.y },
					{ duration: 500, easing: "ease-in-out" },
				),
			);
		}
		await Promise.all(animations);
	});
};

exports.onInput = (ctx, event) => {
	if (event.type === "tap") {
		exports.resetPieces(ctx);
	}
};
