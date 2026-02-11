import { router, publicProcedure } from './index'
import { gamesRouter } from './routes/games'
import { usersRouter } from './routes/users'
import { assetSystemRouter } from './routes/asset-system'
import { uiComponentsRouter } from './routes/ui-components'
import { economyRouter } from './routes/economy'
import { invitesRouter } from './routes/invites'
import { chatThreadsRouter } from './routes/chat-threads'
import { searchRouter } from './routes/search'
import { socialRouter } from './routes/social'
import { socialExtraRouter } from './routes/social-extra'
import { notificationsRouter } from './routes/notifications'
import { moderationRouter } from './routes/moderation'
import { packageReadinessRouter } from './routes/package-readiness'
import { packageCompilerRouter } from './routes/package-compiler'

export const appRouter = router({
  games: gamesRouter,
  users: usersRouter,
  assetSystem: assetSystemRouter,
  uiComponents: uiComponentsRouter,
  economy: economyRouter,
  invites: invitesRouter,
  chatThreads: chatThreadsRouter,
  search: searchRouter,
  social: socialRouter,
  socialExtra: socialExtraRouter,
  notifications: notificationsRouter,
  moderation: moderationRouter,
  packageReadiness: packageReadinessRouter,
  packageCompiler: packageCompilerRouter,

  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: Date.now(),
  })),
});

export type AppRouter = typeof appRouter;
