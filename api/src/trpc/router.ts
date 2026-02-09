import { router, publicProcedure } from './index'
import { gamesRouter } from './routes/games'
import { usersRouter } from './routes/users'
import { assetSystemRouter } from './routes/asset-system'
import { uiComponentsRouter } from './routes/ui-components'
import { economyRouter } from './routes/economy'
import { invitesRouter } from './routes/invites'
import { agentRunsRouter } from './routes/agent-runs'
import { searchRouter } from './routes/search'
import { socialRouter } from './routes/social'
import { socialExtraRouter } from './routes/social-extra'
import { notificationsRouter } from './routes/notifications'
import { moderationRouter } from './routes/moderation'

export const appRouter = router({
  games: gamesRouter,
  users: usersRouter,
  assetSystem: assetSystemRouter,
  uiComponents: uiComponentsRouter,
  economy: economyRouter,
  invites: invitesRouter,
  agentRuns: agentRunsRouter,
  search: searchRouter,
  social: socialRouter,
  socialExtra: socialExtraRouter,
  notifications: notificationsRouter,
  moderation: moderationRouter,

  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: Date.now(),
  })),
});

export type AppRouter = typeof appRouter;
