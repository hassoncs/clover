import {
  router,
  publicProcedure,
  installedProcedure,
} from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { TileSheetSchema, TileMapSchema, SpriteStyleSchema } from '../../ai/schemas';

export const tilesRouter = router({
  generateSheet: installedProcedure
    .input(
      z.object({
        prompt: z.string().min(3).max(200),
        tileSize: z.number().int().positive().default(32),
        columns: z.number().int().positive().default(8),
        rows: z.number().int().positive().default(4),
        style: SpriteStyleSchema.default('pixel'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Tile sheet generation not yet implemented. Use the example tile sheet for now.',
      });
    }),

  generateMap: installedProcedure
    .input(
      z.object({
        prompt: z.string().min(3).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Tile map generation not yet implemented. Use manual tile map definitions for now.',
      });
    }),

  updateTile: installedProcedure
    .input(
      z.object({
        tileMapId: z.string(),
        layerId: z.string(),
        index: z.number().int().nonnegative(),
        tileIndex: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Tile update not yet implemented.',
      });
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'Tile listing not yet implemented.',
    });
  }),
});
