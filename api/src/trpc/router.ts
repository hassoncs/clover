import { publicProcedure, router } from "./index";
import { adminRouter } from "./routes/admin";
import { adminToolsRouter } from "./routes/admin-tools";
import { assetSystemRouter } from "./routes/asset-system";
import { blobAssetsRouter } from "./routes/blob-assets";
import { chatThreadsRouter } from "./routes/chat-threads";
import { economyRouter } from "./routes/economy";
import { economyGraphRouter } from "./routes/economy-graph";
import { gamesRouter } from "./routes/games";
import { invitesRouter } from "./routes/invites";
import { moderationRouter } from "./routes/moderation";
import { notificationsRouter } from "./routes/notifications";
import { packageCompilerRouter } from "./routes/package-compiler";
import { packageReadinessRouter } from "./routes/package-readiness";
import { searchRouter } from "./routes/search";
import { socialRouter } from "./routes/social";
import { socialExtraRouter } from "./routes/social-extra";
import { uiComponentsRouter } from "./routes/ui-components";
import { usersRouter } from "./routes/users";

export const appRouter = router({
	admin: adminRouter,
	adminTools: adminToolsRouter,
	games: gamesRouter,
	users: usersRouter,
	assetSystem: assetSystemRouter,
	blobAssets: blobAssetsRouter,
	uiComponents: uiComponentsRouter,
	economy: economyRouter,
	economyGraph: economyGraphRouter,
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
		status: "ok",
		timestamp: Date.now(),
	})),
});

export type AppRouter = typeof appRouter;
