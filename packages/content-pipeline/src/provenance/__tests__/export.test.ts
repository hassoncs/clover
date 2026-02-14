import { describe, expect, it } from "vitest";
import type { ContentItemRow } from "../../db/index.js";
import { buildProvenanceRecord } from "../export.js";

describe("buildProvenanceRecord", () => {
	it("builds provenance record from content item", () => {
		const item: ContentItemRow = {
			id: "test-id",
			gameType: "trivia",
			text: "What is the capital of France?",
			category: "geography",
			contentHash: "abc123",
			provenanceSource: "ai",
			provenanceGeneratedAt: "2026-02-13T10:00:00Z",
			provenanceGeneratedBy: "gpt-4",
			provenancePrompt: "Generate trivia questions",
			provenanceMetadata: JSON.stringify({ temperature: 0.7 }),
			moderationStatus: "approved",
			moderationNotes: null,
			createdAt: "2026-02-13T10:00:00Z",
			updatedAt: "2026-02-13T10:00:00Z",
			metadata: null,
		};

		const record = buildProvenanceRecord(item);

		expect(record.itemId).toBe("test-id");
		expect(record.gameType).toBe("trivia");
		expect(record.text).toBe("What is the capital of France?");
		expect(record.source).toBe("ai");
		expect(record.generatedAt).toBe("2026-02-13T10:00:00Z");
		expect(record.generatedBy).toBe("gpt-4");
		expect(record.prompt).toBe("Generate trivia questions");
		expect(record.metadata).toEqual({ temperature: 0.7 });
		expect(record.transformHistory).toEqual([]);
	});

	it("handles null provenance fields", () => {
		const item: ContentItemRow = {
			id: "test-id",
			gameType: "trivia",
			text: "Test question",
			category: null,
			contentHash: "abc123",
			provenanceSource: "imported",
			provenanceGeneratedAt: null,
			provenanceGeneratedBy: null,
			provenancePrompt: null,
			provenanceMetadata: null,
			moderationStatus: "pending",
			moderationNotes: null,
			createdAt: "2026-02-13T10:00:00Z",
			updatedAt: "2026-02-13T10:00:00Z",
			metadata: null,
		};

		const record = buildProvenanceRecord(item);

		expect(record.generatedAt).toBeUndefined();
		expect(record.generatedBy).toBeUndefined();
		expect(record.prompt).toBeUndefined();
		expect(record.metadata).toBeUndefined();
	});
});
