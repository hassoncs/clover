import { router, protectedProcedure } from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ReportService } from '@/social/report-service';
import { BlockService, BlockValidationError } from '@/social/block-service';

type D1 = import('@cloudflare/workers-types').D1Database;

function getReportService(db: D1) { return new ReportService(db); }
function getBlockService(db: D1) { return new BlockService(db); }

export const moderationRouter = router({
  report: protectedProcedure
    .input(z.object({
      targetType: z.enum(['game', 'comment', 'user']),
      targetId: z.string(),
      reason: z.enum(['spam', 'inappropriate', 'harassment', 'other']),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getReportService(ctx.env.DB);
      return svc.createReport(
        ctx.user.id,
        input.targetType,
        input.targetId,
        input.reason,
        input.description
      );
    }),

  block: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot block yourself' });
      }
      const svc = getBlockService(ctx.env.DB);
      try {
        return await svc.block(ctx.user.id, input.userId);
      } catch (e) {
        if (e instanceof BlockValidationError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: e.message });
        }
        throw e;
      }
    }),

  unblock: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const svc = getBlockService(ctx.env.DB);
      return svc.unblock(ctx.user.id, input.userId);
    }),

  listBlocked: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const svc = getBlockService(ctx.env.DB);
      return svc.listBlocked(ctx.user.id, input.limit, input.offset);
    }),

  isBlocked: protectedProcedure
    .input(z.object({
      userIds: z.array(z.string()).max(50),
    }))
    .query(async ({ ctx, input }) => {
      const svc = getBlockService(ctx.env.DB);
      return svc.isBlocked(ctx.user.id, input.userIds);
    }),
});
