import { router, publicProcedure } from './index'
import { gamesRouter } from './routes/games'
import { usersRouter } from './routes/users'
import { assetSystemRouter } from './routes/asset-system'
import { uiComponentsRouter } from './routes/ui-components'
import { economyRouter } from './routes/economy'
import { invitesRouter } from './routes/invites'
import { agentRunsRouter } from './routes/agent-runs'
import { searchRouter } from './routes/search'

export const appRouter = router({
  games: gamesRouter,
  users: usersRouter,
  assetSystem: assetSystemRouter,
  uiComponents: uiComponentsRouter,
  economy: economyRouter,
  invites: invitesRouter,
  agentRuns: agentRunsRouter,
  search: searchRouter,

  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: Date.now(),
  })),
});

export type AppRouter = typeof appRouter;
