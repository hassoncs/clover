import { z } from "zod";

export interface ThemeRow {
	id: string;
	name: string;
	prompt_modifier: string;
	thumbnail_url: string | null;
	creator_user_id: string | null;
	is_public: number;
	created_at: number;
	updated_at: number | null;
	deleted_at: number | null;
}

export interface GameAssetRow {
	id: string;
	owner_game_id: string | null;
	source: string;
	r2_key: string;
	width: number | null;
	height: number | null;
	theme_id: string | null;
	compiled_prompt: string | null;
	model_id: string | null;
	created_at: number;
	deleted_at: number | null;
}

export interface AssetPackRow {
	id: string;
	base_game_id: string;
	name: string;
	description: string | null;
	theme_id: string | null;
	creator_user_id: string | null;
	is_complete: number;
	created_at: number;
	updated_at: number | null;
	deleted_at: number | null;
}

export interface GameRowForAssets {
	id: string;
	base_game_id: string | null;
	definition: string;
}

export interface PackEntryRow {
	id: string;
	pack_id: string;
	template_id: string;
	asset_id: string;
	placement_json: string | null;
}

export interface GenerationJobRow {
	id: string;
	game_id: string;
	pack_id: string;
	theme_id: string | null;
	status: string;
	style: string | null;
	theme_plan_json: string | null;
	created_at: number;
	started_at: number | null;
	finished_at: number | null;
}

export interface GenerationTaskRow {
	id: string;
	job_id: string;
	template_id: string;
	status: string;
	compiled_prompt: string | null;
	model_id: string | null;
	target_width: number | null;
	target_height: number | null;
	asset_id: string | null;
	error_message: string | null;
	scenario_request_id: string | null;
	created_at: number;
	started_at: number | null;
	finished_at: number | null;
}

export interface RemixRow {
	id: string;
	base_game_id: string;
	name: string;
	description: string | null;
	creator_user_id: string | null;
	variable_overrides_json: string | null;
	asset_overrides_json: string | null;
	shader_param_overrides_json: string | null;
	sound_overrides_json: string | null;
	theme_id: string | null;
	theme_prompt: string | null;
	style: string | null;
	is_complete: number;
	thumbnail_url: string | null;
	created_at: number;
	updated_at: number | null;
	deleted_at: number | null;
}

export const assetSourceSchema = z.enum(["generated", "uploaded"]);

export const placementSchema = z.object({
	scale: z.number().default(1),
	offsetX: z.number().default(0),
	offsetY: z.number().default(0),
	anchor: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const promptDefaultsSchema = z.object({
	themeId: z.string().optional(),
	themePrompt: z.string().optional(),
	styleOverride: z.string().optional(),
	modelId: z.string().optional(),
	removeBackground: z.boolean().optional(),
	strength: z.number().min(0.1).max(0.99).optional(),
	guidance: z.number().min(2).max(12).optional(),
	seed: z.string().optional(),
	componentType: z
		.enum([
			"button",
			"checkbox",
			"radio",
			"slider",
			"panel",
			"progress_bar",
			"scroll_bar_h",
			"scroll_bar_v",
			"tab_bar",
			"list_item",
			"dropdown",
			"toggle_switch",
		])
		.optional(),
	states: z
		.array(
			z.enum([
				"normal",
				"hover",
				"pressed",
				"disabled",
				"focus",
				"selected",
				"unselected",
			]),
		)
		.optional(),
	baseResolution: z.number().min(64).max(1024).optional(),
});
