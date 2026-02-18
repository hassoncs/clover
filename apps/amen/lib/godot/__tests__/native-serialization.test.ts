import { describe, expect, it } from "vitest";

/**
 * Godot native_dispatch returns raw Godot Dictionary objects via JSI.
 * These objects look like plain JS objects but DON'T have standard
 * JS prototype methods. When JS Promise resolution probes for `.then`,
 * it throws: "Unable to resolve name as property or method: then"
 *
 * The fix: serialize inside the worklet before returning to JS.
 * This test verifies the serialization round-trip.
 */

function serializeGodotResult(result: unknown): unknown {
	if (result !== null && result !== undefined && typeof result === "object") {
		return JSON.stringify(result);
	}
	return result;
}

function deserializeResponse(response: unknown): unknown {
	if (typeof response === "string") {
		try {
			return JSON.parse(response);
		} catch {
			return response;
		}
	}
	return response;
}

describe("native bridge serialization", () => {
	describe("serializeGodotResult", () => {
		it("serializes Dictionary-like objects to JSON string", () => {
			const godotDict = { success: true, error: null };
			const result = serializeGodotResult(godotDict);
			expect(typeof result).toBe("string");
			expect(JSON.parse(result as string)).toEqual({
				success: true,
				error: null,
			});
		});

		it("serializes nested Dictionary results", () => {
			const godotDict = {
				result: { planHash: "abc", state: "running" },
				error: null,
			};
			const result = serializeGodotResult(godotDict);
			expect(typeof result).toBe("string");
			expect(JSON.parse(result as string).result.planHash).toBe("abc");
		});

		it("passes through null unchanged", () => {
			expect(serializeGodotResult(null)).toBe(null);
		});

		it("passes through undefined unchanged", () => {
			expect(serializeGodotResult(undefined)).toBe(undefined);
		});

		it("passes through numbers unchanged", () => {
			expect(serializeGodotResult(42)).toBe(42);
		});

		it("passes through strings unchanged", () => {
			expect(serializeGodotResult("already a string")).toBe("already a string");
		});

		it("passes through booleans unchanged", () => {
			expect(serializeGodotResult(true)).toBe(true);
		});
	});

	describe("deserializeResponse", () => {
		it("parses JSON string back to object", () => {
			const result = deserializeResponse('{"success":true}');
			expect(result).toEqual({ success: true });
		});

		it("passes through objects unchanged", () => {
			const obj = { success: true };
			expect(deserializeResponse(obj)).toBe(obj);
		});

		it("passes through null unchanged", () => {
			expect(deserializeResponse(null)).toBe(null);
		});

		it("returns non-JSON strings as-is", () => {
			expect(deserializeResponse("not json")).toBe("not json");
		});
	});

	describe("round-trip: serialize → deserialize", () => {
		it("preserves effects.applyGraph response", () => {
			const godotResponse = { success: true };
			const serialized = serializeGodotResult(godotResponse);
			const deserialized = deserializeResponse(serialized);
			expect(deserialized).toEqual({ success: true });
		});

		it("preserves RPC response with nested result", () => {
			const godotResponse = {
				result: { ok: true, framesAdvanced: 5, endFrame: 120 },
			};
			const serialized = serializeGodotResult(godotResponse);
			const deserialized = deserializeResponse(serialized);
			expect(deserialized).toEqual(godotResponse);
		});

		it("preserves error responses", () => {
			const godotResponse = {
				error: { message: "unknown_method", method: "bad_method" },
			};
			const serialized = serializeGodotResult(godotResponse);
			const deserialized = deserializeResponse(serialized);
			expect(deserialized).toEqual(godotResponse);
		});

		it("preserves entity transform response", () => {
			const godotResponse = { x: 1.5, y: -3.2, angle: 0.785 };
			const serialized = serializeGodotResult(godotResponse);
			const deserialized = deserializeResponse(serialized);
			expect(deserialized).toEqual(godotResponse);
		});

		it("preserves array responses", () => {
			const godotResponse = [1, 2, 3];
			const serialized = serializeGodotResult(godotResponse);
			const deserialized = deserializeResponse(serialized);
			expect(deserialized).toEqual([1, 2, 3]);
		});
	});

	describe("dispatch.async deserialization", () => {
		async function simulateDispatchAsync<T>(godotResult: unknown): Promise<T> {
			const serialized = serializeGodotResult(godotResult);
			const promiseResult = await Promise.resolve(serialized);
			if (typeof promiseResult === "string") {
				try {
					return JSON.parse(promiseResult) as T;
				} catch {
					return promiseResult as T;
				}
			}
			return promiseResult as T;
		}

		it("deserializes entity transform", async () => {
			const result = await simulateDispatchAsync<{
				x: number;
				y: number;
				angle: number;
			}>({ x: 1.5, y: -3.2, angle: 0.785 });
			expect(result).toEqual({ x: 1.5, y: -3.2, angle: 0.785 });
		});

		it("deserializes null as null", async () => {
			const result = await simulateDispatchAsync<null>(null);
			expect(result).toBe(null);
		});

		it("deserializes number result", async () => {
			const result = await simulateDispatchAsync<number>(42);
			expect(result).toBe(42);
		});

		it("deserializes array result", async () => {
			const result = await simulateDispatchAsync<number[]>([1, 2, 3]);
			expect(result).toEqual([1, 2, 3]);
		});
	});

	describe("Promise safety", () => {
		it("serialized result has no .then property (safe for Promise resolution)", async () => {
			const godotDict = { success: true };
			const serialized = serializeGodotResult(godotDict);

			// This is the actual bug: Promise.resolve(godotObject) probes for .then
			// A string result is safe because strings don't have .then
			const resolved = await Promise.resolve(serialized);
			expect(typeof resolved).toBe("string");
			expect(JSON.parse(resolved as string)).toEqual({ success: true });
		});

		it("null result is safe for Promise resolution", async () => {
			const resolved = await Promise.resolve(serializeGodotResult(null));
			expect(resolved).toBe(null);
		});
	});
});
