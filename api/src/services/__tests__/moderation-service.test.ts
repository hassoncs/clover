import { describe, expect, it } from "vitest";
import {
	hashPrompt,
	MODERATION_ERROR_MESSAGE,
	ModerationService,
} from "../moderation-service";

describe("ModerationService", () => {
	const service = new ModerationService();

	describe("check", () => {
		describe("allowed prompts", () => {
			it("allows normal game prompts", () => {
				const result = service.check("Create a fun platformer game");
				expect(result.allowed).toBe(true);
			});

			it("allows prompts with partial word matches that are not blocked", () => {
				expect(service.check("Press the button to jump").allowed).toBe(true);
				expect(service.check("The assassin bug is an insect").allowed).toBe(
					true,
				);
				expect(service.check("Classic arcade game").allowed).toBe(true);
			});

			it("allows empty prompts", () => {
				const result = service.check("");
				expect(result.allowed).toBe(true);
			});

			it("allows prompts with safe words containing blocked substrings", () => {
				expect(service.check("button").allowed).toBe(true);
				expect(service.check("museum").allowed).toBe(true);
				expect(service.check("classic").allowed).toBe(true);
			});
		});

		describe("blocked prompts - violence", () => {
			it("blocks violence keywords", () => {
				const result = service.check("Create a game about murder");
				expect(result.allowed).toBe(false);
				expect(result.category).toBe("VIOLENCE");
			});

			it("blocks blood and gore", () => {
				const result = service.check("Add blood effects when the player dies");
				expect(result.allowed).toBe(false);
				expect(result.category).toBe("VIOLENCE");
			});

			it("blocks torture and suicide", () => {
				expect(service.check("torture the enemy").allowed).toBe(false);
				expect(service.check("suicide mission").allowed).toBe(false);
			});
		});

		describe("blocked prompts - NSFW", () => {
			it("blocks sexual content keywords", () => {
				const result = service.check("Create a nude character");
				expect(result.allowed).toBe(false);
				expect(result.category).toBe("NSFW");
			});

			it("blocks porn and sex", () => {
				expect(service.check("porn game").allowed).toBe(false);
				expect(service.check("sex scene").allowed).toBe(false);
			});

			it("blocks hentai and erotic", () => {
				expect(service.check("hentai style").allowed).toBe(false);
				expect(service.check("erotic content").allowed).toBe(false);
			});
		});

		describe("blocked prompts - hate speech", () => {
			it("blocks racial slurs", () => {
				const result = service.check("Use the n-word: nigger");
				expect(result.allowed).toBe(false);
				expect(result.category).toBe("HATE_SPEECH");
			});

			it("blocks homophobic slurs", () => {
				const result = service.check("faggot character");
				expect(result.allowed).toBe(false);
			});

			it("blocks racist and sexist terms", () => {
				expect(service.check("racist content").allowed).toBe(false);
			});
		});

		describe("blocked prompts - illegal", () => {
			it("blocks drug references", () => {
				const result = service.check("Create a cocaine dealing game");
				expect(result.allowed).toBe(false);
				expect(result.category).toBe("ILLEGAL");
			});

			it("blocks bomb and explosive", () => {
				expect(service.check("build a bomb").allowed).toBe(false);
				expect(service.check("explosive device").allowed).toBe(false);
			});

			it("blocks terrorist references", () => {
				expect(service.check("terrorist attack").allowed).toBe(false);
			});
		});

		describe("blocked prompts - PII", () => {
			it("blocks credit card requests", () => {
				const result = service.check("Enter your credit card number");
				expect(result.allowed).toBe(false);
				expect(result.category).toBe("PII");
			});

			it("blocks SSN requests", () => {
				expect(service.check("social security number").allowed).toBe(false);
				expect(service.check("SSN field").allowed).toBe(false);
			});

			it("blocks password requests", () => {
				expect(service.check("Enter your password").allowed).toBe(false);
			});
		});

		describe("case insensitivity", () => {
			it("blocks uppercase keywords", () => {
				const result = service.check("MURDER the enemy");
				expect(result.allowed).toBe(false);
			});

			it("blocks mixed case keywords", () => {
				const result = service.check("MuRdEr the enemy");
				expect(result.allowed).toBe(false);
			});

			it("blocks uppercase slurs", () => {
				const result = service.check("NIGGER");
				expect(result.allowed).toBe(false);
			});
		});

		describe("evasion attempts", () => {
			it("blocks leetspeak variations", () => {
				expect(service.check("s3x content").allowed).toBe(false);
				expect(service.check("p0rn game").allowed).toBe(false);
			});
		});
	});

	describe("checkMultiple", () => {
		it("returns allowed if all prompts are safe", () => {
			const result = service.checkMultiple([
				"Create a platformer",
				"Add jumping mechanics",
				"Make it fun",
			]);
			expect(result.allowed).toBe(true);
		});

		it("returns first rejection if any prompt is blocked", () => {
			const result = service.checkMultiple([
				"Create a platformer",
				"Add murder mechanics",
				"Make it fun",
			]);
			expect(result.allowed).toBe(false);
			expect(result.category).toBe("VIOLENCE");
		});
	});

	describe("createRejectionLog", () => {
		it("creates a log with hashed prompt", async () => {
			const result = service.check("murder game");
			const log = await service.createRejectionLog("murder game", result);

			expect(log.promptHash).toBeDefined();
			expect(log.promptHash).toHaveLength(16);
			expect(log.category).toBe("VIOLENCE");
			expect(log.timestamp).toBeGreaterThan(0);
		});

		it("does not include plaintext prompt in log", async () => {
			const result = service.check("porn content");
			const log = await service.createRejectionLog("porn content", result);

			const logString = JSON.stringify(log);
			expect(logString).not.toContain("porn");
		});

		it("produces consistent hashes for same input", async () => {
			const result = service.check("test prompt");
			const log1 = await service.createRejectionLog("test prompt", result);
			const log2 = await service.createRejectionLog("test prompt", result);

			expect(log1.promptHash).toBe(log2.promptHash);
		});
	});

	describe("MODERATION_ERROR_MESSAGE", () => {
		it("is deliberately vague", () => {
			expect(MODERATION_ERROR_MESSAGE).toBe(
				"Your prompt contains content that violates our safety guidelines.",
			);
			expect(MODERATION_ERROR_MESSAGE).not.toContain("violence");
			expect(MODERATION_ERROR_MESSAGE).not.toContain("NSFW");
		});
	});
});

describe("hashPrompt", () => {
	it("produces a 16-character hash", async () => {
		const hash = await hashPrompt("test prompt");
		expect(hash).toHaveLength(16);
		expect(hash).toMatch(/^[a-f0-9]{16}$/);
	});

	it("produces different hashes for different inputs", async () => {
		const hash1 = await hashPrompt("prompt 1");
		const hash2 = await hashPrompt("prompt 2");
		expect(hash1).not.toBe(hash2);
	});

	it("produces same hash for same input", async () => {
		const hash1 = await hashPrompt("same prompt");
		const hash2 = await hashPrompt("same prompt");
		expect(hash1).toBe(hash2);
	});
});
