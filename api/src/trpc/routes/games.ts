import {
  router,
  publicProcedure,
  protectedProcedure,
  installedProcedure,
} from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  generateGame,
  refineGame,
  getAIConfigFromEnv,
  classifyPrompt,
  getClassificationConfidence,
  validateGameDefinition,
  getValidationSummary,
} from '../../ai';

interface GameRow {
  id: string;
  user_id: string | null;
  install_id: string | null;
  title: string;
  description: string | null;
  definition: string;
  thumbnail_url: string | null;
  is_public: number;
  play_count: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function toClientGame(row: GameRow) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    definition: row.definition,
    thumbnailUrl: row.thumbnail_url,
    isPublic: Boolean(row.is_public),
    playCount: row.play_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const gamesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.env.DB.prepare(
      `SELECT * FROM games WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`
    )
      .bind(ctx.user.id)
      .all<GameRow>();

    return result.results.map(toClientGame);
  }),

  listByInstall: installedProcedure.query(async ({ ctx }) => {
    const result = await ctx.env.DB.prepare(
      `SELECT * FROM games WHERE install_id = ? AND user_id IS NULL AND deleted_at IS NULL ORDER BY updated_at DESC`
    )
      .bind(ctx.installId)
      .all<GameRow>();

    return result.results.map(toClientGame);
  }),

  get: installedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.env.DB.prepare(
        `SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`
      )
        .bind(input.id)
        .first<GameRow>();

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const userId = (ctx as any).user?.id ?? null;
      const isOwner = result.user_id === userId || result.install_id === ctx.installId;
      
      if (!result.is_public && !isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      return toClientGame(result);
    }),

  create: installedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        definition: z.string(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const userId = (ctx as any).user?.id ?? null;

      await ctx.env.DB.prepare(
        `INSERT INTO games (id, user_id, install_id, title, description, definition, is_public, play_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
        .bind(
          id,
          userId,
          ctx.installId,
          input.title,
          input.description ?? null,
          input.definition,
          input.isPublic ? 1 : 0,
          now,
          now
        )
        .run();

      return {
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        definition: input.definition,
        thumbnailUrl: null,
        isPublic: input.isPublic,
        playCount: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
    }),

  update: installedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        definition: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.env.DB.prepare(
        `SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`
      )
        .bind(input.id)
        .first<GameRow>();

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const userId = (ctx as any).user?.id;
      const canEdit =
        existing.user_id === userId ||
        (existing.user_id === null && existing.install_id === ctx.installId);

      if (!canEdit) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot edit' });
      }

      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (input.title !== undefined) {
        updates.push('title = ?');
        values.push(input.title);
      }
      if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
      }
      if (input.definition !== undefined) {
        updates.push('definition = ?');
        values.push(input.definition);
      }
      if (input.isPublic !== undefined) {
        updates.push('is_public = ?');
        values.push(input.isPublic ? 1 : 0);
      }

      if (updates.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update',
        });
      }

      const now = Date.now();
      updates.push('updated_at = ?');
      values.push(now);
      values.push(input.id);

      await ctx.env.DB.prepare(
        `UPDATE games SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...values)
        .run();

      return { id: input.id, updatedAt: new Date(now) };
    }),

  delete: installedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.env.DB.prepare(
        `SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`
      )
        .bind(input.id)
        .first<GameRow>();

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const userId = (ctx as any).user?.id;
      const canDelete =
        existing.user_id === userId ||
        (existing.user_id === null && existing.install_id === ctx.installId);

      if (!canDelete) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete' });
      }

      await ctx.env.DB.prepare(`UPDATE games SET deleted_at = ? WHERE id = ?`)
        .bind(Date.now(), input.id)
        .run();

      return { success: true };
    }),

  incrementPlayCount: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.env.DB.prepare(
        `UPDATE games SET play_count = play_count + 1 WHERE id = ? AND deleted_at IS NULL`
      )
        .bind(input.id)
        .run();

      return { success: true };
    }),

  listPublic: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const result = await ctx.env.DB.prepare(
        `SELECT * FROM games WHERE is_public = 1 AND deleted_at IS NULL ORDER BY play_count DESC, created_at DESC LIMIT ? OFFSET ?`
      )
        .bind(limit, offset)
        .all<GameRow>();

      return result.results.map(toClientGame);
    }),

  generate: installedProcedure
    .input(
      z.object({
        prompt: z.string().min(5).max(500),
        saveToLibrary: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const aiConfig = getAIConfigFromEnv(ctx.env);
      if (!aiConfig) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI generation not configured. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY.',
        });
      }

      const result = await generateGame(input.prompt, aiConfig, {
        maxRetries: 2,
        temperature: 0.7,
      });

      if (!result.success || !result.game) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message ?? 'Failed to generate game',
          cause: result.error,
        });
      }

      let savedGame = null;

      if (input.saveToLibrary) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const userId = (ctx as any).user?.id ?? null;
        const definition = JSON.stringify(result.game);

        await ctx.env.DB.prepare(
          `INSERT INTO games (id, user_id, install_id, title, description, definition, is_public, play_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
        )
          .bind(
            id,
            userId,
            ctx.installId,
            result.game.metadata.title,
            result.game.metadata.description ?? input.prompt,
            definition,
            now,
            now
          )
          .run();

        savedGame = {
          id,
          userId,
          title: result.game.metadata.title,
          description: result.game.metadata.description ?? input.prompt,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        };
      }

      return {
        game: result.game,
        intent: result.intent,
        validation: result.validationResult
          ? {
              valid: result.validationResult.valid,
              errorCount: result.validationResult.errors.length,
              warningCount: result.validationResult.warnings.length,
              summary: getValidationSummary(result.validationResult),
            }
          : null,
        savedGame,
        retryCount: result.retryCount,
      };
    }),

  refine: installedProcedure
    .input(
      z.object({
        gameDefinition: z.string(),
        request: z.string().min(3).max(300),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const aiConfig = getAIConfigFromEnv(ctx.env);
      if (!aiConfig) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI generation not configured. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY.',
        });
      }

      let currentGame: unknown;
      try {
        currentGame = JSON.parse(input.gameDefinition);
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid game definition JSON',
        });
      }

      const result = await refineGame(currentGame as Parameters<typeof refineGame>[0], input.request, aiConfig);

      if (!result.success || !result.game) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error?.message ?? 'Failed to refine game',
          cause: result.error,
        });
      }

      return {
        game: result.game,
        validation: result.validationResult
          ? {
              valid: result.validationResult.valid,
              errorCount: result.validationResult.errors.length,
              warningCount: result.validationResult.warnings.length,
              summary: getValidationSummary(result.validationResult),
            }
          : null,
      };
    }),

  analyze: publicProcedure
    .input(z.object({ prompt: z.string().min(5).max(500) }))
    .query(({ input }) => {
      const intent = classifyPrompt(input.prompt);
      const confidence = getClassificationConfidence(input.prompt);

      return {
        intent,
        confidence,
      };
    }),

  validate: publicProcedure
    .input(z.object({ gameDefinition: z.string() }))
    .query(({ input }) => {
      let game: unknown;
      try {
        game = JSON.parse(input.gameDefinition);
      } catch {
        return {
          valid: false,
          errors: [{ code: 'INVALID_JSON', message: 'Invalid JSON' }],
          warnings: [],
          summary: 'Invalid JSON - could not parse game definition',
        };
      }

      const result = validateGameDefinition(game as Parameters<typeof validateGameDefinition>[0]);

      return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        summary: getValidationSummary(result),
      };
    }),

  fork: installedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.env.DB.prepare(
        `SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`
      )
        .bind(input.id)
        .first<GameRow>();

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const userId = (ctx as any).user?.id ?? null;
      const isOwner = existing.user_id === userId || existing.install_id === ctx.installId;
      
      if (!existing.is_public && !isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot fork private game' });
      }

      let definition: Record<string, unknown>;
      try {
        definition = JSON.parse(existing.definition);
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invalid game definition',
        });
      }

      const newId = crypto.randomUUID();
      const now = Date.now();

      if (definition.metadata && typeof definition.metadata === 'object') {
        const metadata = definition.metadata as Record<string, unknown>;
        metadata.id = newId;
        metadata.title = `${existing.title} (Fork)`;
        metadata.createdAt = now;
        metadata.updatedAt = now;
        if (existing.user_id || existing.install_id) {
          metadata.forkedFrom = {
            gameId: existing.id,
            title: existing.title,
          };
        }
      }

      const newDefinition = JSON.stringify(definition);

      await ctx.env.DB.prepare(
        `INSERT INTO games (id, user_id, install_id, title, description, definition, is_public, play_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
      )
        .bind(
          newId,
          userId,
          ctx.installId,
          `${existing.title} (Fork)`,
          existing.description,
          newDefinition,
          now,
          now
        )
        .run();

      return {
        id: newId,
        userId,
        title: `${existing.title} (Fork)`,
        description: existing.description,
        definition: newDefinition,
        thumbnailUrl: null,
        isPublic: false,
        playCount: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        forkedFrom: {
          gameId: existing.id,
          title: existing.title,
        },
      };
    }),
});
