import { z } from "zod";
import { EconomyGraphSchema } from "./schemas";

const SensitivityRangeSchema = z.object({
	min: z.number(),
	max: z.number(),
	steps: z.number().int().min(1),
});

export const SimulationConfigSchema = z.object({
	ticks: z.number().int().min(1),
	iterations: z.number().int().min(1),
	seedBase: z.number().int(),
	maxIterations: z.number().int().min(1).optional(),
	sensitivityParam: z.string().optional(),
	sensitivityRange: SensitivityRangeSchema.optional(),
});

export const SimulationJobRequestSchema = z.object({
	type: z.enum(["monte_carlo", "sensitivity"]),
	graphId: z.string().min(1),
	graph: EconomyGraphSchema,
	config: SimulationConfigSchema,
});

export const NodeStatisticsSchema = z.object({
	min: z.number(),
	max: z.number(),
	mean: z.number(),
	p50: z.number(),
	p90: z.number(),
	p99: z.number(),
	stdDev: z.number(),
	finalValues: z.array(z.number()),
});

export const RiskFlagSchema = z.object({
	type: z.enum(["overflow", "starvation", "deadlock", "high_variance"]),
	nodeId: z.string().min(1),
	message: z.string().min(1),
	severity: z.enum(["warning", "critical"]),
});

const EconomyStateSchema = z.object({
	nodeValues: z.record(z.string(), z.number()),
	tick: z.number().int().min(0),
});

export const SimulationTraceSchema = z.object({
	seed: z.number(),
	finalState: EconomyStateSchema,
	tickCount: z.number().int().min(0),
});

export const SimulationSummarySchema = z.object({
	nodeStats: z.record(z.string(), NodeStatisticsSchema),
	riskFlags: z.array(RiskFlagSchema),
});

export const SimulationJobResultSchema = z.object({
	jobId: z.string().min(1),
	status: z.enum(["completed", "failed"]),
	config: SimulationConfigSchema,
	summary: SimulationSummarySchema,
	traces: z.array(SimulationTraceSchema).optional(),
	warnings: z.array(z.string()),
	completedAt: z.number(),
	durationMs: z.number().min(0),
});

export type SimulationConfig = z.infer<typeof SimulationConfigSchema>;
export type SimulationJobRequest = z.infer<typeof SimulationJobRequestSchema>;
export type SimulationJobResult = z.infer<typeof SimulationJobResultSchema>;
export type NodeStatistics = z.infer<typeof NodeStatisticsSchema>;
export type RiskFlag = z.infer<typeof RiskFlagSchema>;
export type SimulationTrace = z.infer<typeof SimulationTraceSchema>;
export type SimulationSummary = z.infer<typeof SimulationSummarySchema>;

export type SensitivityRange = z.infer<typeof SensitivityRangeSchema>;
