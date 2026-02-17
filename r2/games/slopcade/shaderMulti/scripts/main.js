exports.onInput = (ctx, event) => {
	var rand, prefab;

	if (event.type === "tap") {
		rand = Math.random();

		if (rand < 0.33) {
			prefab = "glowOrb";
		} else if (rand < 0.66) {
			prefab = "dissolveBlock";
		} else {
			prefab = "holoTriangle";
		}

		ctx.spawnEntity(prefab, event.position);
	}
};
