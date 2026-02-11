import { router, protectedProcedure } from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { BuildManifest, TagPayloads } from '@slopcade/shared';
import { ReadinessService } from '@/services/ReadinessService';

export const packageReadinessRouter = router({
  check: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        buildId: z.string(),
        manifest: z.string(),
        artifacts: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let manifest: BuildManifest;
      let artifacts: Partial<TagPayloads>;
      try {
        manifest = JSON.parse(input.manifest) as BuildManifest;
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid manifest JSON',
        });
      }
      try {
        artifacts = JSON.parse(input.artifacts) as Partial<TagPayloads>;
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid artifacts JSON',
        });
      }

      const service = new ReadinessService(ctx.env.DB);
      const state = await service.checkReadiness(
        input.gameId,
        input.buildId,
        manifest,
        artifacts,
      );

      return {
        ready: state.ready,
        errors: state.errors,
        warnings: state.warnings,
        buildId: state.buildId,
        gameId: state.gameId,
        checkedAt: state.checkedAt,
      };
    }),

  get: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        buildId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const service = new ReadinessService(ctx.env.DB);

      const state = input.buildId
        ? await service.getReadiness(input.gameId, input.buildId)
        : await service.getLatestReadiness(input.gameId);

      if (!state) {
        return null;
      }

      return {
        ready: state.ready,
        errors: state.errors,
        warnings: state.warnings,
        buildId: state.buildId,
        gameId: state.gameId,
        checkedAt: state.checkedAt,
      };
    }),
});
