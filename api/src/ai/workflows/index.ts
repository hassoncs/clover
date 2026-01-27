import type { ComfyWorkflow } from '../comfyui-types';

import txt2imgWorkflow from './txt2img.json';
import img2imgWorkflow from './img2img.json';
import removeBackgroundWorkflow from './remove-background.json';

interface Txt2ImgParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed: number;
}

interface Img2ImgParams {
  inputImage: string;
  prompt: string;
  negativePrompt?: string;
  strength: number;
  steps: number;
  guidance: number;
  seed: number;
}

interface RemoveBackgroundParams {
  inputImage: string;
  model: 'BEN2' | 'BiRefNet' | 'RMBG-2.0';
}

interface LayeredDecomposeParams {
  inputImage: string;
  layerCount: number;
  description?: string;
}

function cloneWorkflow(workflow: Record<string, unknown>): ComfyWorkflow {
  return JSON.parse(JSON.stringify(workflow)) as ComfyWorkflow;
}

export function buildTxt2ImgWorkflow(params: Txt2ImgParams): ComfyWorkflow {
  const workflow = cloneWorkflow(txt2imgWorkflow);

  workflow['5'].inputs.width = params.width;
  workflow['5'].inputs.height = params.height;
  workflow['6'].inputs.text = params.prompt;
  workflow['13'].inputs.guidance = params.guidance;
  workflow['17'].inputs.seed = params.seed;
  workflow['17'].inputs.steps = params.steps;

  return workflow;
}

export function buildImg2ImgWorkflow(params: Img2ImgParams): ComfyWorkflow {
  const workflow = cloneWorkflow(img2imgWorkflow);

  workflow['1'].inputs.image = params.inputImage;
  workflow['6'].inputs.text = params.prompt;
  workflow['13'].inputs.guidance = params.guidance;
  workflow['17'].inputs.seed = params.seed;
  workflow['17'].inputs.steps = params.steps;
  workflow['17'].inputs.denoise = params.strength;

  return workflow;
}

export function buildRemoveBackgroundWorkflow(params: RemoveBackgroundParams): ComfyWorkflow {
  const workflow = cloneWorkflow(removeBackgroundWorkflow);

  workflow['1'].inputs.image = params.inputImage;

  return workflow;
}

export function buildLayeredDecomposeWorkflow(_params: LayeredDecomposeParams): ComfyWorkflow {
  throw new Error('Layered decomposition not yet implemented for ComfyUI serverless');
}
