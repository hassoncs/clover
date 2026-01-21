import { router, publicProcedure } from './index';
import { gamesRouter } from './routes/games';
import { usersRouter } from './routes/users';
import { assetsRouter } from './routes/assets';

export const appRouter = router({
  games: gamesRouter,
  users: usersRouter,
  assets: assetsRouter,

  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: Date.now(),
  })),
});

export type AppRouter = typeof appRouter;
