import { router, publicProcedure } from '@/trpc/index'
import { gamesRouter } from '@/trpc/routes/games'
import { usersRouter } from '@/trpc/routes/users'
import { assetsRouter } from '@/trpc/routes/assets'
import { tilesRouter } from '@/trpc/routes/tiles'
import { assetSystemRouter } from '@/trpc/routes/asset-system'
import { uiComponentsRouter } from '@/trpc/routes/ui-components'
import { economyRouter } from '@/trpc/routes/economy'

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
