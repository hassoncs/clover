import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AnyRouter } from "@trpc/server";
import { z } from "zod";

import type { Env } from "@/trpc/context";

type TrpcCallerContext = {
	env: Env;
	authToken: string;
};

type ProcedureLike = {
	_def?: {
		procedure?: boolean;
		type?: "query" | "mutation" | "subscription";
		inputs?: unknown[];
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getProcedureInputSchema(
	procedure: ProcedureLike,
): z.ZodTypeAny | null {
	const firstInputParser = procedure._def?.inputs?.[0];
	if (firstInputParser instanceof z.ZodType) {
		return firstInputParser;
	}

	return null;
}

function getZodShape(
	inputSchema: z.ZodTypeAny | null,
): Record<string, z.ZodTypeAny> | null {
	if (!inputSchema) {
		return null;
	}

	if (inputSchema instanceof z.ZodObject) {
		return inputSchema.shape as Record<string, z.ZodTypeAny>;
	}

	return { input: inputSchema };
}

async function invokeCallerProcedure(
	router: AnyRouter,
	path: string,
	input: unknown,
	ctx: TrpcCallerContext,
): Promise<unknown> {
	const caller = router.createCaller(ctx) as Record<string, unknown>;
	const pathSegments = path.split(".");

	let current: unknown = caller;
	for (const segment of pathSegments) {
		current = (current as Record<string, unknown>)[segment];
	}

	if (typeof current !== "function") {
		throw new Error(`tRPC caller path is not invokable: ${path}`);
	}

	return await Promise.resolve(current(input));
}

function stringifyResult(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}

	return JSON.stringify(value, null, 2);
}

export function registerTrpcRouterAsMcpTools(
	server: McpServer,
	router: AnyRouter,
	env: Env,
): void {
	const routerDef = router._def as unknown as Record<string, unknown>;
	const procedureMap = routerDef.procedures as
		| Record<string, unknown>
		| undefined;

	if (!procedureMap) {
		throw new Error("Router has no procedures map");
	}

	const entries = Object.entries(procedureMap);

	for (const [name, proc] of entries) {
		if (typeof proc !== "function") continue;

		const procFn = proc as ProcedureLike;
		if (!procFn._def?.procedure) continue;

		const procType = procFn._def.type;
		if (procType !== "query" && procType !== "mutation") continue;

		const inputSchema = getProcedureInputSchema(procFn);
		const shape = getZodShape(inputSchema);
		const description = `tRPC ${procType}: ${name}`;

		const invoke = async (args: Record<string, unknown>) => {
			const procedureInput =
				inputSchema instanceof z.ZodObject
					? args
					: inputSchema
						? args.input
						: undefined;

			const result = await invokeCallerProcedure(router, name, procedureInput, {
				env,
				authToken: "dev-token",
			});

			return {
				content: [{ type: "text" as const, text: stringifyResult(result) }],
			};
		};

		if (shape) {
			server.tool(name, description, shape, invoke);
		} else {
			server.tool(name, description, async () => invoke({}));
		}
	}
}
