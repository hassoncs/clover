import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchTheographic } from "../amen/theographic.js";

describe("theographic adapter", () => {
	it("loads local JSON and transforms people, places, and events", async () => {
		const tempDir = mkdtempSync(join(tmpdir(), "theographic-test-"));
		const filePath = join(tempDir, "theographic.json");

		writeFileSync(
			filePath,
			JSON.stringify({
				people: [
					{
						name: "Moses",
						description: "Led the Israelites out of Egypt",
						books: ["Exodus", "Numbers", "Deuteronomy"],
						era: "Exodus",
					},
				],
				places: [
					{
						name: "Jerusalem",
						description: "Holy city, capital of ancient Israel",
						significance: "Temple location, crucifixion site",
					},
				],
				events: [
					{
						name: "The Exodus",
						description: "Israelites leave Egypt",
						date: "~1446 BC",
						people: ["Moses", "Aaron"],
						places: ["Egypt", "Red Sea"],
					},
				],
			}),
		);

		try {
			const items = await fetchTheographic({
				count: 10,
				filePath,
				gameType: "amen-trivia",
			});

			expect(items.length).toBeGreaterThanOrEqual(6);
			expect(items[0]?.provenance.source).toBe("theographic");

			const personTrivia = items.find((item) =>
				item.text.includes("led the Israelites"),
			);
			expect(personTrivia?.category).toBe("Old Testament Leaders");
			expect(
				(
					personTrivia?.provenance.metadata as
						| Record<string, unknown>
						| undefined
				)?.answer,
			).toBe("Moses");

			const placeFibbage = items.find(
				(item) => item.text === "The city where Jesus was crucified",
			);
			expect(placeFibbage).toBeDefined();
			expect(
				(
					placeFibbage?.provenance.metadata as
						| Record<string, unknown>
						| undefined
				)?.answer,
			).toBe("Jerusalem");

			const eventHistory = items.find(
				(item) => item.text === "The Exodus from Egypt",
			);
			expect(eventHistory).toBeDefined();
			expect(
				(
					eventHistory?.provenance.metadata as
						| Record<string, unknown>
						| undefined
				)?.answer,
			).toBe("~1446 BC");

			const eventTrivia = items.find(
				(item) =>
					item.text === "What event involved the parting of the Red Sea?",
			);
			expect(eventTrivia).toBeDefined();
			expect(
				(
					eventTrivia?.provenance.metadata as
						| Record<string, unknown>
						| undefined
				)?.answer,
			).toBe("The Exodus");
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("throws when no file path is provided", async () => {
		await expect(fetchTheographic({ count: 5 })).rejects.toThrow(
			"requires --file",
		);
	});
});
