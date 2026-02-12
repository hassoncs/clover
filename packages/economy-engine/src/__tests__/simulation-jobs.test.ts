import { describe, expect, it } from "vitest";
import { makeGraph, makePool, makeResourceEdge, makeSource } from "../fixtures";
import type {
	NodeStatistics,
	RiskFlag,
	SimulationConfig,
	SimulationJobRequest,
	SimulationJobResult,
	SimulationSummary,
	SimulationTrace,
} from "../simulation-jobs";
import {
	NodeStatisticsSchema,
	RiskFlagSchema,
	SimulationConfigSchema,
	SimulationJobRequestSchema,
	SimulationJobResultSchema,
	SimulationSummarySchema,
	SimulationTraceSchema,
} from "../simulation-jobs";

function makeTestGraph() {
	return makeGraph(
		[makeSource("src", "gold"), makePool("pool", "gold", 100)],
		[makeResourceEdge("e1", "src", "pool", "1")],
		["gold"],
	);
}

function makeValidConfig(): SimulationConfig {
	return {
		ticks: 100,
		iterations: 50,
		seedBase: 42,
	};
}

function makeValidRequest(): SimulationJobRequest {
	return {
		type: "monte_carlo",
		graphId: "graph-1",
		graph: makeTestGraph(),
		config: makeValidConfig(),
	};
}

function makeValidNodeStats(): NodeStatistics {
	return {
		min: 0,
		max: 100,
		mean: 50,
		p50: 48,
		p90: 85,
		p99: 98,
		stdDev: 15.5,
		finalValues: [42, 55, 63, 48, 50],
	};
}

function makeValidResult(): SimulationJobResult {
	return {
		jobId: "job-123",
		status: "completed",
		config: makeValidConfig(),
		summary: {
			nodeStats: {
				pool: makeValidNodeStats(),
			},
			riskFlags: [],
		},
		warnings: [],
		completedAt: Date.now(),
		durationMs: 1234,
	};
}

