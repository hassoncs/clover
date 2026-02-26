import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchBibleQuizzle } from "../amen/biblequizzle.js";

describe("biblequizzle adapter", () => {
	it("loads local JSON and transforms to content items", async () => {
		const tempDir = mkdtempSync(join(tmpdir(), "bq-test-"));
		const filePath = join(tempDir, "biblequizzle.json");

		writeFileSync(
			filePath,
			JSON.stringify({
				questions: [
					{
						question:
							"What was the name of the garden where Adam and Eve lived?",
						answer: "Garden of Eden",
						categories: ["Old Testament"],
						reference: "Genesis 2:8",
					},
				],
			}),
		);

		try {
			const items = await fetchBibleQuizzle({
				count: 10,
				filePath,
				gameType: "trivia",
			});

			expect(items).toHaveLength(1);
			expect(items[0]?.gameType).toBe("trivia");
			expect(items[0]?.category).toBe("Old Testament");
			expect(items[0]?.provenance.source).toBe("biblequizzle");
			expect(items[0]?.text).toContain("Adam and Eve");

			const metadata = items[0]?.provenance.metadata as
				| Record<string, unknown>
				| undefined;
			expect(metadata?.correctAnswer).toBe("Garden of Eden");
			expect(metadata?.scriptureRef).toBe("Genesis 2:8");
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("throws when no local file path is provided", async () => {
		await expect(fetchBibleQuizzle({ count: 5 })).rejects.toThrow(
			"requires --file",
		);
	});
});
