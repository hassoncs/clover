import { BRAND_VOICES } from "@slopcade/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ElevenLabsService } from "@/ai/providers/elevenlabs";
import { publicProcedure, router } from "@/trpc/index";

type HowToPlayStep = {
	step: number;
	title: string;
	body: string;
	panelImageUrl: string | null;
};

type PartyGameTemplateRow = {
	id: string;
	brand_id: string;
	title: string;
	emoji: string;
	description: string | null;
	mechanic: string | null;
	content_pack: string;
	min_players: number;
	max_players: number;
	sort_order: number;
	tagline: string | null;
	format_tag: string | null;
	session_length: string | null;
	content_note: string | null;
	thumbnail_url: string | null;
	hero_image_url: string | null;
	how_to_play_steps: string | null;
};

const SELECT_COLUMNS = `
	id, brand_id, title, emoji, description, mechanic, content_pack,
	min_players, max_players, sort_order,
	tagline, format_tag, session_length, content_note,
	thumbnail_url, hero_image_url, how_to_play_steps
`;

function mapRow(row: PartyGameTemplateRow) {
	return {
		id: row.id,
		brandId: row.brand_id,
		title: row.title,
		emoji: row.emoji,
		description: row.description,
		mechanic: row.mechanic,
		contentPack: row.content_pack,
		minPlayers: row.min_players,
		maxPlayers: row.max_players,
		sortOrder: row.sort_order,
		tagline: row.tagline,
		formatTag: row.format_tag,
		sessionLength: row.session_length,
		contentNote: row.content_note,
		thumbnailUrl: row.thumbnail_url,
		heroImageUrl: row.hero_image_url,
		howToPlaySteps: row.how_to_play_steps
			? (JSON.parse(row.how_to_play_steps) as HowToPlayStep[])
			: null,
	};
}

export const partyTemplatesRouter = router({
	listByBrand: publicProcedure
		.input(z.object({ brandId: z.string() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.env.DB.prepare(
				`SELECT ${SELECT_COLUMNS}
				 FROM party_game_templates
				 WHERE brand_id = ? AND is_active = 1
				 ORDER BY sort_order ASC`,
			)
				.bind(input.brandId)
				.all<PartyGameTemplateRow>();

			return (result.results ?? []).map(mapRow);
		}),

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const row = await ctx.env.DB.prepare(
				`SELECT ${SELECT_COLUMNS}
				 FROM party_game_templates
				 WHERE id = ? AND is_active = 1`,
			)
				.bind(input.id)
				.first<PartyGameTemplateRow>();

			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Game template not found",
				});
			}

			return mapRow(row);
		}),

	generateNarration: publicProcedure
		.input(
			z.object({
				text: z.string().min(1).max(1000),
				brand: z.string().default("amen"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.env.ELEVENLABS_API_KEY) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "TTS not configured",
				});
			}

			const brandConfig = BRAND_VOICES[input.brand];
			if (!brandConfig) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Unknown brand: ${input.brand}`,
				});
			}

			const service = new ElevenLabsService(ctx.env.ELEVENLABS_API_KEY);
			const result = await service.generateVoice({
				text: input.text,
				voiceId: brandConfig.announcer.voiceId,
				modelId: brandConfig.announcer.model,
				stability: brandConfig.announcer.settings.stability,
				similarityBoost: brandConfig.announcer.settings.similarityBoost,
				style: brandConfig.announcer.settings.style,
			});

			const assetId = crypto.randomUUID();
			const r2Key = `audio/narration/${assetId}.mp3`;

			await ctx.env.ASSETS.put(r2Key, result.audio, {
				httpMetadata: { contentType: result.contentType },
				customMetadata: {
					type: "narration",
					text: input.text,
					brand: input.brand,
					generatedAt: new Date().toISOString(),
				},
			});

			return {
				assetId,
				url: `/assets/${r2Key}`,
				contentType: result.contentType,
				durationSeconds: result.durationSeconds,
			};
		}),
});
