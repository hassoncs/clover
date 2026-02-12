import { mergeRouters, router } from "../../index";
import { assetPacksRouter } from "./asset-packs";
import { generationJobsRouter } from "./generation-jobs";
import { orchestrationRouter } from "./orchestration";
import { remixesRouter } from "./remixes";
import { themesRouter } from "./themes";

export const assetSystemRouter = mergeRouters(
	assetPacksRouter,
	generationJobsRouter,
	orchestrationRouter,
	router({
		themes: themesRouter,
		remixes: remixesRouter,
	}),
);
