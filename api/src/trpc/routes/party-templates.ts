import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "@/trpc/index";

export const partyTemplatesRouter = router({
	listByBrand: publicProcedure
		.input(z.object({ brandId: z.string() }))
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;

			const result = await db
				.prepare(
					`SELECT id, brand_id, title, emoji, description, mechanic, content_pack, min_players, max_players, sort_order
					 FROM party_game_templates
					 WHERE brand_id = ? AND is_active = 1
					 ORDER BY sort_order ASC`,
				)
				.bind(input.brandId)
				.all<{
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
				}>();

			return (result.results ?? []).map((row) => ({
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
			}));
		}),

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;

			const row = await db
				.prepare(
					`SELECT id, brand_id, title, emoji, description, mechanic, content_pack, min_players, max_players, sort_order
					 FROM party_game_templates
					 WHERE id = ? AND is_active = 1`,
				)
				.bind(input.id)
				.first<{
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
				}>();

			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Game template not found",
				});
			}

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
			};
		}),
});
