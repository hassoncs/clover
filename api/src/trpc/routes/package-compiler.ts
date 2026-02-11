import { router, protectedProcedure } from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { PackageCompiler } from '@/services/PackageCompiler';
import { R2WorkspaceReader } from '@/services/R2WorkspaceReader';
import { BuildArtifactWriter } from '@/services/BuildArtifactWriter';
import { ReadinessService } from '@/services/ReadinessService';
import type { TagPayloads } from '@slopcade/shared';

export const packageCompilerRouter = router({
  compile: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.env.DB
        .prepare('SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL')
        .bind(input.gameId)
        .first<{ id: string; user_id: string }>();

      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }
      
      if (game.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your game' });
      }

      const reader = new R2WorkspaceReader(ctx.env.ASSETS);
      const writer = new BuildArtifactWriter(ctx.env.ASSETS);
      const compiler = new PackageCompiler(reader, writer);

      const result = await compiler.compile(input.gameId);

      const readinessService = new ReadinessService(ctx.env.DB);
      
      const artifacts: Partial<TagPayloads> = {};
      if (result.artifactData) {
        for (const artifact of result.artifactData) {
          // @ts-expect-error - TagPayloads keys are TagGroup, but TS might complain about indexing with string
          artifacts[artifact.tag] = artifact.data;
        }
      }

      await readinessService.checkReadiness(
        input.gameId,
        result.buildId,
        result.manifest,
        artifacts,
      );

      return {
        success: result.success,
        buildId: result.buildId,
        diagnostics: result.diagnostics,
      };
    }),
});
