import { describe, expect, it } from "vitest";
import { getAssetUrl } from "../asset-url";

describe("getAssetUrl", () => {
	it("constructs full URL from R2 key", () => {
		const url = getAssetUrl("p1/a1.png", "https://cdn.com");
		expect(url).toBe("https://cdn.com/p1/a1.png");
	});

	it("handles trailing slash in base URL", () => {
		const url = getAssetUrl("p1/a1.png", "https://cdn.com/");
		expect(url).toBe("https://cdn.com/p1/a1.png");
	});

	it("returns local URL in offline mode", () => {
		const url = getAssetUrl("p1/a1.png", "https://cdn.com", {
			offlineMode: true,
			localServerUrl: "http://localhost:8765",
		});
		expect(url).toBe("http://localhost:8765/p1/a1.png");
	});
});
