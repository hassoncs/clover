export interface RunPodConfig {
  apiKey: string;
  sdxlEndpointId?: string;
  fluxEndpointId?: string;
  bgRemovalEndpointId?: string;
  timeout?: number;
}

export interface RunPodJobInput {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
  scheduler?: string;
}

export interface RunPodImg2ImgInput extends RunPodJobInput {
  image: string;
  strength?: number;
}

export interface RunPodBgRemovalInput {
  image: string;
}

export interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  delayTime?: number;
  executionTime?: number;
  output?: string | string[] | { image?: string; images?: string[]; error?: string };
  error?: string;
}

export const RUNPOD_DEFAULTS = {
  BASE_URL: 'https://api.runpod.ai/v2',
  TIMEOUT_MS: 300000,
  POLL_INTERVAL_MS: 2000,
  WIDTH: 1024,
  HEIGHT: 1024,
  STEPS: 25,
  GUIDANCE: 7.5,
  STRENGTH: 0.95,
} as const;
