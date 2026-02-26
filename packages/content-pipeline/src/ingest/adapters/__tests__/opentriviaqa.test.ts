import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchOpenTriviaQA } from "../amen/opentriviaqa.js";

describe("opentriviaqa adapter", () => {
	it("parses OpenTriviaQA format and keeps only Bible-relevant questions", async () => {
		const tempDir = mkdtempSync(join(tmpdir(), "otqa-test-"));
		const filePath = join(tempDir, "religion-faith.txt");

		writeFileSync(
			filePath,
			[
				"#Q Which disciple denied Jesus three times?",
				"^ Peter",
				"A Peter",
				"B Andrew",
				"C John",
				"D Philip",
				"",
				"#Q What Hollywood actor portrayed Casanova in a 2005 film?",
				"^ Heath Ledger",
				"A Johnny Depp",
				"B Antonio Banderas",
				"C Heath Ledger",
				"D Ryan Phillippe",
				"",
			].join("\n"),
		);

		try {
			const items = await fetchOpenTriviaQA({
				count: 10,
				filePath,
				gameType: "trivia",
			});

			expect(items).toHaveLength(1);
			expect(items[0]?.text).toBe("Which disciple denied Jesus three times?");
			expect(items[0]?.category).toBe("Bible Trivia");
			expect(items[0]?.provenance.source).toBe("opentriviaqa");

			const metadata = items[0]?.provenance.metadata as
				| Record<string, unknown>
				| undefined;
			expect(metadata?.correctAnswer).toBe("Peter");
			expect(metadata?.incorrectAnswers).toEqual(["Andrew", "John", "Philip"]);
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("throws when file path is not provided", async () => {
		await expect(fetchOpenTriviaQA({ count: 5 })).rejects.toThrow(
			"requires --file",
		);
	});
});
