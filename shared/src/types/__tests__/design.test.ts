import { describe, expect, it } from "vitest";
import {
	createEmptyDesignDocument,
	DesignSchemaError,
	isDesignDocument,
	parseDesignDocument,
} from "../design";

describe("DesignDocument", () => {
	const validDoc = {
		version: "1.1",
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
						opacity: 0.5,
						rotation: 45,
						shadow: {
							color: "#000000",
							offsetX: 2,
							offsetY: 2,
							blur: 4,
						},
					},
					{
						type: "circle",
						id: "circle-1",
						x: 200,
						y: 200,
						width: 50,
						height: 50,
						zIndex: 4,
						fill: "#00ff00",
						gradient: {
							type: "linear",
							stops: [
								{ color: "#00ff00", position: 0 },
								{ color: "#0000ff", position: 1 },
							],
							angle: 90,
						},
					},
					{
						type: "line",
						id: "line-1",
						x1: 0,
						y1: 0,
						x2: 100,
						y2: 100,
						zIndex: 5,
						stroke: "#000000",
						strokeWidth: 2,
					},
					{
						type: "path",
						id: "path-1",
						x: 300,
						y: 300,
						zIndex: 6,
						data: "M 0 0 L 100 100",
						fill: "#ff00ff",
					},
					{
						type: "group",
						id: "group-1",
						x: 0,
						y: 0,
						width: 100,
						height: 100,
						zIndex: 7,
						childIds: ["rect-1", "circle-1"],
					},
				],
			},
		],
	};

	it("should validate a valid v1.1 document", () => {
		expect(isDesignDocument(validDoc)).toBe(true);
		const parsed = parseDesignDocument(validDoc);
		expect(parsed).toEqual(validDoc);
	});

	it("should fail for invalid opacity", () => {
		const invalidDoc = {
			...validDoc,
			frames: [
				{
					...validDoc.frames[0],
					elements: [
						{
							...validDoc.frames[0].elements[0],
							opacity: 1.5,
						},
					],
				},
			],
		};
		expect(isDesignDocument(invalidDoc)).toBe(false);
	});

	it("should fail for unsupported version", () => {
		const invalidDoc = { ...validDoc, version: "1.0" };
		expect(isDesignDocument(invalidDoc)).toBe(false);
		expect(() => parseDesignDocument(invalidDoc)).toThrow(
			/unsupported version: 1.0/,
		);
	});

	it("should create an empty document with correct metadata and version 1.1", () => {
		const gameId = "game-456";
		const title = "New Design";
		const doc = createEmptyDesignDocument(gameId, title);
		expect(doc.version).toBe("1.1");
		expect(doc.metadata.gameId).toBe(gameId);
		expect(doc.metadata.title).toBe(title);
		expect(doc.frames).toEqual([]);
	});
});