describe("SimulationConfigSchema", () => {
	it("accepts a valid config", () => {
		const result = SimulationConfigSchema.safeParse(makeValidConfig());
		expect(result.success).toBe(true);
	});

	it("rejects negative ticks", () => {
		const result = SimulationConfigSchema.safeParse({
			...makeValidConfig(),
			ticks: -1,
		});
		expect(result.success).toBe(false);
	});

	it("rejects zero iterations", () => {
		const result = SimulationConfigSchema.safeParse({
			...makeValidConfig(),
			iterations: 0,
		});
		expect(result.success).toBe(false);
	});

	it("accepts sensitivity analysis config", () => {
		const config: SimulationConfig = {
			...makeValidConfig(),
			sensitivityParam: "pool",
			sensitivityRange: { min: 0, max: 100, steps: 10 },
		};
		const result = SimulationConfigSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	it("accepts maxIterations guard rail", () => {
		const result = SimulationConfigSchema.safeParse({
			...makeValidConfig(),
			maxIterations: 5000,
		});
		expect(result.success).toBe(true);
	});
});

describe("SimulationJobRequestSchema", () => {
	it("accepts a valid monte_carlo request", () => {
		const result = SimulationJobRequestSchema.safeParse(makeValidRequest());
		expect(result.success).toBe(true);
	});

	it("accepts a valid sensitivity request", () => {
		const req: SimulationJobRequest = {
			...makeValidRequest(),
			type: "sensitivity",
			config: {
				...makeValidConfig(),
				sensitivityParam: "pool",
				sensitivityRange: { min: 0, max: 100, steps: 10 },
			},
		};
		const result = SimulationJobRequestSchema.safeParse(req);
		expect(result.success).toBe(true);
	});

	it("rejects request missing graph", () => {
		const { graph: _, ...noGraph } = makeValidRequest();
		const result = SimulationJobRequestSchema.safeParse(noGraph);
		expect(result.success).toBe(false);
	});

	it("rejects request with invalid type", () => {
		const result = SimulationJobRequestSchema.safeParse({
			...makeValidRequest(),
			type: "invalid",
		});
		expect(result.success).toBe(false);
	});

	it("rejects request with negative ticks in config", () => {
		const result = SimulationJobRequestSchema.safeParse({
			...makeValidRequest(),
			config: { ...makeValidConfig(), ticks: -5 },
		});
		expect(result.success).toBe(false);
	});
});

describe("NodeStatisticsSchema", () => {
	it("accepts valid node statistics", () => {
		const result = NodeStatisticsSchema.safeParse(makeValidNodeStats());
		expect(result.success).toBe(true);
	});
});

describe("RiskFlagSchema", () => {
	it("accepts a valid risk flag", () => {
		const flag: RiskFlag = {
			type: "overflow",
			nodeId: "pool",
			message: "Pool exceeded capacity",
			severity: "warning",
		};
		const result = RiskFlagSchema.safeParse(flag);
		expect(result.success).toBe(true);
	});

	it("accepts all risk flag types", () => {
		for (const type of [
			"overflow",
			"starvation",
			"deadlock",
			"high_variance",
		] as const) {
			const flag: RiskFlag = {
				type,
				nodeId: "n1",
				message: "msg",
				severity: "critical",
			};
			expect(RiskFlagSchema.safeParse(flag).success).toBe(true);
		}
	});

	it("rejects invalid severity", () => {
		const result = RiskFlagSchema.safeParse({
			type: "overflow",
			nodeId: "pool",
			message: "Pool exceeded capacity",
			severity: "info",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid risk flag type", () => {
		const result = RiskFlagSchema.safeParse({
			type: "unknown_type",
			nodeId: "pool",
			message: "msg",
			severity: "warning",
		});
		expect(result.success).toBe(false);
	});
});

describe("SimulationTraceSchema", () => {
	it("accepts a valid trace", () => {
		const trace: SimulationTrace = {
			seed: 42,
			finalState: { nodeValues: { pool: 50 }, tick: 100 },
			tickCount: 100,
		};
		const result = SimulationTraceSchema.safeParse(trace);
		expect(result.success).toBe(true);
	});
});

describe("SimulationSummarySchema", () => {
	it("accepts a valid summary with risk flags", () => {
		const summary: SimulationSummary = {
			nodeStats: { pool: makeValidNodeStats() },
			riskFlags: [
				{
					type: "starvation",
					nodeId: "pool",
					message: "Pool ran empty in 30% of runs",
					severity: "warning",
				},
			],
		};
		const result = SimulationSummarySchema.safeParse(summary);
		expect(result.success).toBe(true);
	});
});

describe("SimulationJobResultSchema", () => {
	it("accepts a valid completed result", () => {
		const result = SimulationJobResultSchema.safeParse(makeValidResult());
		expect(result.success).toBe(true);
	});

	it("accepts a valid failed result", () => {
		const res: SimulationJobResult = {
			...makeValidResult(),
			status: "failed",
		};
		const result = SimulationJobResultSchema.safeParse(res);
		expect(result.success).toBe(true);
	});

	it("accepts result with traces", () => {
		const res: SimulationJobResult = {
			...makeValidResult(),
			traces: [
				{
					seed: 42,
					finalState: { nodeValues: { pool: 50 }, tick: 100 },
					tickCount: 100,
				},
			],
		};
		const result = SimulationJobResultSchema.safeParse(res);
		expect(result.success).toBe(true);
	});

	it("accepts result with risk flags", () => {
		const res: SimulationJobResult = {
			...makeValidResult(),
			summary: {
				nodeStats: { pool: makeValidNodeStats() },
				riskFlags: [
					{
						type: "high_variance",
						nodeId: "pool",
						message: "High variance detected",
						severity: "critical",
					},
				],
			},
		};
		const result = SimulationJobResultSchema.safeParse(res);
		expect(result.success).toBe(true);
	});

	it("rejects result with invalid risk flag severity", () => {
		const result = SimulationJobResultSchema.safeParse({
			...makeValidResult(),
			summary: {
				nodeStats: { pool: makeValidNodeStats() },
				riskFlags: [
					{
						type: "overflow",
						nodeId: "pool",
						message: "bad",
						severity: "info",
					},
				],
			},
		});
		expect(result.success).toBe(false);
	});

	it("rejects result with invalid status", () => {
		const result = SimulationJobResultSchema.safeParse({
			...makeValidResult(),
			status: "running",
		});
		expect(result.success).toBe(false);
	});
});
