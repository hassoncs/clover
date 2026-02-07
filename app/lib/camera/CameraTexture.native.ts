import { useCallback, useState } from 'react';
import { Camera } from 'react-native-vision-camera';
import type { GodotBridge } from '@/lib/godot/types';
import type { CameraTextureOptions, CameraTextureController } from './types';

const RESOLUTION_MAP = {
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
} as const;

export function useCameraTexture(bridge: GodotBridge): CameraTextureController {
  const [isActive, setIsActive] = useState(false);

  const start = useCallback(async (options: CameraTextureOptions) => {
    const permission = await Camera.requestCameraPermission();
    if (permission !== 'granted') {
      throw new Error(`Camera permission denied: ${permission}`);
    }

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
