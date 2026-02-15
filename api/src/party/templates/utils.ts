export interface ScoreEntry {
	playerId: string;
	playerName: string;
	score: number;
}

interface CountdownRoom {
	updateSharedData(data: Record<string, unknown>): Promise<void>;
}

export function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
	return Math.random().toString(36).slice(2, 10);
}

export function startCountdown(
	room: CountdownRoom,
	seconds: number,
): ReturnType<typeof setInterval> {
	let remaining = seconds;
	const interval = setInterval(async () => {
		remaining--;
		if (remaining >= 0) {
			await room.updateSharedData({ timerRemaining: remaining });
		}
	}, 1000);
	return interval;
}

export function buildScoreboard(
	scores: Map<string, number>,
	playerNames: Map<string, string>,
): ScoreEntry[] {
	const entries: ScoreEntry[] = [];
	for (const [playerId, score] of scores) {
		entries.push({
			playerId,
			playerName: playerNames.get(playerId) ?? playerId,
			score,
		});
	}
	entries.sort((a, b) => b.score - a.score);
	return entries;
}
