let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let workletNode: ScriptProcessorNode | null = null;

export function initAudioCapture(): void {
}

export async function startAudioCapture(onData: (base64Chunk: string) => void): Promise<void> {
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 24000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  audioContext = new AudioContext({ sampleRate: 24000 });
  const source = audioContext.createMediaStreamSource(mediaStream);

  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  processor.onaudioprocess = (event) => {
    const float32Data = event.inputBuffer.getChannelData(0);
    const int16Data = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Data[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const uint8Data = new Uint8Array(int16Data.buffer);
    const base64 = btoa(String.fromCharCode(...uint8Data));
    onData(base64);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
  workletNode = processor;
}

export function stopAudioCapture(): void {
  if (workletNode) {
    workletNode.disconnect();
    workletNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    mediaStream = null;
  }
}

export function onAppBackground(callback: () => void): () => void {
  const handler = () => {
    if (document.visibilityState === 'hidden') callback();
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
