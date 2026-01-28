import {
  router,
  publicProcedure,
  protectedProcedure,
} from '@/trpc/index'
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';
import {
  generateGame,
  refineGame,
  getAIConfigFromEnv,
  classifyPrompt,
  getClassificationConfidence,
  validateGameDefinition,
  getValidationSummary,
} from '@/ai'
import { validateGame, getValidationReportJson } from '@/validation/gameValidator';
import type { GameValidationReport } from '@slopcade/shared/validation';
import { isTestGameId, getTestGame } from '@/dev/templateLoader';

interface GameRow {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  definition: string;
  thumbnail_url: string | null;
  is_public: number;
  play_count: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  base_game_id: string | null;
  forked_from_id: string | null;
  validation_report: string | null;
  validation_score: number | null;
  validation_critical_count: number;
  validation_warning_count: number;
  validation_valid: number;
  validation_updated_at: number | null;
  validator_version: string | null;
}

function parseValidationReport(json: string | null): GameValidationReport | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as GameValidationReport;
  } catch {
    return null;
  }
}

function toClientGame(row: GameRow) {
  const validationReport = parseValidationReport(row.validation_report);

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
    baseGameId: row.base_game_id,
    forkedFromId: row.forked_from_id,
    validation: validationReport ? {
      valid: row.validation_valid === 1,
      score: row.validation_score ?? 0,
      criticalCount: row.validation_critical_count,
      warningCount: row.validation_warning_count,
      topIssues: validationReport.summary.topIssues,
      isStale: validationReport.validatorVersion !== '1.0.0',
    } : null,
  };
}

