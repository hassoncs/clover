import type { Frame } from 'react-native-vision-camera';
import { VisionCameraProxy } from 'react-native-vision-camera';

const plugin = VisionCameraProxy.initFrameProcessorPlugin('writeCameraFrame', {});

export function writeCameraFrame(frame: Frame): void {
  'worklet';
  if (plugin == null) {
    throw new Error('Failed to load Frame Processor Plugin "writeCameraFrame"!');
  }
  plugin.call(frame, {});
}
