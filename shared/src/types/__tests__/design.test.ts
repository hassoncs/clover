import { describe, expect, it } from "vitest";
import {
	createEmptyDesignDocument,
	DesignSchemaError,
	isDesignDocument,
	parseDesignDocument,
} from "../design";

describe("DesignDocument", () => {
	const validDoc = {
		version: "1.0",
		metadata: {
			title: "Test Game",
			gameId: "game-123",
			createdAt: 123456789,
			updatedAt: 123456789,
		},
		frames: [
			{
				id: "frame-1",
				title: "Main Frame",
				width: 800,
				height: 600,
				position: { x: 0, y: 0 },
				elements: [
					{
						type: "rect",
						id: "rect-1",
						x: 10,
						y: 10,
						width: 100,
						height: 100,
						zIndex: 1,
						fill: "#ff0000",
					},
					{
						type: "text",
						id: "text-1",
						x: 120,
						y: 10,
						width: 200,
						height: 50,
						zIndex: 2,
						content: "Hello World",
						fontSize: 24,
					},
					{
						type: "image",
						id: "image-1",
						x: 10,
						y: 120,
						width: 100,
						height: 100,
						zIndex: 3,
						assetRef: "asset-abc",
					},
				],
			},
		],
	};

	it("should validate a valid document", () => {
		expect(isDesignDocument(validDoc)).toBe(true);
		const parsed = parseDesignDocument(validDoc);
		expect(parsed).toEqual(validDoc);
	});

	it("should fail for missing frames", () => {
		const invalidDoc = { ...validDoc };
		delete (invalidDoc as any).frames;
		expect(isDesignDocument(invalidDoc)).toBe(false);
		expect(() => parseDesignDocument(invalidDoc)).toThrow(DesignSchemaError);
	});

	it("should fail for unsupported version", () => {
		const invalidDoc = { ...validDoc, version: "999.0" };
		expect(isDesignDocument(invalidDoc)).toBe(false);
		expect(() => parseDesignDocument(invalidDoc)).toThrow(
			/unsupported version: 999.0/,
		);
	});

	it("should round-trip serialization", () => {
		const doc = createEmptyDesignDocument("game-123", "Empty Game");
		const serialized = JSON.parse(JSON.stringify(doc));
		expect(isDesignDocument(serialized)).toBe(true);
		expect(parseDesignDocument(serialized)).toEqual(doc);
	});

	it("should create an empty document with correct metadata", () => {
		const gameId = "game-456";
		const title = "New Design";
		const doc = createEmptyDesignDocument(gameId, title);
		expect(doc.version).toBe("1.0");
		expect(doc.metadata.gameId).toBe(gameId);
		expect(doc.metadata.title).toBe(title);
		expect(doc.frames).toEqual([]);
		expect(doc.metadata.createdAt).toBeTypeOf("number");
		expect(doc.metadata.updatedAt).toBeTypeOf("number");
	});
});
