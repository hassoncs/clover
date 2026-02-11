let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let workletNode: ScriptProcessorNode | null = null;

export function initAudioCapture(): void {
  console.log('[AudioCapture.web] initAudioCapture()');
}

export async function startAudioCapture(onData: (base64Chunk: string) => void): Promise<void> {
  console.log('[AudioCapture.web] startAudioCapture() - requesting mic permission...');
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    console.log('[AudioCapture.web] Mic permission granted, tracks:', mediaStream.getTracks().length);
  } catch (err) {
    console.error('[AudioCapture.web] getUserMedia failed:', err);
    throw err;
  }

  audioContext = new AudioContext({ sampleRate: 24000 });
  console.log('[AudioCapture.web] AudioContext created, sampleRate:', audioContext.sampleRate, 'state:', audioContext.state);
  const source = audioContext.createMediaStreamSource(mediaStream);

  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  let chunkCount = 0;
  processor.onaudioprocess = (event) => {
    chunkCount++;
    const float32Data = event.inputBuffer.getChannelData(0);
    const int16Data = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Data[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const uint8Data = new Uint8Array(int16Data.buffer);
    const base64 = btoa(String.fromCharCode(...uint8Data));
    if (chunkCount <= 3) {
      console.log('[AudioCapture.web] Sending audio chunk #' + chunkCount + ', size:', base64.length);
    }
    onData(base64);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
  workletNode = processor;
  console.log('[AudioCapture.web] Audio pipeline connected, listening...');
}

export function stopAudioCapture(): void {
  console.log('[AudioCapture.web] stopAudioCapture()');
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
