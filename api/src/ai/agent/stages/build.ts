import {
	type DesignDocument,
	DesignDocumentSchema,
} from "@slopcade/shared/types/design";
import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import { generateObject } from "ai";
import type {
	AgentExecutionStageContext,
	AgentExecutionStageResult,
} from "@/ai/agent/execution-engine";
import { createModelForTier, resolveTierConfig } from "@/ai/agent/tier-config";
import { GameDefinitionSchema } from "@/ai/game/schemas";

function stagePrefix(runId: string, stepIndex: number): string {
	return `agent-runs/${runId}/steps/${stepIndex}/build`;
}

function summarizeFrameElementTypes(
	frame: DesignDocument["frames"][number],
): string {
	const counts = frame.elements.reduce<
		Record<"rect" | "text" | "image", number>
	>(
		(acc, element) => {
			acc[element.type] += 1;
			return acc;
		},
		{ rect: 0, text: 0, image: 0 },
	);

	const typeSummary = (["rect", "text", "image"] as const)
		.filter((type) => counts[type] > 0)
		.map((type) => `${counts[type]} ${type}`)
		.join(", ");

	return `Frame "${frame.title}": ${frame.elements.length} elements${
		typeSummary ? ` (${typeSummary})` : ""
	}.`;
}

function summarizeDesignDocument(designDocument: DesignDocument): string {
	if (designDocument.frames.length === 0) {
		return "No frames available.";
	}

	return designDocument.frames
		.map((frame) => summarizeFrameElementTypes(frame))
		.join(" ");
}

async function loadDesignReferenceSummary(
	context: AgentExecutionStageContext,
): Promise<string | null> {
	const designArtifactKey = context.previousArtifacts.design;
	if (!designArtifactKey) {
		return null;
	}

	try {
		const designArtifact = await context.env.ASSETS.get(designArtifactKey);
		if (!designArtifact) {
			return null;
		}

		const parsedRaw = JSON.parse(await designArtifact.text());
		const parsedDesign = DesignDocumentSchema.safeParse(parsedRaw);
		if (!parsedDesign.success) {
			return null;
		}

		return summarizeDesignDocument(parsedDesign.data);
	} catch {
		return null;
	}
}

export async function buildStage(
	context: AgentExecutionStageContext,
): Promise<AgentExecutionStageResult> {
	const modelConfig = resolveTierConfig(context.tier);
	const model = createModelForTier(modelConfig, context.env);

	const planningDoc =
		context.planningDoc ??
		context.context.planningDocJson ??
		"No planning doc available";
	const designReferenceSummary = await loadDesignReferenceSummary(context);

	try {
		const generated = await generateObject({
			model,
			schema: GameDefinitionSchema,
			system:
				"You produce valid Slopcade GameDefinition JSON. Keep output constrained to playable 2D game behavior. Treat any design reference as guidance only and never include design schema fields in the GameDefinition output.",
			prompt: [
				`Game title: ${context.context.gameTitle}`,
				`Game description: ${context.context.gameDescription ?? "none"}`,
				`Planning doc:\n${planningDoc}`,
				...(designReferenceSummary
					? [
							`Design reference (approved screens/frames):\n${designReferenceSummary}\nUse this for layout and presentation inspiration only. Do not include design document fields in the runtime output.`,
						]
					: []),
			].join("\n\n"),
			temperature: 0.4,
		});

		const parsed = GameDefinitionSchema.safeParse(generated.object);
		if (!parsed.success) {
			return {
				status: "failed",
				failureReason: "VALIDATION_FAILED",
				errorMessage: `VALIDATION_FAILED: ${parsed.error.issues[0]?.message ?? "invalid game definition output"}`,
				checkpoint: {
					stage: "build",
					validationIssues: parsed.error.issues.map((issue) => issue.message),
				},
				costMicros: modelConfig.estimatedCostPerStepMicros,
				inputTokens: generated.usage.inputTokens ?? 0,
				outputTokens: generated.usage.outputTokens ?? 0,
				provider: modelConfig.primary.provider,
				model: modelConfig.primary.model,
			};
		}

		const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.json`;
		await context.env.ASSETS.put(
			outputArtifactKey,
			JSON.stringify(parsed.data),
			{
				httpMetadata: { contentType: "application/json" },
			},
		);

		return {
			status: "succeeded",
			outputArtifactKey,
			costMicros: modelConfig.estimatedCostPerStepMicros,
			inputTokens: generated.usage.inputTokens ?? 0,
			outputTokens: generated.usage.outputTokens ?? 0,
			provider: modelConfig.primary.provider,
			model: modelConfig.primary.model,
			checkpoint: {
				stage: "build",
				metadata: {
					id: (parsed.data as GameDefinition).metadata.id,
					title: (parsed.data as GameDefinition).metadata.title,
				},
			},
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "build stage failed";
		return {
			status: "failed",
			failureReason: "MODEL_ERROR",
			errorMessage: `MODEL_ERROR: ${message}`,
			checkpoint: {
				stage: "build",
				error: message,
			},
			costMicros: 0,
			inputTokens: 0,
			outputTokens: 0,
			provider: modelConfig.primary.provider,
			model: modelConfig.primary.model,
		};
	}
}
