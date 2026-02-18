import { StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { writeCameraFrame } from './frameProcessor';

interface CameraCaptureProps {
  isActive: boolean;
  facing?: 'back' | 'front';
}

export function CameraCapture({ isActive, facing = 'back' }: CameraCaptureProps) {
  const device = useCameraDevice(facing);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    writeCameraFrame(frame);
  }, []);

  if (!device || !isActive) return null;

  return (
    <Camera
      style={styles.hidden}
      device={device}
      isActive={isActive}
      frameProcessor={frameProcessor}
      video={true}
      photo={false}
      audio={false}
      pixelFormat="rgb"
    />
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
