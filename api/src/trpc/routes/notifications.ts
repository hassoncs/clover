import { router, protectedProcedure } from '../index';
import { z } from 'zod';
import { NotificationService } from '@/social/notification-service';

type D1 = import('@cloudflare/workers-types').D1Database;

function getNotificationService(db: D1) { return new NotificationService(db); }

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const svc = getNotificationService(ctx.env.DB);
      return svc.listNotifications(ctx.user.id, input.limit, input.offset);
    }),

  markAsRead: protectedProcedure
    .input(z.object({
      notificationIds: z.array(z.string()).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getNotificationService(ctx.env.DB);
      await svc.markAsRead(ctx.user.id, input.notificationIds);
      return { success: true };
    }),

  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const svc = getNotificationService(ctx.env.DB);
      await svc.markAllAsRead(ctx.user.id);
      return { success: true };
    }),

  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const svc = getNotificationService(ctx.env.DB);
      return svc.getUnreadCount(ctx.user.id);
    }),
});
