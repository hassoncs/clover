import {
	EconomyGraphSchema,
	EconomySimulator,
	validateEconomyGraph,
} from "@slopcade/economy-engine";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

const MAX_SIMULATION_TICKS = 1000;

export const economyGraphRouter = router({
	validateGraph: protectedProcedure
		.input(
			z.object({
				graph: EconomyGraphSchema,
			}),
		)
		.query(({ input }) => {
			const result = validateEconomyGraph(input.graph);
			return {
				valid: result.valid,
				errors: result.errors,
			};
		}),

	simulate: protectedProcedure
		.input(
			z.object({
				graph: EconomyGraphSchema,
				ticks: z.number().int().min(1).max(MAX_SIMULATION_TICKS),
				seed: z.number().int(),
			}),
		)
		.mutation(({ input }) => {
			const validation = validateEconomyGraph(input.graph);
			if (!validation.valid) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid economy graph",
					cause: validation.errors,
				});
			}

			const simulator = new EconomySimulator(input.graph, input.seed);
			const results = simulator.run(input.ticks);

			return { results };
		}),
});
