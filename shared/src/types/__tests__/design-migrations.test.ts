import { describe, expect, it, vi } from "vitest";
import { DesignSchemaError } from "../design";
import { migrateDesignDocument } from "../design-migrations";

describe("migrateDesignDocument", () => {
	const validV1Doc = {
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
				elements: [],
			},
		],
	};

	it("should pass through current v1.0 version unchanged", () => {
		const result = migrateDesignDocument(validV1Doc);
		expect(result).toEqual(validV1Doc);
		expect(result.version).toBe("1.0");
	});

	it("should migrate legacy v0.x (no version) to v1.0", () => {
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

		expect(result.version).toBe("1.0");
		expect(result.metadata.title).toBe("Legacy Game");
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("migrated from v0.x to v1.0"),
		);
		consoleSpy.mockRestore();
	});

	it("should provide defaults for missing fields in legacy v0.x", () => {
		const veryLegacyDoc = {};

		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const result = migrateDesignDocument(veryLegacyDoc);

		expect(result.version).toBe("1.0");
		expect(result.metadata.title).toBe("Migrated Design");
		expect(result.frames).toEqual([]);
		consoleSpy.mockRestore();
	});

	it("should throw DesignSchemaError for unknown future versions", () => {
		const futureDoc = {
			...validV1Doc,
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
