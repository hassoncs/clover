function createStack(capacity) {
	var items = [];
	var maxCapacity = capacity !== undefined ? capacity : Infinity;

	return {
		push: (item) => {
			if (items.length >= maxCapacity) return false;
			items.push(item);
			return true;
		},
		pop: () => items.pop(),
		peek: () => items[items.length - 1],
		isFull: () => items.length >= maxCapacity,
		isEmpty: () => items.length === 0,
		get items() {
			return items.slice();
		},
		get length() {
			return items.length;
		},
	};
}

function transfer(from, to) {
	var item = from.pop();
	if (item === undefined) return false;
	if (!to.push(item)) {
		from.push(item);
		return false;
	}
	return true;
}

module.exports = { createStack: createStack, transfer: transfer };
