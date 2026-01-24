import type { ComfyWorkflow } from '../comfyui-types';

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

export function buildTxt2ImgWorkflow(params: Txt2ImgParams): ComfyWorkflow {
  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: params.guidance,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: 'flux1-dev.safetensors',
      },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: 1,
      },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: params.prompt,
        clip: ['4', 1],
      },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: params.negativePrompt ?? '',
        clip: ['4', 1],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['3', 0],
        vae: ['4', 2],
      },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: 'comfyui_output',
        images: ['8', 0],
      },
    },
  };
}

export function buildImg2ImgWorkflow(params: Img2ImgParams): ComfyWorkflow {
  return {
    '1': {
      class_type: 'LoadImage',
      inputs: {
        image: params.inputImage,
      },
    },
    '2': {
      class_type: 'VAEEncode',
      inputs: {
        pixels: ['1', 0],
        vae: ['4', 2],
      },
    },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: params.guidance,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: params.strength,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['2', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: 'flux1-dev.safetensors',
      },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: params.prompt,
        clip: ['4', 1],
      },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: params.negativePrompt ?? '',
        clip: ['4', 1],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['3', 0],
        vae: ['4', 2],
      },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: 'comfyui_output',
        images: ['8', 0],
      },
    },
  };
}

export function buildRemoveBackgroundWorkflow(params: RemoveBackgroundParams): ComfyWorkflow {
  const modelNodeClass = params.model === 'BEN2'
    ? 'BEN2_Segmentation'
    : params.model === 'BiRefNet'
      ? 'BiRefNet_Segmentation'
      : 'RMBG_Segmentation';

  return {
    '1': {
      class_type: 'LoadImage',
      inputs: {
        image: params.inputImage,
      },
    },
    '2': {
      class_type: modelNodeClass,
      inputs: {
        image: ['1', 0],
        model: params.model,
      },
    },
    '3': {
      class_type: 'ImageCompositeMasked',
      inputs: {
        destination: ['1', 0],
        source: ['1', 0],
        mask: ['2', 1],
        x: 0,
        y: 0,
        resize_source: false,
      },
    },
    '4': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: 'nobg_output',
        images: ['3', 0],
      },
    },
  };
}

export function buildLayeredDecomposeWorkflow(params: LayeredDecomposeParams): ComfyWorkflow {
  return {
    '1': {
      class_type: 'LoadImage',
      inputs: {
        image: params.inputImage,
      },
    },
    '2': {
      class_type: 'QwenImageLayered',
      inputs: {
        image: ['1', 0],
        layers_count: params.layerCount,
        description: params.description ?? 'character, background, shadows, effects',
      },
    },
    '3': {
      class_type: 'SaveImageBatch',
      inputs: {
        filename_prefix: 'layer',
        images: ['2', 0],
      },
    },
  };
}
