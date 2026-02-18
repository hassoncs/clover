import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getActivePacks,
	isPackActive,
	SCHEDULED_PACKS,
} from "../pack-scheduler";
import { loadContentPack } from "../prompt-loader";

describe("pack scheduler", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("activates easter special packs during Holy Week", () => {
		const active = getActivePacks("amen", new Date("2026-04-01T12:00:00.000Z"));

		expect(active.length).toBeGreaterThan(0);
		expect(active.every((pack) => pack.packId === "amen-easter-special")).toBe(
			true,
		);
	});

	it("deactivates easter special packs outside Holy Week", () => {
		const active = getActivePacks("amen", new Date("2026-02-01T12:00:00.000Z"));

		expect(active).toHaveLength(0);
	});

	it("checks pack activity by pack id and date", () => {
		expect(
			isPackActive("amen-easter-special", new Date("2026-04-04T12:00:00.000Z")),
		).toBe(true);
		expect(
			isPackActive("amen-easter-special", new Date("2026-05-01T12:00:00.000Z")),
		).toBe(false);
	});

	it("merges seasonal pack content into amen base content when active", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-01T12:00:00.000Z"));
		const outOfSeasonTrivia = await loadContentPack("trivia", "amen");

		vi.setSystemTime(new Date("2026-04-01T12:00:00.000Z"));
		const inSeasonTrivia = await loadContentPack("trivia", "amen");

		expect(inSeasonTrivia.length).toBeGreaterThan(outOfSeasonTrivia.length);
		expect(
			inSeasonTrivia.some((item) => item.id === "amen-easter-triv-001"),
		).toBe(true);
		expect(
			outOfSeasonTrivia.some((item) => item.id === "amen-easter-triv-001"),
		).toBe(false);
	});

	it("registers easter special schedule definitions", () => {
		expect(
			SCHEDULED_PACKS.every((pack) => pack.packId === "amen-easter-special"),
		).toBe(true);
		expect(SCHEDULED_PACKS.every((pack) => pack.brandId === "amen")).toBe(true);
	});
});
