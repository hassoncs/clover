exports.toggleCubeTween = (ctx) => {
	if (ctx.isSequenceRunning("cube_toggle")) return;

	var pos = ctx.getEntityPosition("cube");
	var targetX = pos && pos.x > 0 ? -2 : 2;

	ctx.startSequence("cube_toggle", async (world) => {
		await world.animate(
			"cube",
			{ x: targetX, y: 1 },
			{ duration: 450, easing: "ease-in-out" },
		);
	});
};

exports.onInput = (ctx, event) => {
	if (event.type === "tap") {
		exports.toggleCubeTween(ctx);
	}
};
