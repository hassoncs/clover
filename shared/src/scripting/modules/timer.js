function createCooldown(duration) {
	var elapsed = duration;

	return {
		update: (dt) => {
			elapsed = elapsed + dt;
		},
		ready: () => elapsed >= duration,
		reset: () => {
			elapsed = 0;
		},
		get elapsed() {
			return elapsed;
		},
	};
}

function createRepeating(interval) {
	var elapsed = 0;
	var didFire = false;
	var fireCount = 0;

	return {
		update: (dt) => {
			elapsed = elapsed + dt;
			if (elapsed >= interval) {
				didFire = true;
				fireCount = fireCount + 1;
				elapsed = elapsed - interval;
			} else {
				didFire = false;
			}
		},
		fired: () => didFire,
		reset: () => {
			elapsed = 0;
			didFire = false;
		},
		get count() {
			return fireCount;
		},
	};
}

function createDelay(duration) {
	var elapsed = 0;
	var done = false;

	return {
		update: (dt) => {
			if (done) return;
			elapsed = elapsed + dt;
			if (elapsed >= duration) {
				done = true;
			}
		},
		elapsed: () => done,
		reset: () => {
			elapsed = 0;
			done = false;
		},
		progress: () => {
			if (duration <= 0) return 1;
			var p = elapsed / duration;
			return p > 1 ? 1 : p;
		},
	};
}

module.exports = {
	createCooldown: createCooldown,
	createRepeating: createRepeating,
	createDelay: createDelay,
};
