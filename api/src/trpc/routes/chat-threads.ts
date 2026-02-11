import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { ChatEventStore } from '@/chat/chat-event-store';

import { protectedProcedure, router } from '../index';

export const chatThreadsRouter = router({
  createThread: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.env.DB
        .prepare('SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL')
        .bind(input.gameId)
        .first<{ id: string; user_id: string }>();

      if (!game) throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      if (game.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your game' });
      }

      const id = crypto.randomUUID();
      const now = Date.now();

      await ctx.env.DB
        .prepare(
          `INSERT INTO chat_threads (id, user_id, game_id, title, status, last_event_seq, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', 0, ?, ?)`
        )
        .bind(id, ctx.user.id, input.gameId, input.title ?? null, now, now)
        .run();

      return { threadId: id, gameId: input.gameId, createdAt: now };
    }),

  listThreads: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = 'SELECT * FROM chat_threads WHERE user_id = ? AND status = ?';
      const values: Array<string | number> = [ctx.user.id, 'active'];

      if (input.gameId) {
        query += ' AND game_id = ?';
        values.push(input.gameId);
      }

      query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
      values.push(input.limit, input.offset);

      const result = await ctx.env.DB.prepare(query).bind(...values).all<{
        id: string;
        user_id: string;
        game_id: string;
        title: string | null;
        status: string;
        parent_thread_id: string | null;
        parent_event_seq: number | null;
        last_event_seq: number;
        created_at: number;
        updated_at: number;
      }>();

      return {
        threads: result.results.map((row) => ({
          id: row.id,
          userId: row.user_id,
          gameId: row.game_id,
          title: row.title,
          status: row.status,
          parentThreadId: row.parent_thread_id,
          parentEventSeq: row.parent_event_seq,
          lastEventSeq: row.last_event_seq,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    }),

  getThread: protectedProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.env.DB
        .prepare('SELECT * FROM chat_threads WHERE id = ? AND user_id = ?')
        .bind(input.threadId, ctx.user.id)
        .first<{
          id: string;
          user_id: string;
          game_id: string;
          title: string | null;
          status: string;
          last_event_seq: number;
          created_at: number;
          updated_at: number;
        }>();

      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' });

      return {
        id: row.id,
        userId: row.user_id,
        gameId: row.game_id,
        title: row.title,
        status: row.status,
        lastEventSeq: row.last_event_seq,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),

  appendUserMessage: protectedProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        text: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.env.DB
        .prepare('SELECT id, user_id FROM chat_threads WHERE id = ? AND user_id = ?')
        .bind(input.threadId, ctx.user.id)
        .first();

      if (!thread) throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' });

      const store = new ChatEventStore(ctx.env.DB);
      const event = await store.appendEvent({
        threadId: input.threadId,
        eventType: 'user_message',
        role: 'user',
        payload: { version: 1, type: 'user_message', text: input.text },
      });

      return event;
    }),

  getEvents: protectedProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        afterSeq: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(500).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const thread = await ctx.env.DB
        .prepare('SELECT id FROM chat_threads WHERE id = ? AND user_id = ?')
        .bind(input.threadId, ctx.user.id)
        .first();

      if (!thread) throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' });

      const store = new ChatEventStore(ctx.env.DB);
      const events = await store.getEventsAfter(input.threadId, input.afterSeq, input.limit);

      return { events };
    }),

  listWorkspaceFiles: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const game = await ctx.env.DB
        .prepare('SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL')
        .bind(input.gameId)
        .first<{ id: string; user_id: string }>();

      if (!game || game.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const prefix = `games/${input.gameId}/workspace/`;
      const listed = await ctx.env.ASSETS.list({ prefix });

      return listed.objects.map(obj => ({
        filename: obj.key.slice(prefix.length),
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
      }));
    }),

  readWorkspaceFile: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        filename: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const game = await ctx.env.DB
        .prepare('SELECT id, user_id FROM games WHERE id = ? AND deleted_at IS NULL')
        .bind(input.gameId)
        .first<{ id: string; user_id: string }>();

      if (!game || game.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const key = `games/${input.gameId}/workspace/${input.filename}`;
      const obj = await ctx.env.ASSETS.get(key);
      if (!obj) return { exists: false, content: null };
      return { exists: true, content: await obj.text() };
    }),

  debugConversation: protectedProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const thread = await ctx.env.DB
        .prepare('SELECT id, game_id FROM chat_threads WHERE id = ? AND user_id = ?')
        .bind(input.threadId, ctx.user.id)
        .first<{ id: string; game_id: string }>();

      if (!thread) throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' });

      const chatEvents = await ctx.env.DB
        .prepare('SELECT seq, event_type, role, content_json, run_id, created_at FROM chat_events WHERE thread_id = ? ORDER BY seq ASC')
        .bind(input.threadId)
        .all<{ seq: number; event_type: string; role: string | null; content_json: string; run_id: string | null; created_at: number }>();

      const runs = await ctx.env.DB
        .prepare('SELECT id, status, tier, error_message, current_step_index, total_steps, created_at, finished_at FROM agent_runs WHERE thread_id = ? ORDER BY created_at ASC')
        .bind(input.threadId)
        .all<{ id: string; status: string; tier: string; error_message: string | null; current_step_index: number; total_steps: number; created_at: number; finished_at: number | null }>();

      const agentEvents = await ctx.env.DB
        .prepare('SELECT run_id, seq, event_type, payload_json, created_at FROM agent_events WHERE run_id IN (SELECT id FROM agent_runs WHERE thread_id = ?) ORDER BY created_at ASC')
        .bind(input.threadId)
        .all<{ run_id: string; seq: number; event_type: string; payload_json: string; created_at: number }>();

      return {
        threadId: input.threadId,
        gameId: thread.game_id,
        chatEvents: chatEvents.results.map(e => ({
          seq: e.seq,
          eventType: e.event_type,
          role: e.role,
          payload: JSON.parse(e.content_json),
          runId: e.run_id,
          createdAt: e.created_at,
        })),
        runs: runs.results.map(r => ({
          id: r.id,
          status: r.status,
          tier: r.tier,
          errorMessage: r.error_message,
          currentStepIndex: r.current_step_index,
          totalSteps: r.total_steps,
          createdAt: r.created_at,
          finishedAt: r.finished_at,
        })),
        agentEvents: agentEvents.results.map(e => ({
          runId: e.run_id,
          seq: e.seq,
          eventType: e.event_type,
          payload: JSON.parse(e.payload_json),
          createdAt: e.created_at,
        })),
      };
    }),
});
