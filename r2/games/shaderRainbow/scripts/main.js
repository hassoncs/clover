exports.onInput = (ctx, event) => {
	if (event.type === "tap") {
		ctx.spawnEntity("rainbowCube", event.position);
	}
};
