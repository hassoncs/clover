export type CameraResolution = '480p' | '720p';

export type CameraMode = 'sprite' | 'background';

export interface CameraTextureOptions {
  resolution?: CameraResolution;
  targetEntityId: string;
  mode?: CameraMode;
}

export interface CameraTextureController {
  start(options: CameraTextureOptions): Promise<void>;
  stop(): Promise<void>;
  isActive: boolean;
}
