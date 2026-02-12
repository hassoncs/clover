import { getAssetUrl } from "@slopcade/shared";
import type { EntityType } from "@/ai/assets";
import { createWorkersAdapters as createWorkersAdaptersImpl } from "@/ai/pipeline/adapters/workers";
import type { ThemePlan } from "@/ai/pipeline/theme-plan";
import type { ThemePlannerInput } from "@/ai/pipeline/theme-planner";
import type { Env } from "../../context";
import type {
	GameAssetRow,
	GenerationJobRow,
	GenerationTaskRow,
	RemixRow,
	ThemeRow,
} from "./types";

export const createWorkersAdapters = (env: Env) =>
	createWorkersAdaptersImpl(env, env.ASSETS);

const LOG_LEVEL = process.env.LOG_LEVEL || "INFO";
const LOG_LEVELS: Record<string, number> = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
};

export function shouldLog(level: string): boolean {
	return (LOG_LEVELS[level] ?? 1) >= (LOG_LEVELS[LOG_LEVEL] ?? 1);
}

export function jobLog(
	level: string,
	jobId: string,
	taskId: string | null,
	message: string,
): void {
	if (shouldLog(level)) {
		const context = taskId
			? `[job:${jobId.slice(0, 8)}] [task:${taskId.slice(0, 8)}]`
			: `[job:${jobId.slice(0, 8)}]`;
		const formatted = `[AssetGen] [${level}] ${context} ${message}`;
		if (level === "ERROR") console.error(formatted);
		else if (level === "WARN") console.warn(formatted);
		else console.log(formatted);
	}
}

export function resolveAssetUrl(
	r2Key: string,
	assetHost: string | undefined,
): string {
	if (!assetHost) {
		return `/assets/${r2Key}`;
	}
	return getAssetUrl(r2Key, assetHost);
}

