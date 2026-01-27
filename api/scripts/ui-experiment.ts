
import { createNodeAdapters } from '../src/ai/pipeline/adapters/node';
import { getImageGenerationConfig } from '../src/ai/assets';
import { buildUIComponentPrompt } from '../src/ai/pipeline/prompt-builder';
import { 
  createPanelSilhouette,
  createProgressBarSilhouette,
  createScrollBarSilhouette,
  createTabBarSilhouette
} from '../src/ai/pipeline/silhouettes/ui-component-svg';
import { createNinePatchSilhouette as createNinePatchSilhouetteCanvas } from '../src/ai/pipeline/silhouettes/ui-component';
import { ICON_PATHS } from '../src/ai/pipeline/silhouettes/text-hint';
import { getControlConfig, getControlBaseState } from '../src/ai/pipeline/ui-control-config';
import { generateComparisonReport, ExperimentRun } from './ui-compare';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const params = {
  type: 'button',
  themes: ['cyberpunk neon'],
  strengths: [0.91],
  modifiers: [''],
  help: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--type') params.type = args[++i];
  else if (arg === '--theme') params.themes = args[++i].split(',').map(s => s.trim());
  else if (arg === '--strength') params.strengths = args[++i].split(',').map(s => parseFloat(s.trim()));
  else if (arg === '--prompt') params.modifiers = args[++i].split(',').map(s => s.trim());
  else if (arg === '--help' || arg === '-h') params.help = true;
}

if (params.help) {
  console.log(`
UI Experiment Tool
==================
Usage: npx tsx api/scripts/ui-experiment.ts [options]

Options:
  --type <type>       Control type (button, checkbox, panel, etc.) [default: button]
  --theme <themes>    Comma-separated list of themes to test
  --strength <nums>   Comma-separated list of strength values (0.0-1.0) [default: 0.91]
  --prompt <mods>     Comma-separated list of prompt modifiers
  --help, -h          Show this help message

Example:
  npx tsx api/scripts/ui-experiment.ts --type button --theme "scifi, fantasy" --strength 0.91,0.85
`);
  process.exit(0);
}

const OUTPUT_BASE = path.join(process.cwd(), 'debug-output/ui-experiments');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = path.join(OUTPUT_BASE, TIMESTAMP);

type ControlType = "button" | "checkbox" | "radio" | "slider" | "panel" | "progress_bar" | "scroll_bar_h" | "scroll_bar_v" | "tab_bar" | "list_item" | "dropdown" | "toggle_switch";

