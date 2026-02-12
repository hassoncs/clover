import { describe, expect, it } from "vitest";
import { matchSkill } from "../matcher";
import type { Skill } from "../types";

const mockSkills: Skill[] = [
	{
		id: "game-design",
		name: "Game Design",
		description: "Game design guidance",
		keywords: ["game design", "gameplay loop", "mechanics"],
		priority: 0,
		content: "Game design content",
	},
	{
		id: "sprite-art",
		name: "Sprite Art",
		description: "Sprite art guidance",
		keywords: ["sprite", "pixel art", "animation"],
		priority: 0,
		content: "Sprite art content",
	},
	{
		id: "scripting",
		name: "Scripting",
		description: "Scripting guidance",
		keywords: ["script", "scripting", "custom logic"],
		priority: 0,
		content: "Scripting content",
	},
];

describe("matchSkill", () => {
	it("returns null for no-match text", () => {
		const result = matchSkill("hello world", mockSkills);
		expect(result).toBeNull();
	});

	it("returns correct skill when a single keyword matches", () => {
		const result = matchSkill("help with game design", mockSkills);
		expect(result).not.toBeNull();
		expect(result?.id).toBe("game-design");
	});

	it("returns the skill with highest keyword count when multiple skills match", () => {
		const skillsWithDifferentScores: Skill[] = [
			{
				id: "low-score",
				name: "Low Score",
				description: "Low score skill",
				keywords: ["test"],
				priority: 0,
				content: "Low score content",
			},
			{
				id: "high-score",
				name: "High Score",
				description: "High score skill",
				keywords: ["test", "example", "demo"],
				priority: 0,
				content: "High score content",
			},
		];

		const result = matchSkill("test example demo", skillsWithDifferentScores);
		expect(result).not.toBeNull();
		expect(result?.id).toBe("high-score");
	});

	it("tie-breaks by priority when scores equal", () => {
		const skillsWithDifferentPriorities: Skill[] = [
			{
				id: "low-priority",
				name: "Low Priority",
				description: "Low priority skill",
				keywords: ["test"],
				priority: 0,
				content: "Low priority content",
			},
			{
				id: "high-priority",
				name: "High Priority",
				description: "High priority skill",
				keywords: ["test"],
				priority: 10,
				content: "High priority content",
			},
		];

		const result = matchSkill("test", skillsWithDifferentPriorities);
		expect(result).not.toBeNull();
		expect(result?.id).toBe("high-priority");
	});

	it("tie-breaks by lexical id when scores and priority are equal", () => {
		const skillsWithSameScoreAndPriority: Skill[] = [
			{
				id: "zebra",
				name: "Zebra",
				description: "Zebra skill",
				keywords: ["test"],
				priority: 0,
				content: "Zebra content",
			},
			{
				id: "alpha",
				name: "Alpha",
				description: "Alpha skill",
				keywords: ["test"],
				priority: 0,
				content: "Alpha content",
			},
		];

		const result = matchSkill("test", skillsWithSameScoreAndPriority);
		expect(result).not.toBeNull();
		expect(result?.id).toBe("alpha");
	});

	it("performs case-insensitive matching", () => {
		const result = matchSkill("GAME DESIGN", mockSkills);
		expect(result).not.toBeNull();
		expect(result?.id).toBe("game-design");
	});

	it("returns null for empty text", () => {
		const result = matchSkill("", mockSkills);
		expect(result).toBeNull();
	});

	it("returns null for empty skills array", () => {
		const result = matchSkill("game design", []);
		expect(result).toBeNull();
	});

	it("trims whitespace from text", () => {
		const result = matchSkill("  game design  ", mockSkills);
		expect(result).not.toBeNull();
		expect(result?.id).toBe("game-design");
	});

	it("matches partial keyword occurrences", () => {
		const result = matchSkill("I need help with scripting logic", mockSkills);
		expect(result).not.toBeNull();
		expect(result?.id).toBe("scripting");
	});
});
