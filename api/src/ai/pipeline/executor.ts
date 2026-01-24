import type { 
  AssetSpec, 
  AssetRun, 
  PipelineAdapters, 
  DebugSink,
  PipelineResult,
  BatchPipelineResult,
  GameAssetConfig,
  SpriteStyle,
} from './types';
import { getStagesForAssetType } from './registry';

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

const noopDebugSink: DebugSink = () => {};

export async function executeAsset(
  spec: AssetSpec,
  adapters: PipelineAdapters,
  meta: {
    gameId: string;
    gameTitle: string;
    theme: string;
    style: SpriteStyle;
    r2Prefix: string;
  },
  debugSink: DebugSink = noopDebugSink,
): Promise<PipelineResult> {
  const runId = generateRunId();
  const startTime = Date.now();

  const run: AssetRun = {
    spec,
    artifacts: {},
    meta: {
      ...meta,
      startedAt: startTime,
      runId,
    },
  };

  await debugSink({
    type: 'run:start',
    runId,
    assetId: spec.id,
    assetType: spec.type,
  });

  const stages = getStagesForAssetType(spec.type);
  let currentRun = run;

  try {
    for (const stage of stages) {
      const stageStart = Date.now();
      
      await debugSink({
        type: 'stage:start',
        runId,
        assetId: spec.id,
        stageId: stage.id,
      });

      try {
        currentRun = await stage.run(currentRun, adapters, debugSink);
        
        await debugSink({
          type: 'stage:end',
          runId,
          assetId: spec.id,
          stageId: stage.id,
          durationMs: Date.now() - stageStart,
          ok: true,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        await debugSink({
          type: 'stage:end',
          runId,
          assetId: spec.id,
          stageId: stage.id,
          durationMs: Date.now() - stageStart,
          ok: false,
          error: errorMsg,
        });
        
        throw error;
      }
    }

    const durationMs = Date.now() - startTime;
    const r2Keys = currentRun.artifacts.r2Keys ?? [];
    const publicUrls = currentRun.artifacts.publicUrls ?? [];

    await debugSink({
      type: 'run:end',
      runId,
      assetId: spec.id,
      durationMs,
      ok: true,
      r2Keys,
    });

    return {
      success: true,
      assetId: spec.id,
      assetType: spec.type,
      r2Keys,
      publicUrls,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await debugSink({
      type: 'run:end',
      runId,
      assetId: spec.id,
      durationMs,
      ok: false,
      error: errorMsg,
    });

    return {
      success: false,
      assetId: spec.id,
      assetType: spec.type,
      r2Keys: [],
      publicUrls: [],
      durationMs,
      error: errorMsg,
    };
  }
}

export async function executeGameAssets(
  config: GameAssetConfig,
  adapters: PipelineAdapters,
  debugSink: DebugSink = noopDebugSink,
): Promise<BatchPipelineResult> {
  const startTime = Date.now();
  const results: PipelineResult[] = [];

  const meta = {
    gameId: config.gameId,
    gameTitle: config.gameTitle,
    theme: config.theme,
    style: config.style,
    r2Prefix: config.r2Prefix,
  };

  for (const spec of config.assets) {
    const result = await executeAsset(spec, adapters, meta, debugSink);
    results.push(result);
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    gameId: config.gameId,
    totalAssets: config.assets.length,
    successful,
    failed,
    results,
    durationMs: Date.now() - startTime,
  };
}
