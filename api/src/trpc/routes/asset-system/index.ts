import { mergeRouters, router } from "../../index";
import { generationJobsRouter } from "./generation-jobs";
import { orchestrationRouter } from "./orchestration";
import { remixesRouter } from "./remixes";
import { themesRouter } from "./themes";

export const assetSystemRouter = mergeRouters(
	generationJobsRouter,
	orchestrationRouter,
	router({
		themes: themesRouter,
		remixes: remixesRouter,
	}),
);
