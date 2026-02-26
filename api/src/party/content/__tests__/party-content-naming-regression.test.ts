import { CONTENT_TYPES } from "@slopcade/shared/schema/party-content";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractContentTypeFromFilename } from "../../../trpc/routes/party-content";

describe("party content canonical naming regression", () => {
	it("accepts canonical content types and rejects legacy aliases", () => {
		const contentTypeSchema = z.enum(CONTENT_TYPES);

		expect(contentTypeSchema.safeParse("estimation").success).toBe(true);
		expect(contentTypeSchema.safeParse("trivia").success).toBe(true);
		expect(contentTypeSchema.safeParse("wager").success).toBe(false);
		expect(contentTypeSchema.safeParse("history").success).toBe(false);
		expect(contentTypeSchema.safeParse("amen-trivia").success).toBe(false);
	});

	it("parses canonical filenames only", () => {
		expect(extractContentTypeFromFilename("estimation.json")).toBe(
			"estimation",
		);
		expect(extractContentTypeFromFilename("trivia.json")).toBe("trivia");
		expect(extractContentTypeFromFilename("wager.json")).toBeNull();
		expect(extractContentTypeFromFilename("history.json")).toBeNull();
		expect(extractContentTypeFromFilename("amen-trivia.json")).toBeNull();
	});
});
