import { describe, expect, it } from "vitest";
import testShader from "../shaders/_test.glsl";

describe("GLSL Import", () => {
	it("imports .glsl file as string", () => {
		expect(typeof testShader).toBe("string");
	});

	it("contains expected content", () => {
		expect(testShader).toContain("Test shader for import verification");
	});
});
