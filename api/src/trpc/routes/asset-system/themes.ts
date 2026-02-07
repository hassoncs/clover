import { protectedProcedure, publicProcedure, router } from '../../index'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import type { ThemeRow } from './types'
import { toClientTheme } from './utils'

export const themesRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      promptModifier: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const now = Date.now();

      await ctx.env.DB.prepare(
        `INSERT INTO themes (id, name, prompt_modifier, creator_user_id, is_public, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`
      ).bind(id, input.name, input.promptModifier, ctx.user.id, now, now).run();

      return { id, createdAt: now };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      promptModifier: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: string[] = [];
      const values: (string | number)[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
      }
      if (input.promptModifier !== undefined) {
        updates.push('prompt_modifier = ?');
        values.push(input.promptModifier);
      }

      if (updates.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      updates.push('updated_at = ?');
      values.push(Date.now());

      values.push(input.id);
      values.push(ctx.user.id);
      const result = await ctx.env.DB.prepare(
        `UPDATE themes SET ${updates.join(', ')} WHERE id = ? AND creator_user_id = ? AND deleted_at IS NULL`
      ).bind(...values).run();

      if (result.meta.changes === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found or not owned by you' });
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const result = await ctx.env.DB.prepare(
        'UPDATE themes SET deleted_at = ? WHERE id = ? AND creator_user_id = ?'
      ).bind(now, input.id, ctx.user.id).run();

      if (result.meta.changes === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found or not owned by you' });
      }

      return { success: true };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.env.DB.prepare(
        'SELECT * FROM themes WHERE id = ? AND deleted_at IS NULL'
      ).bind(input.id).first<ThemeRow>();

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found' });
      }

      return toClientTheme(row);
    }),

  getMine: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.env.DB.prepare(
        'SELECT * FROM themes WHERE id = ? AND creator_user_id = ? AND deleted_at IS NULL'
      ).bind(input.id, ctx.user.id).first<ThemeRow>();

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found' });
      }

      return toClientTheme(row);
    }),

  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      query: z.string().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;
      const query = input?.query?.toLowerCase();

      let sql = 'SELECT * FROM themes WHERE creator_user_id = ? AND deleted_at IS NULL';
      const params: any[] = [ctx.user.id];

      if (query) {
        sql += ' AND (LOWER(name) LIKE ? OR LOWER(prompt_modifier) LIKE ?)';
        params.push(`%${query}%`, `%${query}%`);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await ctx.env.DB.prepare(sql).bind(...params).all<ThemeRow>();
      return result.results.map(toClientTheme);
    }),

  listPublic: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      query: z.string().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;
      const query = input?.query?.toLowerCase();

      let sql = 'SELECT * FROM themes WHERE is_public = 1 AND deleted_at IS NULL';
      const params: any[] = [];

      if (query) {
        sql += ' AND (LOWER(name) LIKE ? OR LOWER(prompt_modifier) LIKE ?)';
        params.push(`%${query}%`, `%${query}%`);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await ctx.env.DB.prepare(sql).bind(...params).all<ThemeRow>();
      return result.results.map(toClientTheme);
    }),

  enhancePrompt: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(1000),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const openrouterKey = ctx.env.OPENROUTER_API_KEY;
      if (!openrouterKey) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI enhancement is not configured. Please contact support.',
        });
      }

      const systemPrompt = `You are a game art director. Given a brief theme description, expand it into a detailed, evocative prompt that would guide AI image generation for game assets.

The enhanced prompt should:
- Be 2-3 sentences
- Include specific visual details (colors, textures, lighting, mood)
- Reference art styles or eras if appropriate
- Be suitable for generating game UI elements, sprites, and backgrounds

Only output the enhanced prompt, nothing else.`;

      const userPrompt = input.name
        ? `Theme name: "${input.name}"\nOriginal prompt: "${input.prompt}"`
        : `Original prompt: "${input.prompt}"`;

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to enhance prompt. Please try again.',
          });
        }

        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        const enhancedPrompt = data.choices[0]?.message?.content?.trim();

        if (!enhancedPrompt) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI returned empty response. Please try again.',
          });
        }

        return { enhancedPrompt };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to enhance prompt. Please try again.',
        });
      }
    }),
});
