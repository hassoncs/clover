import { router, publicProcedure } from './index';
import { gamesRouter } from './routes/games';
import { usersRouter } from './routes/users';
import { assetsRouter } from './routes/assets';
import { tilesRouter } from './routes/tiles';
import { assetSystemRouter } from './routes/asset-system';
import { uiComponentsRouter } from './routes/ui-components';
import { economyRouter } from './routes/economy';

export const appRouter = router({
  games: gamesRouter,
  users: usersRouter,
  assets: assetsRouter,
  tiles: tilesRouter,
  assetSystem: assetSystemRouter,
  uiComponents: uiComponentsRouter,
  economy: economyRouter,

  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: Date.now(),
  })),
});

export type AppRouter = typeof appRouter;