export function toClientTheme(row: ThemeRow) {
	return {
		id: row.id,
		name: row.name,
		promptModifier: row.prompt_modifier,
		thumbnailUrl: row.thumbnail_url,
		creatorUserId: row.creator_user_id,
		isPublic: Boolean(row.is_public),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function toClientAsset(
	row: GameAssetRow,
	assetHost: string | undefined,
) {
	return {
		id: row.id,
		ownerGameId: row.owner_game_id,
		source: row.source as "generated" | "uploaded",
		r2Key: row.r2_key,
		imageUrl: resolveAssetUrl(row.r2_key, assetHost),
		width: row.width,
		height: row.height,
		themeId: row.theme_id,
		compiledPrompt: row.compiled_prompt,
		modelId: row.model_id,
		createdAt: row.created_at,
		deletedAt: row.deleted_at,
	};
}

export function toClientJob(row: GenerationJobRow) {
	return {
		id: row.id,
		gameId: row.game_id,
		remixId: row.remix_id,
		themeId: row.theme_id,
		status: row.status as
			| "queued"
			| "running"
			| "succeeded"
			| "failed"
			| "canceled",
		style: row.style,
		themePlanJson: row.theme_plan_json,
		createdAt: row.created_at,
		startedAt: row.started_at,
		finishedAt: row.finished_at,
	};
}

export function toClientTask(row: GenerationTaskRow) {
	return {
		id: row.id,
		jobId: row.job_id,
		prefabId: row.template_id,
		status: row.status as
			| "queued"
			| "running"
			| "succeeded"
			| "failed"
			| "canceled",
		compiledPrompt: row.compiled_prompt,
		modelId: row.model_id,
		targetWidth: row.target_width,
		targetHeight: row.target_height,
		assetId: row.asset_id,
		errorMessage: row.error_message,
		scenarioRequestId: row.scenario_request_id,
		createdAt: row.created_at,
		startedAt: row.started_at,
		finishedAt: row.finished_at,
	};
}

export function getTargetDimensions(
	physicsShape: string,
	width?: number,
	height?: number,
): {
	width: number;
	height: number;
	aspectRatio: string;
} {
	const BASE_SIZE = 512;
	let aspectRatio = 1;

	if (physicsShape === "box" && width && height) {
		aspectRatio = width / height;
	} else if (physicsShape === "circle") {
		aspectRatio = 1;
	}

	let targetWidth: number;
	let targetHeight: number;

	if (aspectRatio >= 1) {
		targetWidth = BASE_SIZE;
		targetHeight = Math.round(BASE_SIZE / aspectRatio / 64) * 64;
	} else {
		targetWidth = Math.round((BASE_SIZE * aspectRatio) / 64) * 64;
		targetHeight = BASE_SIZE;
	}

	targetWidth = Math.max(64, targetWidth);
	targetHeight = Math.max(64, targetHeight);

	const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
	const divisor = gcd(targetWidth, targetHeight);
	const ratioStr = `${targetWidth / divisor}:${targetHeight / divisor}`;

	return { width: targetWidth, height: targetHeight, aspectRatio: ratioStr };
}

export function checkPartialPlanCoherence(
	newPlan: ThemePlan,
	existingPlan: ThemePlan,
	regeneratedTemplateIds: string[],
): { warnings: string[] } {
	const warnings: string[] = [];
	const regeneratedSet = new Set(regeneratedTemplateIds);

	const unchangedConceptNames = new Set<string>();
	const unchangedColors = new Set<string>();

	for (const [prefabId, prefabPlan] of Object.entries(
		existingPlan.prefabPlans,
	)) {
		if (!regeneratedSet.has(prefabId)) {
			unchangedConceptNames.add(prefabPlan.conceptName.toLowerCase());
			unchangedColors.add(prefabPlan.silhouetteColor.toUpperCase());
		}
	}

	for (const [prefabId, prefabPlan] of Object.entries(newPlan.prefabPlans)) {
		const conceptLower = prefabPlan.conceptName.toLowerCase();
		const colorUpper = prefabPlan.silhouetteColor.toUpperCase();

		if (unchangedConceptNames.has(conceptLower)) {
			warnings.push(
				`Prefab "${prefabId}" has concept name "${prefabPlan.conceptName}" which duplicates an unchanged prefab`,
			);
		}

		if (unchangedColors.has(colorUpper)) {
			warnings.push(
				`Prefab "${prefabId}" has silhouette color "${prefabPlan.silhouetteColor}" which duplicates an unchanged prefab`,
			);
		}
	}

	return { warnings };
}

export function buildPlannerInput(
	definition: { prefabs?: Record<string, any> },
	prefabIds: string[],
	theme: string,
	style?: string,
	gameTitle?: string,
): ThemePlannerInput {
	const prefabs = prefabIds.map((prefabId) => {
		const prefab = definition.prefabs?.[prefabId];
		const physics = prefab?.physics;
		const tags = prefab?.tags ?? [];
		const whatDescription = prefab?.whatDescription;

		let entityType: EntityType = "item";
		if (tags.includes("player") || tags.includes("character"))
			entityType = "character";
		else if (tags.includes("enemy")) entityType = "enemy";
		else if (
			tags.includes("platform") ||
			tags.includes("wall") ||
			tags.includes("ground")
		)
			entityType = "platform";
		else if (tags.includes("background")) entityType = "background";
		else if (tags.includes("ui")) entityType = "ui";

		const physicsShape: "box" | "circle" =
			physics?.shape === "circle" ? "circle" : "box";

		return {
			prefabId,
			whatDescription,
			entityType,
			physicsShape,
			tags,
		};
	});

	return {
		prefabs,
		theme,
		style,
		gameTitle,
	};
}

export interface ParsedAssetOverride {
	assetId: string;
	assetUrl: string;
	placement?: {
		scale?: number;
		offsetX?: number;
		offsetY?: number;
	};
}

export function parseAssetOverrides(
	json: string,
	assetHost: string | undefined,
): Record<string, ParsedAssetOverride> {
	const raw: Record<
		string,
		{
			assetId: string;
			assetUrl: string;
			placement?: { scale?: number; offsetX?: number; offsetY?: number };
		}
	> = JSON.parse(json);
	const result: Record<string, ParsedAssetOverride> = {};

	for (const [templateId, entry] of Object.entries(raw)) {
		result[templateId] = {
			assetId: entry.assetId,
			assetUrl: resolveAssetUrl(entry.assetUrl, assetHost),
			placement: entry.placement,
		};
	}

	return result;
}

export function toClientRemix(row: RemixRow, assetHost: string | undefined) {
	return {
		id: row.id,
		baseGameId: row.base_game_id,
		name: row.name,
		description: row.description,
		creatorUserId: row.creator_user_id,
		overrides: {
			variables: row.variable_overrides_json
				? JSON.parse(row.variable_overrides_json)
				: undefined,
			assets: row.asset_overrides_json
				? parseAssetOverrides(row.asset_overrides_json, assetHost)
				: undefined,
			shaderParams: row.shader_param_overrides_json
				? JSON.parse(row.shader_param_overrides_json)
				: undefined,
			sounds: row.sound_overrides_json
				? JSON.parse(row.sound_overrides_json)
				: undefined,
		},
		themeId: row.theme_id,
		themeName: row.theme_prompt,
		style: row.style,
		isComplete: row.is_complete === 1,
		thumbnailUrl: row.thumbnail_url,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
