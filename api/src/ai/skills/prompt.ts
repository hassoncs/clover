import type { Skill } from "./types";

export function assembleSystemPrompt(
	basePrompt: string,
	skill: Skill | null,
): string {
	if (!skill) {
		return basePrompt;
	}

	return `${basePrompt}

---
ACTIVE SKILL: ${skill.name}
${skill.description}

You have access to the readSkill tool to get detailed instructions for this skill.
---`;
}
