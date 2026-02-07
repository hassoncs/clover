import { getAssetUrl } from '@slopcade/shared';
import { createWorkersAdapters as createWorkersAdaptersImpl } from '@/ai/pipeline/adapters/workers'
import type { EntityType } from '@/ai/assets'
import type { ThemePlannerInput } from '@/ai/pipeline/theme-planner'
import type { ThemePlan } from '@/ai/pipeline/theme-plan'
import type { Env } from '../../context'
import type {
  ThemeRow,
  GameAssetRow,
  AssetPackRow,
  PackEntryRow,
  GenerationJobRow,
  GenerationTaskRow,
} from './types'

export const createWorkersAdapters = (env: Env) => createWorkersAdaptersImpl(env, env.ASSETS);

const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const LOG_LEVELS: Record<string, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

export function shouldLog(level: string): boolean {
  return (LOG_LEVELS[level] ?? 1) >= (LOG_LEVELS[LOG_LEVEL] ?? 1);
}

export function jobLog(level: string, jobId: string, taskId: string | null, message: string): void {
  if (shouldLog(level)) {
    const context = taskId ? `[job:${jobId.slice(0,8)}] [task:${taskId.slice(0,8)}]` : `[job:${jobId.slice(0,8)}]`;
    const formatted = `[AssetGen] [${level}] ${context} ${message}`;
    if (level === 'ERROR') console.error(formatted);
    else if (level === 'WARN') console.warn(formatted);
    else console.log(formatted);
  }
}

export function resolveAssetUrl(r2Key: string, assetHost: string | undefined): string {
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

export function toClientAsset(row: GameAssetRow, assetHost: string | undefined) {
  return {
    id: row.id,
    ownerGameId: row.owner_game_id,
    source: row.source as 'generated' | 'uploaded',
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

export function toClientPack(row: AssetPackRow) {
  return {
    id: row.id,
    baseGameId: row.base_game_id,
    name: row.name,
    description: row.description,
    themeId: row.theme_id,
    creatorUserId: row.creator_user_id,
    isComplete: row.is_complete === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function toClientEntry(row: PackEntryRow) {
  return {
    id: row.id,
    packId: row.pack_id,
    templateId: row.template_id,
    assetId: row.asset_id,
    placement: row.placement_json ? JSON.parse(row.placement_json) : undefined,
  };
}

export function toClientJob(row: GenerationJobRow) {
  return {
    id: row.id,
    gameId: row.game_id,
    packId: row.pack_id,
    themeId: row.theme_id,
    status: row.status as 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled',
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
    templateId: row.template_id,
    status: row.status as 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled',
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

export function getTargetDimensions(physicsShape: string, width?: number, height?: number): {
  width: number;
  height: number;
  aspectRatio: string;
} {
  const BASE_SIZE = 512;
  let aspectRatio = 1;

  if (physicsShape === 'box' && width && height) {
    aspectRatio = width / height;
  } else if (physicsShape === 'circle') {
    aspectRatio = 1;
  }

  let targetWidth: number;
  let targetHeight: number;

  if (aspectRatio >= 1) {
    targetWidth = BASE_SIZE;
    targetHeight = Math.round(BASE_SIZE / aspectRatio / 64) * 64;
  } else {
    targetWidth = Math.round(BASE_SIZE * aspectRatio / 64) * 64;
    targetHeight = BASE_SIZE;
  }

  targetWidth = Math.max(64, targetWidth);
  targetHeight = Math.max(64, targetHeight);

  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
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

  for (const [templateId, templatePlan] of Object.entries(existingPlan.templatePlans)) {
    if (!regeneratedSet.has(templateId)) {
      unchangedConceptNames.add(templatePlan.conceptName.toLowerCase());
      unchangedColors.add(templatePlan.silhouetteColor.toUpperCase());
    }
  }

  for (const [templateId, templatePlan] of Object.entries(newPlan.templatePlans)) {
    const conceptLower = templatePlan.conceptName.toLowerCase();
    const colorUpper = templatePlan.silhouetteColor.toUpperCase();

    if (unchangedConceptNames.has(conceptLower)) {
      warnings.push(
        `Template "${templateId}" has concept name "${templatePlan.conceptName}" which duplicates an unchanged template`
      );
    }

    if (unchangedColors.has(colorUpper)) {
      warnings.push(
        `Template "${templateId}" has silhouette color "${templatePlan.silhouetteColor}" which duplicates an unchanged template`
      );
    }
  }

  return { warnings };
}

export function buildPlannerInput(
  definition: { templates?: Record<string, any> },
  templateIds: string[],
  theme: string,
  style?: string,
  gameTitle?: string,
): ThemePlannerInput {
  const templates = templateIds.map((templateId) => {
    const template = definition.templates?.[templateId];
    const physics = template?.physics;
    const tags = template?.tags ?? [];
    const whatDescription = template?.whatDescription;

    let entityType: EntityType = 'item';
    if (tags.includes('player') || tags.includes('character')) entityType = 'character';
    else if (tags.includes('enemy')) entityType = 'enemy';
    else if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) entityType = 'platform';
    else if (tags.includes('background')) entityType = 'background';
    else if (tags.includes('ui')) entityType = 'ui';

    const physicsShape: 'box' | 'circle' = physics?.shape === 'circle' ? 'circle' : 'box';

    return {
      templateId,
      whatDescription,
      entityType,
      physicsShape,
      tags,
    };
  });

  return {
    templates,
    theme,
    style,
    gameTitle,
  };
}
