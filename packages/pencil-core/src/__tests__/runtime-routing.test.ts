import { describe, expect, it } from "vitest";
import { buildPencilRuntimeRoute } from "../session/runtime-routing";

describe("buildPencilRuntimeRoute", () => {
	it("builds stable editor URLs around session/project/file identity", () => {
		expect(
			buildPencilRuntimeRoute({
				baseUrl: "http://127.0.0.1:8100",
				sessionId: "pen_a3f8b2c1",
				projectRoot: "/tmp/project-a",
				filePath: "documents/main.pen",
			}),
		).toBe(
			"http://127.0.0.1:8100/?session=pen_a3f8b2c1&project=%2Ftmp%2Fproject-a&file=documents%2Fmain.pen",
		);
	});

	it("builds embed URLs for one target at a time", () => {
		expect(
			buildPencilRuntimeRoute({
				baseUrl: "http://127.0.0.1:8100/",
				sessionId: "pen_a3f8b2c1",
				projectRoot: "/tmp/project-a",
				filePath: "documents/main.pen",
				mode: "prism",
				targetId: "hero-cta",
			}),
		).toBe(
			"http://127.0.0.1:8100/embed?session=pen_a3f8b2c1&project=%2Ftmp%2Fproject-a&file=documents%2Fmain.pen&mode=prism&target=hero-cta",
		);
	});
});
