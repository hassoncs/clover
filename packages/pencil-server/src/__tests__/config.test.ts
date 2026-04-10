import { describe, expect, it } from "vitest";
import { resolvePencilServerConfig } from "../config.js";

describe("resolvePencilServerConfig", () => {
	it("uses defaults for the legacy single-server mode", () => {
		expect(resolvePencilServerConfig({})).toMatchObject({
			port: 8090,
			sessionId: null,
			projectRoot: null,
			host: "127.0.0.1",
		});
	});

	it("supports per-session canvas and port overrides", () => {
		expect(
			resolvePencilServerConfig({
				PENCIL_SERVER_PORT: "8123",
				PENCIL_PROJECT_ROOT: "/tmp/project-a",
				PENCIL_CANVAS_FILE: "documents/main.pen",
				PENCIL_SESSION_ID: "pen_a3f8b2c1",
			}),
		).toMatchObject({
			port: 8123,
			sessionId: "pen_a3f8b2c1",
			projectRoot: "/tmp/project-a",
			canvasFile: "/tmp/project-a/documents/main.pen",
		});
	});
});
