import { describe, expect, it } from "vitest";
import {
	FileIOError,
	loadCorruptFile,
	loadPenFile,
	savePenFile,
} from "../file-io";

describe("loadPenFile", () => {
	it("throws FileIOError for invalid JSON", () => {
		expect(() => loadPenFile("not json")).toThrow(FileIOError);
		expect(() => loadPenFile("not json")).toThrow(/Invalid JSON/);
	});

	it("throws FileIOError for valid JSON that is not a PenDocument", () => {
		const json = JSON.stringify({ foo: "bar", baz: 123 });
		expect(() => loadPenFile(json)).toThrow(FileIOError);
		expect(() => loadPenFile(json)).toThrow(/Malformed .pen document/);
	});

	it("throws FileIOError for empty string", () => {
		expect(() => loadPenFile("")).toThrow(FileIOError);
		expect(() => loadPenFile("")).toThrow(/Invalid JSON/);
	});

	it("loads a valid minimal .pen document", () => {
		const doc = { version: 1, children: [] };
		const graph = loadPenFile(JSON.stringify(doc));
		expect(graph).toBeDefined();
	});

	it("roundtrips a simple .pen document through load + save", () => {
		const doc = { version: 1, children: [] };
		const json = JSON.stringify(doc);
		const graph = loadPenFile(json);
		const saved = savePenFile(graph);
		const parsed = JSON.parse(saved);
		expect(parsed.version).toBe(1);
		expect(Array.isArray(parsed.children)).toBe(true);
	});

	it("preserves document version through roundtrip", () => {
		const doc = {
			version: 1,
			children: [
				{
					type: "frame",
					id: "frame-1",
					children: [],
				},
			],
		};
		const graph = loadPenFile(JSON.stringify(doc));
		const saved = savePenFile(graph);
		const restored = JSON.parse(saved);
		expect(restored.version).toBe(1);
		expect(restored.children).toHaveLength(1);
		expect(restored.children[0].type).toBe("frame");
	});
});

describe("loadCorruptFile", () => {
	it("always throws FileIOError", () => {
		expect(() => loadCorruptFile(null)).toThrow(FileIOError);
		expect(() => loadCorruptFile({ anything: true })).toThrow(FileIOError);
		expect(() => loadCorruptFile(42)).toThrow(FileIOError);
	});

	it("includes the data type in the error message", () => {
		expect(() => loadCorruptFile(null)).toThrow(/got object/);
		expect(() => loadCorruptFile("bad")).toThrow(/got string/);
	});
});
