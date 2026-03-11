const FRESH_THRESHOLD_MS = 2000;

export interface OverlayFreshnessState {
	isFresh: boolean;
	opacity: number;
	scale: number;
	ringOpacity: number;
}

export function getOverlayFreshnessState(
	createdAt: number | undefined,
	now: number,
): OverlayFreshnessState {
	if (typeof createdAt !== "number") {
		return { isFresh: false, opacity: 1, scale: 1, ringOpacity: 0 };
	}

	const age = now - createdAt;
	if (age < 0 || age >= FRESH_THRESHOLD_MS) {
		return { isFresh: false, opacity: 1, scale: 1, ringOpacity: 0 };
	}

	const progress = Math.max(0, Math.min(1, age / FRESH_THRESHOLD_MS));
	return {
		isFresh: true,
		opacity: 0.78 + progress * 0.22,
		scale: 0.985 + progress * 0.015,
		ringOpacity: (1 - progress) * 0.85,
	};
}

export function hasFreshOverlayNodes(
	createdAts: Array<number | undefined>,
	now: number,
): boolean {
	return createdAts.some(
		(createdAt) => getOverlayFreshnessState(createdAt, now).isFresh,
	);
}
