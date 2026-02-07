import { mergeRouters, router } from '../../index'
import { themesRouter } from './themes'
import { assetPacksRouter } from './asset-packs'
import { generationJobsRouter } from './generation-jobs'
import { orchestrationRouter } from './orchestration'

export const assetSystemRouter = mergeRouters(
  assetPacksRouter,
  generationJobsRouter,
  orchestrationRouter,
  router({
    themes: themesRouter,
  }),
);
