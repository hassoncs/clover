import LiveAudioStream from 'react-native-live-audio-stream';
import { AppState, type NativeEventSubscription } from 'react-native';

const AUDIO_CONFIG = {
  sampleRate: 24000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  bufferSize: 4096,
  wavFile: '',
};

export function initAudioCapture(): void {
  LiveAudioStream.init(AUDIO_CONFIG);
}

export function startAudioCapture(onData: (base64Chunk: string) => void): void {
  LiveAudioStream.on('data', onData);
  LiveAudioStream.start();
}

export function stopAudioCapture(): void {
  try {
    LiveAudioStream.stop();
  } catch {
    // Ignore if not started
  }
}

export function onAppBackground(callback: () => void): () => void {
  const subscription: NativeEventSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') callback();
  });
  return () => subscription.remove();
}
