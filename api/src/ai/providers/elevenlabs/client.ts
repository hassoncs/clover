import {
	VOICE_PRESETS,
	type VoicePreset,
	type VoicePresetId,
} from "@slopcade/shared";

const BASE_URL = "https://api.elevenlabs.io/v1";

export type OutputFormat =
	| "mp3_22050_32"
	| "mp3_44100_64"
	| "mp3_44100_96"
	| "mp3_44100_128"
	| "mp3_44100_192"
	| "pcm_16000"
	| "pcm_22050"
	| "pcm_24000"
	| "pcm_44100";

export interface SFXOptions {
	text: string;
	durationSeconds?: number;
	promptInfluence?: number;
	outputFormat?: OutputFormat;
}

export interface VoiceOptions {
	text: string;
	voiceId: string;
	modelId?: string;
	stability?: number;
	similarityBoost?: number;
	style?: number;
	outputFormat?: OutputFormat;
}

export interface BackgroundOptions {
	text: string;
	durationSeconds?: number;
	promptInfluence?: number;
	outputFormat?: OutputFormat;
}

export interface GenerationResult {
	audio: ArrayBuffer;
	contentType: string;
	durationSeconds: number | null;
}

export interface CostEstimate {
	type: "sfx" | "voice" | "background";
	estimatedCredits: number;
	details: string;
}

export class ElevenLabsService {
	private readonly apiKey: string;

	constructor(apiKey: string) {
		if (!apiKey) {
			throw new Error("ElevenLabs API key is required");
		}
		this.apiKey = apiKey;
	}

	async generateSFX(options: SFXOptions): Promise<GenerationResult> {
		const {
			text,
			durationSeconds = 2,
			promptInfluence = 0.3,
			outputFormat = "mp3_44100_128",
		} = options;

		if (!text) {
			throw new Error("SFX text prompt is required");
		}
		if (durationSeconds <= 0 || durationSeconds > 22) {
			throw new Error("SFX duration must be between 0 and 22 seconds");
		}
		if (promptInfluence < 0 || promptInfluence > 1) {
			throw new Error("Prompt influence must be between 0 and 1");
		}

		const url = new URL(`${BASE_URL}/sound-generation`);
		url.searchParams.set("output_format", outputFormat);

		const response = await fetch(url.toString(), {
			method: "POST",
			headers: {
				"xi-api-key": this.apiKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text,
				duration_seconds: durationSeconds,
				prompt_influence: promptInfluence,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`ElevenLabs SFX generation failed (${response.status}): ${errorText}`,
			);
		}

		const audio = await response.arrayBuffer();
		return {
			audio,
			contentType: getContentType(outputFormat),
			durationSeconds,
		};
	}

	async generateVoice(options: VoiceOptions): Promise<GenerationResult> {
		const {
			text,
			voiceId,
			modelId = "eleven_multilingual_v2",
			stability = 0.5,
			similarityBoost = 0.75,
			style = 0,
			outputFormat = "mp3_44100_128",
		} = options;

		if (!text) {
			throw new Error("Voice text is required");
		}
		if (!voiceId) {
			throw new Error("Voice ID is required");
		}

		const url = new URL(`${BASE_URL}/text-to-speech/${voiceId}`);
		url.searchParams.set("output_format", outputFormat);

		const response = await fetch(url.toString(), {
			method: "POST",
			headers: {
				"xi-api-key": this.apiKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text,
				model_id: modelId,
				voice_settings: {
					stability,
					similarity_boost: similarityBoost,
					style,
				},
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`ElevenLabs TTS generation failed (${response.status}): ${errorText}`,
			);
		}

		const audio = await response.arrayBuffer();
		return {
			audio,
			contentType: getContentType(outputFormat),
			durationSeconds: null,
		};
	}

	async generateBackground(
		options: BackgroundOptions,
	): Promise<GenerationResult> {
		const {
			text,
			durationSeconds = 10,
			promptInfluence = 0.3,
			outputFormat = "mp3_44100_128",
		} = options;

		if (!text) {
			throw new Error("Background sound text prompt is required");
		}
		if (durationSeconds <= 0 || durationSeconds > 22) {
			throw new Error("Background duration must be between 0 and 22 seconds");
		}

		return this.generateSFX({
			text: `ambient background: ${text}`,
			durationSeconds,
			promptInfluence,
			outputFormat,
		});
	}

	getVoicePresets(): Record<VoicePresetId, VoicePreset> {
		return VOICE_PRESETS;
	}

	estimateCost(
		type: "sfx" | "voice" | "background",
		durationOrCharCount: number,
	): CostEstimate {
		switch (type) {
			case "sfx":
				return {
					type: "sfx",
					estimatedCredits: 100,
					details: `SFX generation (${durationOrCharCount}s) — flat rate per generation`,
				};
			case "voice": {
				const charCredits = Math.ceil(durationOrCharCount / 1000) * 100;
				return {
					type: "voice",
					estimatedCredits: Math.max(charCredits, 100),
					details: `TTS for ${durationOrCharCount} chars — ~${charCredits} credits`,
				};
			}
			case "background":
				return {
					type: "background",
					estimatedCredits: 100,
					details: `Background generation (${durationOrCharCount}s) — flat rate per generation`,
				};
		}
	}
}

function getContentType(format: OutputFormat): string {
	if (format.startsWith("mp3")) return "audio/mpeg";
	if (format.startsWith("pcm")) return "audio/pcm";
	return "application/octet-stream";
}
