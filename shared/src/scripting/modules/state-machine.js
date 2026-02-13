function create(config) {
	var currentState = config.initial;
	var transitions = config.transitions || [];
	var enterCallbacks = {};
	var exitCallbacks = {};

	function findTransition(event) {
		var i, t;
		for (i = 0; i < transitions.length; i++) {
			t = transitions[i];
			if (t.event === event && (t.from === currentState || t.from === "*")) {
				return t;
			}
		}
		return null;
	}

	return {
		send: (event) => {
			var t = findTransition(event);
			var prevState, nextState, exitFns, enterFns, i;
			if (!t) return null;
			prevState = currentState;
			nextState = t.to;
			exitFns = exitCallbacks[prevState];
			if (exitFns) {
				for (i = 0; i < exitFns.length; i++) {
					exitFns[i](prevState, nextState);
				}
			}
			currentState = nextState;
			enterFns = enterCallbacks[nextState];
			if (enterFns) {
				for (i = 0; i < enterFns.length; i++) {
					enterFns[i](nextState, prevState);
				}
			}
			return currentState;
		},
		current: () => currentState,
		canSend: (event) => findTransition(event) !== null,
		is: (state) => currentState === state,
		onEnter: (state, fn) => {
			if (!enterCallbacks[state]) enterCallbacks[state] = [];
			enterCallbacks[state].push(fn);
		},
		onExit: (state, fn) => {
			if (!exitCallbacks[state]) exitCallbacks[state] = [];
			exitCallbacks[state].push(fn);
		},
	};
}

module.exports = { create: create };
