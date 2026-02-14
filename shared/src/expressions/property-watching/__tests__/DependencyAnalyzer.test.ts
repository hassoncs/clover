import { describe, expect, it } from "vitest";
import type { GameDefinition } from "../../../types/GameDefinition";
import { DependencyAnalyzer } from "../DependencyAnalyzer";

describe("DependencyAnalyzer", () => {
	const minimalGame: GameDefinition = {
		metadata: { id: "test", title: "Test", version: "1.0.0" },
		world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
		prefabs: {},
		entities: [],
	};

	it("returns valid report for minimal game", () => {
		const analyzer = new DependencyAnalyzer(minimalGame);
		const report = analyzer.analyze();

		expect(report.valid).toBe(true);
		expect(report.errors).toHaveLength(0);
		expect(report.warnings).toHaveLength(0);
		expect(report.stats.totalExpressions).toBe(0);
		expect(report.stats.totalBehaviors).toBe(0);
		expect(report.stats.totalRules).toBe(0);
		expect(report.stats.totalEntities).toBe(0);
	});

	it("counts entities in stats", () => {
		const game: GameDefinition = {
			...minimalGame,
			entities: [
				{
					id: "e1",
					name: "E1",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
				{
					id: "e2",
					name: "E2",
					transform: { x: 1, y: 1, angle: 0, scaleX: 1, scaleY: 1 },
				},
			],
		};

		const analyzer = new DependencyAnalyzer(game);
		const report = analyzer.analyze();

		expect(report.stats.totalEntities).toBe(2);
	});

	it("returns empty watch specs", () => {
		const analyzer = new DependencyAnalyzer(minimalGame);
		analyzer.analyze();

		expect(analyzer.getWatchSpecs()).toHaveLength(0);
	});
});
