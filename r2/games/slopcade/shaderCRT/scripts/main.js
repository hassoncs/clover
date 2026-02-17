exports.onInput = (ctx, event) => {
	var balls, vel;

	if (event.type === "tap") {
		balls = ctx.queryEntities({ tag: "ball" });
		if (balls.length > 0) {
			vel = ctx.getEntityVelocity(balls[0]);
			if (vel) {
				ctx.setEntityVelocity(balls[0], { x: vel.x, y: 8 });
			}
		}
	}
};
