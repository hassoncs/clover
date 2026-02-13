import { AppState, type NativeEventSubscription } from "react-native";
import LiveAudioStream from "react-native-live-audio-stream";

const AUDIO_CONFIG = {
	sampleRate: 24000,
	channels: 1,
	bitsPerSample: 16,
	audioSource: 6,
	bufferSize: 4096,
	wavFile: "",
};

function computeRMSFromBase64(base64: string): number {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	const int16 = new Int16Array(bytes.buffer);
	let sum = 0;
	for (let i = 0; i < int16.length; i++) {
		const normalized = int16[i] / 32768;
		sum += normalized * normalized;
	}
	return Math.sqrt(sum / int16.length);
}

export function initAudioCapture(): void {
	LiveAudioStream.init(AUDIO_CONFIG);
}

export function startAudioCapture(
	onData: (base64Chunk: string) => void,
	onVolume?: (level: number) => void,
): void {
	LiveAudioStream.on("data", (base64: string) => {
		onData(base64);
		if (onVolume) {
			onVolume(computeRMSFromBase64(base64));
		}
	});
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
	const subscription: NativeEventSubscription = AppState.addEventListener(
		"change",
		(state) => {
			if (state === "background") callback();
		},
	);
	return () => subscription.remove();
}
