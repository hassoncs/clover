import { router, publicProcedure, protectedProcedure } from './index';
import { z } from 'zod';

// Placeholder routers - to be expanded
const gamesRouter = router({
  // List user's games
  list: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Query D1 database
    return [];
  }),
  
  // Get single game by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: Query D1 database
      return null;
    }),
  
  // Create new game
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(100),
      description: z.string().optional(),
      definition: z.string(), // JSON string
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Insert into D1 database
      return { id: crypto.randomUUID(), ...input };
    }),
  
  // Update game
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      definition: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Update in D1 database
      return { id: input.id };
    }),
  
  // Delete game
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Soft delete in D1 database
      return { success: true };
    }),
});

// Root router
export const appRouter = router({
  games: gamesRouter,
  
  // Health check
  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: Date.now(),
  })),
});

export type AppRouter = typeof appRouter;
