import { describe, expect, it } from "vitest";
import ballSortGame from "../../../../r2/games/ballSort/definition.json";
import flappyBirdGame from "../../../../r2/games/flappyBird/definition.json";
import { GameDefinitionSchema } from "../gameDefinition";

describe("GameDefinitionSchema", () => {
	it("validates flappy bird definition", () => {
		const result = GameDefinitionSchema.safeParse(flappyBirdGame);

		expect(result.success).toBe(true);
	});

	it("validates ball sort definition", () => {
		const result = GameDefinitionSchema.safeParse(ballSortGame);

		expect(result.success).toBe(true);
	});
});
