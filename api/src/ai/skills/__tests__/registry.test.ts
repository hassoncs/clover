import { describe, expect, it } from "vitest";

import { getSkillById, getSkills } from "../registry";

describe("getSkills", () => {
	it("returns a non-empty array", () => {
		const skills = getSkills();
		expect(skills).toBeInstanceOf(Array);
		expect(skills.length).toBeGreaterThan(0);
	});

	it("all skills have required fields", () => {
		const skills = getSkills();
		for (const skill of skills) {
			expect(skill).toHaveProperty("id");
			expect(skill).toHaveProperty("name");
			expect(skill).toHaveProperty("description");
			expect(skill).toHaveProperty("keywords");
			expect(skill).toHaveProperty("priority");
			expect(skill).toHaveProperty("content");

			expect(typeof skill.id).toBe("string");
			expect(typeof skill.name).toBe("string");
			expect(typeof skill.description).toBe("string");
			expect(Array.isArray(skill.keywords)).toBe(true);
			expect(typeof skill.priority).toBe("number");
			expect(typeof skill.content).toBe("string");

			expect(skill.id.length).toBeGreaterThan(0);
			expect(skill.name.length).toBeGreaterThan(0);
			expect(skill.description.length).toBeGreaterThan(0);
			expect(skill.keywords.length).toBeGreaterThan(0);
			expect(skill.content.length).toBeGreaterThan(0);
		}
	});

	it("all skill ids are unique", () => {
		const skills = getSkills();
		const ids = skills.map((skill) => skill.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});
});

describe("getSkillById", () => {
	it("returns the game-design skill", () => {
		const skill = getSkillById("game-design");
		expect(skill).toBeDefined();
		expect(skill?.id).toBe("game-design");
		expect(skill?.name).toBe("Game Design");
	});

	it("returns the sprite-art skill", () => {
		const skill = getSkillById("sprite-art");
		expect(skill).toBeDefined();
		expect(skill?.id).toBe("sprite-art");
		expect(skill?.name).toBe("Sprite Art & Visual Design");
	});

	it("returns the scripting skill", () => {
		const skill = getSkillById("scripting");
		expect(skill).toBeDefined();
		expect(skill?.id).toBe("scripting");
		expect(skill?.name).toBe("Custom Scripting");
	});

	it("returns undefined for nonexistent skill", () => {
		const skill = getSkillById("nonexistent");
		expect(skill).toBeUndefined();
	});

	it("returns undefined for empty string", () => {
		const skill = getSkillById("");
		expect(skill).toBeUndefined();
	});
});