async function main() {
  console.log('Starting UI Experiments...');
  console.log(`Output Directory: ${RUN_DIR}`);
  console.log('Parameters:', JSON.stringify(params, null, 2));

  const providerConfig = getImageGenerationConfig(process.env as unknown as import('../src/trpc/context').Env);
  if (!providerConfig.configured) {
    console.error(`Error: ${providerConfig.error}`);
    process.exit(1);
  }

  const adapterOptions: Parameters<typeof createNodeAdapters>[0] = {
    provider: providerConfig.provider,
    r2Bucket: 'slopcade-assets-dev',
    wranglerCwd: process.cwd(),
    publicUrlBase: 'http://localhost:8787/assets',
    scenarioApiKey: providerConfig.provider === 'scenario' ? process.env.SCENARIO_API_KEY : undefined,
    scenarioApiSecret: providerConfig.provider === 'scenario' ? process.env.SCENARIO_SECRET_API_KEY : undefined,
    runpodApiKey: (providerConfig.provider === 'runpod' || providerConfig.provider === 'comfyui') ? process.env.RUNPOD_API_KEY : undefined,
    comfyuiEndpoint: providerConfig.provider === 'comfyui' ? `https://api.runpod.ai/v2/${process.env.RUNPOD_COMFYUI_ENDPOINT_ID}` : undefined,
  };

  console.log(`Using provider: ${providerConfig.provider}`);
  const adapters = await createNodeAdapters(adapterOptions);

  fs.mkdirSync(RUN_DIR, { recursive: true });

  const results: ExperimentRun[] = [];
  let runCount = 0;

  const controlType = params.type as ControlType;
  const silhouettePng = await generateSilhouette(controlType);
  
  console.log('Uploading silhouette...');
  const silhouetteAssetId = await adapters.provider.uploadImage(silhouettePng);
  console.log(`Silhouette uploaded: ${silhouetteAssetId}`);

  for (const theme of params.themes) {
    for (const strength of params.strengths) {
      for (const modifier of params.modifiers) {
        runCount++;
        const runId = `run-${runCount}-theme-${theme.substring(0, 10).replace(/\s+/g, '_')}-str-${strength}`;
        const runDir = path.join(RUN_DIR, runId);
        fs.mkdirSync(runDir, { recursive: true });

        console.log(`\nRunning experiment ${runCount}: ${theme} | Strength: ${strength} | Mod: ${modifier}`);

        const silhouettePath = path.join(runDir, 'silhouette.png');
        fs.writeFileSync(silhouettePath, silhouettePng);

        const baseState = getControlBaseState(controlType);
        const config = getControlConfig(controlType);
        const { width } = config.dimensions;

        const { prompt: basePrompt, negativePrompt } = buildUIComponentPrompt({
          componentType: controlType,
          state: baseState,
          theme: theme,
          baseResolution: width,
        });

        const fullPrompt = modifier ? `${basePrompt} ${modifier}` : basePrompt;
        const promptContent = `=== POSITIVE ===\n${fullPrompt}\n\n=== NEGATIVE ===\n${negativePrompt}`;
        const promptPath = path.join(runDir, 'prompt.txt');
        fs.writeFileSync(promptPath, promptContent);

        try {
          console.log('  Generating image...');
          const img2imgResult = await adapters.provider.img2img({
            imageAssetId: silhouetteAssetId,
            prompt: fullPrompt,
            strength: strength,
          });

          const { buffer: generatedBuffer } = await adapters.provider.downloadImage(img2imgResult.assetId);
          const generatedPath = path.join(runDir, 'generated-normal.png');
          fs.writeFileSync(generatedPath, generatedBuffer);

          console.log('  Skipping background removal for comparison experiment...');
          // const bgRemoveResult = await adapters.provider.removeBackground(img2imgResult.assetId);
          // const { buffer: finalBuffer } = await adapters.provider.downloadImage(bgRemoveResult.assetId);
          const finalPath = path.join(runDir, 'final-normal.png');
          fs.writeFileSync(finalPath, generatedBuffer); // Use generated as final for now

          results.push({
            id: runId,
            params: {
              theme,
              strength,
              promptModifiers: modifier ? [modifier] : [],
              controlType: controlType
            },
            paths: {
              silhouette: silhouettePath,
              prompt: promptPath,
              generated: generatedPath,
              final: finalPath
            },
            timestamp: Date.now()
          });

        } catch (error) {
          console.error(`  Failed run ${runCount}:`, error);
        }
      }
    }
  }

  console.log('\nGenerating report...');
  generateComparisonReport(RUN_DIR, results);
  console.log('Done!');
}

async function generateSilhouette(type: ControlType): Promise<Uint8Array> {
  const config = getControlConfig(type);
  const { width, height } = config.dimensions;
  const marginSize = 12; 

  switch (type) {
    case 'button':
      return await createNinePatchSilhouetteCanvas({
        width: 64,
        height: 64,
        marginSize,
        canvasSize: width,
        textHint: {
          text: 'BUTTON',
          fontSize: 24,
          color: '#E0E0E0',
          fontWeight: 'bold'
        }
      });
    
    case 'checkbox':
      return await createNinePatchSilhouetteCanvas({
        width: 64,
        height: 64,
        marginSize,
        canvasSize: width,
        iconHint: {
          svgPath: ICON_PATHS.checkmark,
          size: 32,
          color: '#E0E0E0'
        }
      });
    
    case 'panel':
      return await createPanelSilhouette({
        width,
        height,
        margin: marginSize,
      });
    
    case 'progress_bar':
      return await createProgressBarSilhouette({
        width,
        height,
      });
    
    case 'scroll_bar_h':
      return await createScrollBarSilhouette({
        orientation: 'h',
      });
    
    case 'scroll_bar_v':
      return await createScrollBarSilhouette({
        orientation: 'v',
      });
    
    case 'tab_bar':
      return await createTabBarSilhouette({
        width,
        height,
      });
    
    default:
      return await createNinePatchSilhouetteCanvas({
        width: 64,
        height: 64,
        marginSize,
        canvasSize: width,
      });
  }
}

main().catch(console.error);
