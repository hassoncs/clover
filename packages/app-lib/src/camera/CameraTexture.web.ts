import { useCallback, useState } from 'react';
import type { GodotBridge } from '@slopcade/godot-bridge/types';
import type { CameraTextureOptions, CameraTextureController } from './types';

const RESOLUTION_MAP = {
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
} as const;

export function useCameraTexture(bridge: GodotBridge): CameraTextureController {
  const [isActive, setIsActive] = useState(false);

  const start = useCallback(async (options: CameraTextureOptions) => {
    const resolution = options.resolution ?? '720p';
    const { width, height } = RESOLUTION_MAP[resolution];

    bridge.startCamera(options.targetEntityId, width, height);
    setIsActive(true);
  }, [bridge]);

  const stop = useCallback(async () => {
    bridge.stopCamera();
    setIsActive(false);
  }, [bridge]);

  return {
    start,
    stop,
    isActive,
  };
}
