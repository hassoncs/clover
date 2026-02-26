import {
	type DesignDocument,
	DesignDocumentSchema,
} from "@slopcade/shared/types/design";
import { generateObject } from "ai";

import type {
	AgentExecutionStageContext,
	AgentExecutionStageResult,
} from "@/ai/agent/execution-engine";
import { createModelForTier, resolveTierConfig } from "@/ai/agent/tier-config";

type DesignStageCheckpoint = Record<string, unknown> & {
	stage: "design";
	artifact: string;
	designVersion: "1.0";
	designFrameCount: number;
};

function stagePrefix(runId: string, stepIndex: number): string {
	return `agent-runs/${runId}/steps/${stepIndex}/design`;
}

const MAX_VALIDATION_RETRIES = 2;

function collectValidationIssues(design: DesignDocument): string[] {
	if (design.frames.length === 0) {
		return ["design must include at least one frame"];
	}

	if (!design.frames.some((frame) => frame.elements.length > 0)) {
		return ["design must include at least one element across frames"];
	}

	return [];
}

export async function designStage(
	context: AgentExecutionStageContext,
): Promise<AgentExecutionStageResult> {
	const modelConfig = resolveTierConfig(context.tier);
	const model = createModelForTier(modelConfig, context.env);

	const planningDoc =
		context.planningDoc ??
		context.context.planningDocJson ??
		"No planning doc available.";

	let latestInputTokens = 0;
	let latestOutputTokens = 0;
	let latestValidationIssues: string[] = [];

	for (let attempt = 1; attempt <= MAX_VALIDATION_RETRIES; attempt += 1) {
		console.log(
			JSON.stringify({
				event: "design.attempt.start",
				attempt,
				runId: context.runId,
				stepIndex: context.stepIndex,
			}),
		);

		try {
			const generated = await generateObject({
				model,
				schema: DesignDocumentSchema,
				system:
					"You generate valid Slopcade design documents for design.json. Output practical screen/frame wireframes that map to the game concept and include drawable elements.",
				prompt: [
					`Game title: ${context.context.gameTitle}`,
					`Game description: ${context.context.gameDescription ?? "none"}`,
					`Planning artifact:\n${planningDoc}`,
					"Return a DesignDocument JSON with version 1.0, metadata matching the provided game id/title, and frames representing key screens or scenes.",
					"Each frame must include positioned elements using only rect, text, or image types with plausible dimensions and zIndex values.",
					"The output must include at least one frame and at least one element.",
				].join("\n\n"),
				temperature: 0.3,
			});

			latestInputTokens = generated.usage.inputTokens ?? 0;
			latestOutputTokens = generated.usage.outputTokens ?? 0;

			const parsed = DesignDocumentSchema.safeParse(generated.object);
			if (!parsed.success) {
				latestValidationIssues = parsed.error.issues.map(
					(issue) => issue.path.join(".") || issue.message,
				);
				console.log(
					JSON.stringify({
						event: "design.validation.failed",
						attempt,
						runId: context.runId,
						stepIndex: context.stepIndex,
						issues: latestValidationIssues,
					}),
				);
				continue;
			}

			const qualityIssues = collectValidationIssues(parsed.data);
			if (qualityIssues.length > 0) {
				latestValidationIssues = qualityIssues;
				console.log(
					JSON.stringify({
						event: "design.validation.failed",
						attempt,
						runId: context.runId,
						stepIndex: context.stepIndex,
						issues: latestValidationIssues,
					}),
				);
				continue;
			}

			const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.json`;
			await context.env.ASSETS.put(
				outputArtifactKey,
				JSON.stringify(parsed.data),
				{
					httpMetadata: { contentType: "application/json" },
				},
			);

			const totalElementCount = parsed.data.frames.reduce(
				(sum, frame) => sum + frame.elements.length,
				0,
			);

			console.log(
				JSON.stringify({
					event: "design.succeeded",
					runId: context.runId,
					stepIndex: context.stepIndex,
					frameCount: parsed.data.frames.length,
					elementCount: totalElementCount,
				}),
			);

			const checkpoint: DesignStageCheckpoint = {
				stage: "design",
				artifact: outputArtifactKey,
				designVersion: parsed.data.version,
				designFrameCount: parsed.data.frames.length,
			};

			return {
				status: "succeeded",
				outputArtifactKey,
				costMicros: modelConfig.estimatedCostPerStepMicros,
				inputTokens: latestInputTokens,
				outputTokens: latestOutputTokens,
				provider: modelConfig.primary.provider,
				model: modelConfig.primary.model,
				checkpoint,
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "design stage failed";
			console.log(
				JSON.stringify({
					event: "design.model.error",
					attempt,
					runId: context.runId,
					stepIndex: context.stepIndex,
					error: message,
				}),
			);
			return {
				status: "failed",
				failureReason: "MODEL_ERROR",
				errorMessage: `MODEL_ERROR: ${message}`,
				checkpoint: {
					stage: "design",
					failureReason: "MODEL_ERROR",
					error: message,
				},
				costMicros: 0,
				inputTokens: latestInputTokens,
				outputTokens: latestOutputTokens,
				provider: modelConfig.primary.provider,
				model: modelConfig.primary.model,
			};
		}
	}

	return {
		status: "failed",
		failureReason: "VALIDATION_FAILED",
		errorMessage: `VALIDATION_FAILED: ${latestValidationIssues[0] ?? "invalid design output"}`,
		checkpoint: {
			stage: "design",
			failureReason: "VALIDATION_FAILED",
			validationIssues: latestValidationIssues,
			retries: MAX_VALIDATION_RETRIES,
		},
		costMicros: modelConfig.estimatedCostPerStepMicros,
		inputTokens: latestInputTokens,
		outputTokens: latestOutputTokens,
		provider: modelConfig.primary.provider,
		model: modelConfig.primary.model,
	};
}
