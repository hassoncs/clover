import promptsData from "./quiplash-prompts.json";

export interface QuiplashPrompt {
	id: string;
	text: string;
	category: string;
}

export function loadPromptPool(): QuiplashPrompt[] {
	return [...promptsData];
}

export function shufflePrompts(prompts: QuiplashPrompt[]): QuiplashPrompt[] {
	const shuffled = [...prompts];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export function selectPromptsForRound(
	pool: QuiplashPrompt[],
	count: number,
	usedIds: Set<string>,
): QuiplashPrompt[] {
	return pool.filter((p) => !usedIds.has(p.id)).slice(0, count);
}
