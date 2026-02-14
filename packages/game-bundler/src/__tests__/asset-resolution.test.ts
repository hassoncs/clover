import { describe, expect, it } from "vitest";
import { compileBundle } from "../compiler";
import { VirtualFileReader } from "../FileReader";

describe("Asset Resolution", () => {
	it("resolves localPath for assets in assets/ directory", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"assets.json",
				JSON.stringify({
					ball: { type: "image", localPath: "ball.png" },
				}),
			],
			["assets/ball.png", "fake-image-data"],
			[
				"prefabs/ball.json",
				JSON.stringify({
					id: "ball",
					sprite: { type: "image", asset: "ball" },
				}),
			],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.assets?.ball).toMatchObject({
			localPath: "ball.png",
			type: "image",
		});
	});

	it("uses remoteUrl when only remote URL provided", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"assets.json",
				JSON.stringify({
					background: {
						type: "image",
						remoteUrl: "https://cdn.example.com/bg.png",
					},
				}),
			],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.assets?.background).toMatchObject({
			remoteUrl: "https://cdn.example.com/bg.png",
			type: "image",
		});
	});

	it("outputs both localPath and remoteUrl when both provided", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"assets.json",
				JSON.stringify({
					ball: {
						type: "image",
						remoteUrl: "https://cdn.example.com/ball.png",
						localPath: "ball.png",
					},
				}),
			],
			["assets/ball.png", "fake-image-data"],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.assets?.ball).toMatchObject({
			remoteUrl: "https://cdn.example.com/ball.png",
			localPath: "ball.png",
			type: "image",
		});
	});

	it("produces error when localPath declared but file missing", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"assets.json",
				JSON.stringify({
					ball: { type: "image", localPath: "ball.png" },
				}),
			],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({
				code: "MISSING_LOCAL_ASSET",
				message: expect.stringContaining("ball.png"),
			}),
		);
	});

	it("produces error when neither remoteUrl nor localPath provided", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"assets.json",
				JSON.stringify({
					ball: { type: "image" },
				}),
			],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({
				code: "INVALID_ASSET_REFERENCE",
				message: expect.stringContaining("ball"),
			}),
		);
	});

	it("supports legacy path field as remoteUrl", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"assets.json",
				JSON.stringify({
					ball: { type: "image", path: "https://cdn.example.com/ball.png" },
				}),
			],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.assets?.ball).toMatchObject({
			path: "https://cdn.example.com/ball.png",
			type: "image",
		});
	});

	it("scans assets directory for image files", () => {
		const files = new Map<string, string>([
			[
				"manifest.json",
				JSON.stringify({ name: "test-game", version: "1.0.0" }),
			],
			[
				"assets.json",
				JSON.stringify({
					ball: { type: "image", localPath: "ball.png" },
					paddle: { type: "image", localPath: "paddle.jpg" },
				}),
			],
			["assets/ball.png", "fake-image-data"],
			["assets/paddle.jpg", "fake-image-data"],
			["assets/sound.mp3", "fake-sound-data"],
		]);

		const fileReader = new VirtualFileReader("/bundle", files);
		const result = compileBundle("/bundle", { fileReader });

		expect(result.success).toBe(true);
		expect(result.rawData.assets?.ball).toBeDefined();
		expect(result.rawData.assets?.paddle).toBeDefined();
	});
});
