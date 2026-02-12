import { describe, expect, it } from "vitest";

function camelToSnake(name: string): string {
	return name
		.replace(/^([23])d/i, "_$1d_")
		.replace(/^([A-Z]+)(?=[A-Z][a-z]|$)/g, (match) => match.toLowerCase())
		.replace(/([23])D(?=[A-Z]|$)/g, "_$1d_")
		.replace(/([a-z])(\d)/g, "$1_$2")
		.replace(/(\d)([A-Z])/g, "$1_$2")
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.toLowerCase();
}

describe("camelToSnake", () => {
	it("handles normal camelCase", () => {
		expect(camelToSnake("loadGame")).toBe("load_game");
		expect(camelToSnake("applyDynamicShader")).toBe("apply_dynamic_shader");
		expect(camelToSnake("stepPhysics")).toBe("step_physics");
	});

	it("handles leading digits", () => {
		expect(camelToSnake("3dViewport")).toBe("3d_viewport");
		expect(camelToSnake("2dPosition")).toBe("2d_position");
		expect(camelToSnake("3DModel")).toBe("3d_model");
		expect(camelToSnake("2DSprite")).toBe("2d_sprite");
	});

	it("handles all-caps sequences", () => {
		expect(camelToSnake("AABB")).toBe("aabb");
		expect(camelToSnake("UI")).toBe("ui");
		expect(camelToSnake("UIComponent")).toBe("ui_component");
		expect(camelToSnake("XMLParser")).toBe("xml_parser");
	});

	it("handles digits in middle", () => {
		expect(camelToSnake("test2")).toBe("test_2");
		expect(camelToSnake("create3dViewport")).toBe("create_3d_viewport");
		expect(camelToSnake("get2dPosition")).toBe("get_2d_position");
	});

	it("handles mixed patterns", () => {
		expect(camelToSnake("create3DViewport")).toBe("create_3d_viewport");
		expect(camelToSnake("get2DPosition")).toBe("get_2d_position");
		expect(camelToSnake("AABBQuery")).toBe("aabb_query");
	});

	it("handles single words", () => {
		expect(camelToSnake("step")).toBe("step");
		expect(camelToSnake("pause")).toBe("pause");
	});

	it("handles already snake_case", () => {
		expect(camelToSnake("load_game")).toBe("load_game");
		expect(camelToSnake("step_physics")).toBe("step_physics");
	});
});
