import type { Skill } from "./types";

export function matchSkill(text: string, skills: Skill[]): Skill | null {
	const normalized = text.toLowerCase().trim();

	let bestSkill: Skill | null = null;
	let bestScore = 0;

	for (const skill of skills) {
		let score = 0;
		for (const keyword of skill.keywords) {
			if (normalized.includes(keyword.toLowerCase())) {
				score += 1;
			}
		}

		if (score === 0) continue;

		if (
			score > bestScore ||
			(score === bestScore &&
				bestSkill !== null &&
				(skill.priority > bestSkill.priority ||
					(skill.priority === bestSkill.priority && skill.id < bestSkill.id)))
		) {
			bestScore = score;
			bestSkill = skill;
		}
	}

	return bestSkill;
}
