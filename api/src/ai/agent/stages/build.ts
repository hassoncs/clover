import {
	type DesignDocument,
	DesignDocumentSchema,
	type DesignElement,
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

const DESIGN_ELEMENT_TYPES: DesignElement["type"][] = [
	"rect",
	"text",
	"image",
	"circle",
	"line",
	"path",
	"group",
];

function summarizeFrameElementTypes(
	frame: DesignDocument["frames"][number],
): string {
	const counts = frame.elements.reduce<
		Partial<Record<DesignElement["type"], number>>
	>((acc, element) => {
		acc[element.type] = (acc[element.type] || 0) + 1;
		return acc;
	}, {});

	const typeSummary = DESIGN_ELEMENT_TYPES.filter(
		(type) => (counts[type] ?? 0) > 0,
	)
		.map((type) => `${counts[type]} ${type}`)
		.join(", ");

	return `Frame "${frame.title}": ${frame.elements.length} elements${
		typeSummary ? ` (${typeSummary})` : ""
	}.`;
}

function summarizeFrameVisualIntent(
	frame: DesignDocument["frames"][number],
): string {
	const opacityCount = frame.elements.filter(
		(element) => typeof element.opacity === "number" && element.opacity < 1,
	).length;
	const shadowCount = frame.elements.filter((element) => element.shadow).length;
	const gradientCount = frame.elements.filter(
		(element) => element.gradient,
	).length;

	const cues: string[] = [];
	if (opacityCount > 0) {
		cues.push(
			`${opacityCount} element${opacityCount === 1 ? "" : "s"} use opacity to signal layering/depth`,
		);
	}
	if (shadowCount > 0) {
		cues.push(
			`${shadowCount} element${shadowCount === 1 ? "" : "s"} use shadows to emphasize hierarchy`,
		);
	}
	if (gradientCount > 0) {
		cues.push(
			`${gradientCount} element${gradientCount === 1 ? "" : "s"} use gradients for mood and focal contrast`,
		);
	}

	const hasCircle = frame.elements.some((element) => element.type === "circle");
	const hasLine = frame.elements.some((element) => element.type === "line");
	const hasPath = frame.elements.some((element) => element.type === "path");
	const hasGroup = frame.elements.some((element) => element.type === "group");

	if (hasCircle) {
		cues.push("circle elements suggest rounded focal motifs");
	}
	if (hasLine) {
		cues.push(
			"line elements indicate separators, trajectories, or directional cues",
		);
	}
	if (hasPath) {
		cues.push(
			"path elements indicate custom vector silhouettes or decorative forms",
		);
	}
	if (hasGroup) {
		cues.push(
			"group elements indicate composite clusters that should read as one unit",
		);
	}

	return cues.length > 0
		? `Visual intent: ${cues.join("; ")}.`
		: "Visual intent: rely on structure and spacing from the frame layout.";
}

function summarizeDesignDocument(designDocument: DesignDocument): string {
	if (designDocument.frames.length === 0) {
		return "No frames available.";
	}

	return designDocument.frames
		.map(
			(frame) =>
				`${summarizeFrameElementTypes(frame)} ${summarizeFrameVisualIntent(frame)}`,
		)
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
