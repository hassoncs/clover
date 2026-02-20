import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getActivePacks,
	getActivePacksForType,
	isPackActive,
	SCHEDULED_PACKS,
} from "../pack-scheduler";

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

	it("returns scheduled packs for content type when active", () => {
		const outOfSeason = getActivePacksForType(
			"amen",
			"trivia",
			new Date("2026-02-01T12:00:00.000Z"),
		);
		const inSeason = getActivePacksForType(
			"amen",
			"trivia",
			new Date("2026-04-01T12:00:00.000Z"),
		);

		expect(outOfSeason).toHaveLength(0);
		expect(inSeason.some((pack) => pack.packId === "amen-easter-special")).toBe(
			true,
		);
	});

	it("registers easter special schedule definitions", () => {
		const packIds = new Set(SCHEDULED_PACKS.map((pack) => pack.packId));
		expect(packIds.has("amen-easter-special")).toBe(true);
		expect(packIds.has("amen-good-friday")).toBe(true);
		expect(SCHEDULED_PACKS.every((pack) => pack.brandId === "amen")).toBe(true);
	});
});
