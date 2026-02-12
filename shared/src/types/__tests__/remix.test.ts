import { describe, expect, it } from "vitest";
import type { GameVariable } from "../GameDefinition";
import { getValue, isVariableWithTuning } from "../GameDefinition";
import {
	applyVariableOverrides,
	CreateRemixInputSchema,
	RemixOverridesSchema,
	RemixSchema,
	validateVariableOverrides,
} from "../remix";

describe("RemixOverridesSchema", () => {
	it("rejects payload containing constants override field", () => {
		const payload = {
			constants: { GRAVITY: 20 },
			variables: { jumpForce: 15 },
		};
		const result = RemixOverridesSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it("accepts valid variable overrides", () => {
		const payload = {
			variables: { jumpForce: 15, speed: 3.5 },
		};
		const result = RemixOverridesSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it("accepts valid asset overrides", () => {
		const payload = {
			assets: {
				player: {
					assetId: "asset-123",
					assetUrl: "https://example.com/player.png",
				},
			},
		};
		const result = RemixOverridesSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it("rejects asset overrides missing assetId", () => {
		const payload = {
			assets: {
				player: { assetUrl: "https://example.com/player.png" },
			},
		};
		const result = RemixOverridesSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it("rejects asset overrides missing assetUrl", () => {
		const payload = {
			assets: {
				player: { assetId: "asset-123" },
			},
		};
		const result = RemixOverridesSchema.safeParse(payload);
		expect(result.success).toBe(false);
	});

	it("accepts valid shader param overrides", () => {
		const payload = {
			shaderParams: {
				bloom: { intensity: 0.8, threshold: 0.5 },
			},
		};
		const result = RemixOverridesSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it("accepts valid sound overrides", () => {
		const payload = {
			sounds: {
				jump: { soundId: "jump-sfx", url: "https://example.com/jump.mp3" },
			},
		};
		const result = RemixOverridesSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it("accepts empty overrides", () => {
		const result = RemixOverridesSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts overrides with all buckets", () => {
		const payload = {
			variables: { gravity: 10 },
			assets: {
				bg: { assetId: "bg-asset", assetUrl: "https://example.com/bg.png" },
			},
			shaderParams: { bloom: { intensity: 0.5 } },
			sounds: { hit: { soundId: "hit", url: "https://example.com/hit.mp3" } },
		};
		const result = RemixOverridesSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});
});

describe("RemixSchema", () => {
	it("round-trip parses a full Remix object", () => {
		const remix = {
			id: "remix-123",
			baseGameId: "game-456",
			name: "My Cool Remix",
			description: "A remix of the original",
			creatorUserId: "user-789",
			overrides: {
				variables: { jumpForce: 20 },
			},
			themeId: "theme-001",
			themeName: "Neon",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		const result = RemixSchema.safeParse(remix);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(remix);
		}
	});

	it("accepts remix without optional fields", () => {
		const remix = {
			id: "remix-123",
			baseGameId: "game-456",
			name: "Minimal Remix",
			creatorUserId: "user-789",
			overrides: {},
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		const result = RemixSchema.safeParse(remix);
		expect(result.success).toBe(true);
	});

	it("rejects remix missing required id", () => {
		const remix = {
			baseGameId: "game-456",
			name: "Missing ID",
			creatorUserId: "user-789",
			overrides: {},
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		const result = RemixSchema.safeParse(remix);
		expect(result.success).toBe(false);
	});
});

describe("CreateRemixInputSchema", () => {
	it("accepts valid create input", () => {
		const input = {
			baseGameId: "game-456",
			name: "New Remix",
			overrides: {
				variables: { speed: 5 },
			},
		};

		const result = CreateRemixInputSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it("accepts create input with optional description and theme", () => {
		const input = {
			baseGameId: "game-456",
			name: "Themed Remix",
			description: "With a theme",
			overrides: {},
			themeId: "theme-001",
			themeName: "Spooky",
		};

		const result = CreateRemixInputSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it("rejects create input missing baseGameId", () => {
		const input = {
			name: "No Base",
			overrides: {},
		};

		const result = CreateRemixInputSchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});

describe("validateVariableOverrides", () => {
	it("accepts variable overrides within tuning bounds", () => {
		const gameVariables: Record<string, GameVariable> = {
			jumpForce: {
				value: 15,
				tuning: { min: 5, max: 25, step: 1 },
				category: "gameplay",
			},
		};
		const overrides = { jumpForce: 20 };

		const result = validateVariableOverrides(overrides, gameVariables);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects variable overrides below tuning min", () => {
		const gameVariables: Record<string, GameVariable> = {
			jumpForce: {
				value: 15,
				tuning: { min: 5, max: 25, step: 1 },
			},
		};
		const overrides = { jumpForce: 2 };

		const result = validateVariableOverrides(overrides, gameVariables);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].key).toBe("jumpForce");
		expect(result.errors[0].message).toContain("min");
	});

	it("rejects variable overrides above tuning max", () => {
		const gameVariables: Record<string, GameVariable> = {
			jumpForce: {
				value: 15,
				tuning: { min: 5, max: 25, step: 1 },
			},
		};
		const overrides = { jumpForce: 30 };

		const result = validateVariableOverrides(overrides, gameVariables);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].key).toBe("jumpForce");
		expect(result.errors[0].message).toContain("max");
	});

	it("accepts variable overrides for variables without tuning (no bounds to enforce)", () => {
		const gameVariables: Record<string, GameVariable> = {
			gravity: 10,
		};
		const overrides = { gravity: 999 };

		const result = validateVariableOverrides(overrides, gameVariables);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("accepts variable overrides for VariableWithTuning without tuning config", () => {
		const gameVariables: Record<string, GameVariable> = {
			theme: {
				value: "dark",
				label: "Theme",
			},
		};
		const overrides = { theme: "light" };

		const result = validateVariableOverrides(overrides, gameVariables);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("reports errors for multiple invalid overrides", () => {
		const gameVariables: Record<string, GameVariable> = {
			speed: {
				value: 5,
				tuning: { min: 1, max: 10, step: 0.5 },
			},
			gravity: {
				value: 10,
				tuning: { min: 5, max: 20, step: 1 },
			},
		};
		const overrides = { speed: 0, gravity: 25 };

		const result = validateVariableOverrides(overrides, gameVariables);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
	});

	it("accepts overrides at exact min and max boundaries", () => {
		const gameVariables: Record<string, GameVariable> = {
			speed: {
				value: 5,
				tuning: { min: 1, max: 10, step: 0.5 },
			},
		};

		expect(validateVariableOverrides({ speed: 1 }, gameVariables).valid).toBe(
			true,
		);
		expect(validateVariableOverrides({ speed: 10 }, gameVariables).valid).toBe(
			true,
		);
	});

	it("warns when overriding a variable that does not exist in game", () => {
		const gameVariables: Record<string, GameVariable> = {
			speed: 5,
		};
		const overrides = { nonExistent: 42 };

		const result = validateVariableOverrides(overrides, gameVariables);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].key).toBe("nonExistent");
		expect(result.errors[0].message).toContain("not found");
	});
});

describe("applyVariableOverrides", () => {
	it("merges overrides into game variables", () => {
		const gameVariables: Record<string, GameVariable> = {
			jumpForce: {
				value: 15,
				tuning: { min: 5, max: 25, step: 1 },
			},
			gravity: 10,
			lives: 3,
		};
		const overrides = { jumpForce: 20, gravity: 15 };

		const result = applyVariableOverrides(gameVariables, overrides);

		expect(getValue(result.jumpForce)).toBe(20);
		expect(getValue(result.gravity)).toBe(15);
		expect(getValue(result.lives)).toBe(3);
	});

	it("preserves tuning metadata when overriding VariableWithTuning", () => {
		const gameVariables: Record<string, GameVariable> = {
			jumpForce: {
				value: 15,
				tuning: { min: 5, max: 25, step: 1 },
				category: "gameplay",
				label: "Jump Height",
			},
		};
		const overrides = { jumpForce: 20 };

		const result = applyVariableOverrides(gameVariables, overrides);
		const variable = result.jumpForce;

		expect(isVariableWithTuning(variable)).toBe(true);
		if (isVariableWithTuning(variable)) {
			expect(variable.value).toBe(20);
			expect(variable.tuning).toEqual({ min: 5, max: 25, step: 1 });
			expect(variable.category).toBe("gameplay");
			expect(variable.label).toBe("Jump Height");
		}
	});

	it("does not mutate original variables", () => {
		const gameVariables: Record<string, GameVariable> = {
			speed: {
				value: 5,
				tuning: { min: 1, max: 10, step: 0.5 },
			},
		};
		const overrides = { speed: 8 };

		applyVariableOverrides(gameVariables, overrides);

		const original = gameVariables.speed;
		expect(isVariableWithTuning(original)).toBe(true);
		if (isVariableWithTuning(original)) {
			expect(original.value).toBe(5);
		}
	});

	it("handles empty overrides", () => {
		const gameVariables: Record<string, GameVariable> = {
			speed: 5,
		};

		const result = applyVariableOverrides(gameVariables, {});
		expect(getValue(result.speed)).toBe(5);
	});

	it("ignores overrides for non-existent variables", () => {
		const gameVariables: Record<string, GameVariable> = {
			speed: 5,
		};

		const result = applyVariableOverrides(gameVariables, { nonExistent: 42 });
		expect(Object.keys(result)).toEqual(["speed"]);
		expect(getValue(result.speed)).toBe(5);
	});
});
