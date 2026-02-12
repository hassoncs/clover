export interface SeededRng {
	next(): number;
	nextInt(min: number, max: number): number;
}

export function createSeededRng(seed: number): SeededRng {
	let state = seed >>> 0 || 1;

	const next = (): number => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};

	const nextInt = (min: number, max: number): number => {
		if (max <= min) {
			return min;
		}
		return Math.floor(next() * (max - min + 1)) + min;
	};

	return { next, nextInt };
}
