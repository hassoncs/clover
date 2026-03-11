import { describe, expect, it } from "vitest";
import { resolveCorsOrigin } from "../cors";

describe("resolveCorsOrigin", () => {
	it("allows localhost expo web origins", () => {
		expect(resolveCorsOrigin("http://localhost:8089")).toBe(
			"http://localhost:8089",
		);
	});

	it("allows 127.0.0.1 expo web origins", () => {
		expect(resolveCorsOrigin("http://127.0.0.1:8089")).toBe(
			"http://127.0.0.1:8089",
		);
	});

	it("allows devmux localhost subdomains", () => {
		expect(resolveCorsOrigin("http://api.slopcade.localhost:1355")).toBe(
			"http://api.slopcade.localhost:1355",
		);
	});

	it("rejects unrelated origins", () => {
		expect(resolveCorsOrigin("https://evil.example.com")).toBeUndefined();
	});
});
