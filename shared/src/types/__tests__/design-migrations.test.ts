import { describe, expect, it, vi } from "vitest";
import { DesignSchemaError } from "../design";
import { migrateDesignDocument } from "../design-migrations";

describe("migrateDesignDocument", () => {
	const validV11Doc = {
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
				elements: [],
			},
		],
	};

	it("should pass through current v1.1 version unchanged", () => {
		const result = migrateDesignDocument(validV11Doc);
		expect(result).toEqual(validV11Doc);
		expect(result.version).toBe("1.1");
	});

	it("should migrate v1.0 doc to v1.1", () => {
		const v10Doc = {
			version: "1.0",
			metadata: {
				title: "V1.0 Game",
				gameId: "game-1.0",
				createdAt: 1000,
				updatedAt: 2000,
			},
			frames: [
				{
					id: "frame-1",
					title: "Frame 1",
					width: 100,
					height: 100,
					position: { x: 0, y: 0 },
					elements: [
						{
							id: "rect-1",
							type: "rect",
							zIndex: 1,
							x: 10,
							y: 10,
							width: 50,
							height: 50,
							fill: "red",
						},
					],
				},
			],
		};

		const result = migrateDesignDocument(v10Doc);
		expect(result.version).toBe("1.1");
		expect(result.frames[0].elements[0].type).toBe("rect");
	});

	it("should preserve all original v1.0 element types (rect, text, image) during migration", () => {
		const v10DocFull = {
			version: "1.0",
			metadata: {
				title: "Full V1.0 Game",
				gameId: "game-full-v10",
				createdAt: 1000,
				updatedAt: 2000,
			},
			frames: [
				{
					id: "frame-1",
					title: "Frame 1",
					width: 400,
					height: 400,
					position: { x: 0, y: 0 },
					elements: [
						{
							id: "rect-1",
							type: "rect",
							zIndex: 1,
							x: 10,
							y: 10,
							width: 50,
							height: 50,
							fill: "#ff0000",
						},
						{
							id: "text-1",
							type: "text",
							zIndex: 2,
							x: 100,
							y: 10,
							width: 200,
							height: 50,
							content: "Hello World",
							fontSize: 16,
						},
						{
							id: "image-1",
							type: "image",
							zIndex: 3,
							x: 10,
							y: 100,
							width: 100,
							height: 100,
						},
					],
				},
			],
		};

		const result = migrateDesignDocument(v10DocFull);
		expect(result.version).toBe("1.1");
		const elements = result.frames[0].elements;
		expect(elements).toHaveLength(3);
		expect(elements[0].type).toBe("rect");
		expect(elements[0].id).toBe("rect-1");
		expect(elements[1].type).toBe("text");
		expect(elements[1].id).toBe("text-1");
		expect(elements[2].type).toBe("image");
		expect(elements[2].id).toBe("image-1");
	});

	it("should migrate legacy v0.x (no version) to v1.1", () => {
		const legacyDoc = {
			metadata: {
				title: "Legacy Game",
				gameId: "game-legacy",
				createdAt: 100,
				updatedAt: 200,
			},
			frames: [],
		};

		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const result = migrateDesignDocument(legacyDoc);

		expect(result.version).toBe("1.1");
		expect(result.metadata.title).toBe("Legacy Game");
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("migrated from v0.x to v1.1"),
		);
		consoleSpy.mockRestore();
	});

	it("should provide defaults for missing fields in legacy v0.x", () => {
		const veryLegacyDoc = {};

		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const result = migrateDesignDocument(veryLegacyDoc);

		expect(result.version).toBe("1.1");
		expect(result.metadata.title).toBe("Migrated Design");
		expect(result.frames).toEqual([]);
		consoleSpy.mockRestore();
	});

	it("should throw DesignSchemaError for unknown future versions", () => {
		const futureDoc = {
			...validV11Doc,
			version: "2.0",
		};

		expect(() => migrateDesignDocument(futureDoc)).toThrow(DesignSchemaError);
		expect(() => migrateDesignDocument(futureDoc)).toThrow(
			/unsupported version: 2.0/,
		);
	});

	it("should throw DesignSchemaError for non-object input", () => {
		expect(() => migrateDesignDocument(null)).toThrow(DesignSchemaError);
		expect(() => migrateDesignDocument("not an object")).toThrow(
			DesignSchemaError,
		);
	});

	it("should throw DesignSchemaError if migration results in invalid schema", () => {
		const invalidLegacyDoc = {
			metadata: {
				// missing required fields
				title: "Invalid",
			},
		};

		vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(() => migrateDesignDocument(invalidLegacyDoc)).toThrow(
			DesignSchemaError,
		);
		expect(() => migrateDesignDocument(invalidLegacyDoc)).toThrow(
			/Invalid design document schema after migration/,
		);
	});
});