function createDevTemplateResponse(id: string) {
  const game = getTestGame(id);
  if (!game) return null;

  const definition = JSON.stringify(game.definition);
  const validationReport = validateGame(game.definition);

  return {
    id,
    userId: '00000000-0000-0000-0000-000000000000',
    title: game.title,
    description: game.description,
    definition,
    thumbnailUrl: null,
    isPublic: true,
    playCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    baseGameId: id,
    forkedFromId: null,
    validation: {
      valid: validationReport.valid,
      score: validationReport.summary.score,
      criticalCount: validationReport.summary.criticalCount,
      warningCount: validationReport.summary.warningCount,
      topIssues: validationReport.summary.topIssues,
      isStale: false,
    },
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

  getPublic: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (isTestGameId(input.id)) {
        const devGame = createDevTemplateResponse(input.id);
        if (devGame) {
          return devGame;
        }
      }

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid game ID format' });
      }

      const result = await ctx.env.DB.prepare(
        `SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`
      )
        .bind(input.id)
        .first<GameRow>();

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      if (!result.is_public) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This game is private. Sign in to access your games.' });
      }

      return toClientGame(result);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (isTestGameId(input.id)) {
        const devGame = createDevTemplateResponse(input.id);
        if (devGame) {
          return devGame;
        }
      }

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid game ID format' });
      }

      const result = await ctx.env.DB.prepare(
        `SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`
      )
        .bind(input.id)
        .first<GameRow>();

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const isOwner = result.user_id === ctx.user.id;
      
      if (!result.is_public && !isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      return toClientGame(result);
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        definition: z.string(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let gameDefinition: GameDefinition;
      try {
        gameDefinition = JSON.parse(input.definition) as GameDefinition;
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid game definition JSON',
        });
      }

      const validationReport = validateGame(gameDefinition);
      const now = Date.now();
      const id = crypto.randomUUID();

      await ctx.env.DB.prepare(
        `INSERT INTO games (
          id, user_id, title, description, definition, is_public, play_count, 
          created_at, updated_at, base_game_id,
          validation_report, validation_score, validation_critical_count, 
          validation_warning_count, validation_valid, validation_updated_at, validator_version
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          ctx.user.id,
          input.title,
          input.description ?? null,
          input.definition,
          input.isPublic ? 1 : 0,
          now,
          now,
          id,
          getValidationReportJson(validationReport),
          validationReport.summary.score,
          validationReport.summary.criticalCount,
          validationReport.summary.warningCount,
          validationReport.valid ? 1 : 0,
          now,
          validationReport.validatorVersion
        )
        .run();

      return {
        id,
        userId: ctx.user.id,
        title: input.title,
        description: input.description ?? null,
        definition: input.definition,
        thumbnailUrl: null,
        isPublic: input.isPublic,
        playCount: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        baseGameId: id,
        forkedFromId: null,
        validation: {
          valid: validationReport.valid,
          score: validationReport.summary.score,
          criticalCount: validationReport.summary.criticalCount,
          warningCount: validationReport.summary.warningCount,
          topIssues: validationReport.summary.topIssues,
        },
      };
    }),

  update: protectedProcedure
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

      if (existing.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot edit games you do not own' });
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

      let validationReport: GameValidationReport | null = null;

      if (input.definition !== undefined) {
        updates.push('definition = ?');
        values.push(input.definition);

        let gameDefinition: GameDefinition;
        try {
          gameDefinition = JSON.parse(input.definition) as GameDefinition;
          validationReport = validateGame(gameDefinition);
        } catch {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid game definition JSON',
          });
        }

        updates.push('validation_report = ?');
        updates.push('validation_score = ?');
        updates.push('validation_critical_count = ?');
        updates.push('validation_warning_count = ?');
        updates.push('validation_valid = ?');
        updates.push('validation_updated_at = ?');
        updates.push('validator_version = ?');

        const now = Date.now();
        values.push(getValidationReportJson(validationReport));
        values.push(validationReport.summary.score);
        values.push(validationReport.summary.criticalCount);
        values.push(validationReport.summary.warningCount);
        values.push(validationReport.valid ? 1 : 0);
        values.push(now);
        values.push(validationReport.validatorVersion);
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

      return { 
        id: input.id, 
        updatedAt: new Date(now),
        validation: validationReport ? {
          valid: validationReport.valid,
          score: validationReport.summary.score,
          criticalCount: validationReport.summary.criticalCount,
          warningCount: validationReport.summary.warningCount,
          topIssues: validationReport.summary.topIssues,
        } : null,
      };
    }),

  delete: protectedProcedure
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

      if (existing.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete games you do not own' });
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
          includeCritical: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;
      const includeCritical = input?.includeCritical ?? false;

      let query = `SELECT * FROM games WHERE is_public = 1 AND deleted_at IS NULL`;
      
      if (!includeCritical) {
        query += ` AND (validation_valid = 1 OR validation_valid IS NULL)`;
      }
      
      query += ` ORDER BY play_count DESC, created_at DESC LIMIT ? OFFSET ?`;

      const result = await ctx.env.DB.prepare(query)
        .bind(limit, offset)
        .all<GameRow>();

      return result.results.map(toClientGame);
    }),

  validate: protectedProcedure
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

      if (existing.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot validate games you do not own' });
      }

      let gameDefinition: GameDefinition;
      try {
        gameDefinition = JSON.parse(existing.definition) as GameDefinition;
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid game definition JSON',
        });
      }

      const validationReport = validateGame(gameDefinition);
      const now = Date.now();

      await ctx.env.DB.prepare(
        `UPDATE games SET 
          validation_report = ?,
          validation_score = ?,
          validation_critical_count = ?,
          validation_warning_count = ?,
          validation_valid = ?,
          validation_updated_at = ?,
          validator_version = ?
        WHERE id = ?`
      )
        .bind(
          getValidationReportJson(validationReport),
          validationReport.summary.score,
          validationReport.summary.criticalCount,
          validationReport.summary.warningCount,
          validationReport.valid ? 1 : 0,
          now,
          validationReport.validatorVersion,
          input.id
        )
        .run();

      return {
        valid: validationReport.valid,
        score: validationReport.summary.score,
        criticalCount: validationReport.summary.criticalCount,
        warningCount: validationReport.summary.warningCount,
        topIssues: validationReport.summary.topIssues,
      };
    }),

  generate: protectedProcedure
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
        const definition = JSON.stringify(result.game);
        const validationReport = validateGame(result.game);

        await ctx.env.DB.prepare(
          `INSERT INTO games (
            id, user_id, title, description, definition, is_public, play_count, 
            created_at, updated_at, base_game_id,
            validation_report, validation_score, validation_critical_count, 
            validation_warning_count, validation_valid, validation_updated_at, validator_version
          ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            ctx.user.id,
            result.game.metadata.title,
            result.game.metadata.description ?? input.prompt,
            definition,
            now,
            now,
            id,
            getValidationReportJson(validationReport),
            validationReport.summary.score,
            validationReport.summary.criticalCount,
            validationReport.summary.warningCount,
            validationReport.valid ? 1 : 0,
            now,
            validationReport.validatorVersion
          )
          .run();

        savedGame = {
          id,
          userId: ctx.user.id,
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

  refine: protectedProcedure
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

  validateDefinition: publicProcedure
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

  fork: protectedProcedure
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

      const isOwner = existing.user_id === ctx.user.id;
      
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
        if (existing.user_id) {
          metadata.forkedFrom = {
            gameId: existing.id,
            title: existing.title,
          };
        }
      }

      const newDefinition = JSON.stringify(definition);
      const validationReport = validateGame(definition as unknown as GameDefinition);

      const parentBaseGameId = existing.base_game_id ?? existing.id;

      await ctx.env.DB.prepare(
        `INSERT INTO games (
          id, user_id, title, description, definition, is_public, play_count, 
          created_at, updated_at, base_game_id, forked_from_id,
          validation_report, validation_score, validation_critical_count, 
          validation_warning_count, validation_valid, validation_updated_at, validator_version
        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          newId,
          ctx.user.id,
          `${existing.title} (Fork)`,
          existing.description,
          newDefinition,
          now,
          now,
          parentBaseGameId,
          existing.id,
          getValidationReportJson(validationReport),
          validationReport.summary.score,
          validationReport.summary.criticalCount,
          validationReport.summary.warningCount,
          validationReport.valid ? 1 : 0,
          now,
          validationReport.validatorVersion
        )
        .run();

      return {
        id: newId,
        userId: ctx.user.id,
        title: `${existing.title} (Fork)`,
        description: existing.description,
        definition: newDefinition,
        thumbnailUrl: existing.thumbnail_url,
        isPublic: false,
        playCount: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        baseGameId: parentBaseGameId,
        forkedFromId: existing.id,
      };
    }),

  syncTemplates: protectedProcedure
    .input(
      z.object({
        templates: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string().optional(),
            definition: z.string(),
            isPublic: z.boolean().default(true),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
      const now = Date.now();

      const results: Array<{
        id: string;
        title: string;
        action: 'created' | 'updated' | 'error';
        error?: string;
      }> = [];

      for (const template of input.templates) {
        try {
          let gameDefinition: GameDefinition;
          try {
            gameDefinition = JSON.parse(template.definition) as GameDefinition;
          } catch {
            results.push({
              id: template.id,
              title: template.title,
              action: 'error',
              error: 'Invalid game definition JSON',
            });
            continue;
          }

          const validationReport = validateGame(gameDefinition);

          const existing = await ctx.env.DB.prepare(
            `SELECT id FROM games WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
          )
            .bind(template.id, SYSTEM_USER_ID)
            .first<{ id: string }>();

          if (existing) {
            await ctx.env.DB.prepare(
              `UPDATE games SET 
                title = ?,
                description = ?,
                definition = ?,
                is_public = ?,
                updated_at = ?,
                validation_report = ?,
                validation_score = ?,
                validation_critical_count = ?,
                validation_warning_count = ?,
                validation_valid = ?,
                validation_updated_at = ?,
                validator_version = ?
              WHERE id = ? AND user_id = ?`
            )
              .bind(
                template.title,
                template.description ?? null,
                template.definition,
                template.isPublic ? 1 : 0,
                now,
                getValidationReportJson(validationReport),
                validationReport.summary.score,
                validationReport.summary.criticalCount,
                validationReport.summary.warningCount,
                validationReport.valid ? 1 : 0,
                now,
                validationReport.validatorVersion,
                template.id,
                SYSTEM_USER_ID
              )
              .run();

            results.push({
              id: template.id,
              title: template.title,
              action: 'updated',
            });
          } else {
            await ctx.env.DB.prepare(
              `INSERT INTO games (
                id, user_id, title, description, definition, is_public, play_count,
                created_at, updated_at, base_game_id,
                validation_report, validation_score, validation_critical_count,
                validation_warning_count, validation_valid, validation_updated_at, validator_version
              ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
              .bind(
                template.id,
                SYSTEM_USER_ID,
                template.title,
                template.description ?? null,
                template.definition,
                template.isPublic ? 1 : 0,
                now,
                now,
                template.id,
                getValidationReportJson(validationReport),
                validationReport.summary.score,
                validationReport.summary.criticalCount,
                validationReport.summary.warningCount,
                validationReport.valid ? 1 : 0,
                now,
                validationReport.validatorVersion
              )
              .run();

            results.push({
              id: template.id,
              title: template.title,
              action: 'created',
            });
          }
        } catch (error) {
          results.push({
            id: template.id,
            title: template.title,
            action: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const created = results.filter(r => r.action === 'created').length;
      const updated = results.filter(r => r.action === 'updated').length;
      const errors = results.filter(r => r.action === 'error').length;

      return {
        summary: {
          total: input.templates.length,
          created,
          updated,
          errors,
        },
        results,
      };
    }),
});
