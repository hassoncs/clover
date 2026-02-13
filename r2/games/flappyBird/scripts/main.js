var PIPE_SPAWN_INTERVAL = 2.5;
var FLAP_VELOCITY_Y = 7;
var PIPE_SPAWN_X = 8;
var PIPE_SPAWN_Y = 0;
var pipeSpawnTimer = 0;

exports.onInput = (ctx, event) => {
	var birds, vel;
	if (event.type === "tap") {
		birds = ctx.queryEntities({ tag: "bird" });
		if (birds.length > 0) {
			vel = ctx.getEntityVelocity(birds[0]);
			ctx.setEntityVelocity(birds[0], {
				x: vel ? vel.x : 0,
				y: FLAP_VELOCITY_Y,
			});
		}
	}
};

exports.onUpdate = (ctx, dt) => {
	pipeSpawnTimer += dt;
	if (pipeSpawnTimer >= PIPE_SPAWN_INTERVAL) {
		pipeSpawnTimer -= PIPE_SPAWN_INTERVAL;
		ctx.spawnEntity("pipeGroup", { x: PIPE_SPAWN_X, y: PIPE_SPAWN_Y });
	}
};
