import {
	VOICE_PRESETS,
	type VoicePresetId,
} from "@slopcade/shared/constants/voice-presets";
import type { VoicePrepareOptions } from "@slopcade/shared/types/voice-handle";
import type {
	VoiceGenerationAdapter,
	VoiceGenerationResult,
} from "./VoicePrepareService";

interface FetchAdapterConfig {
	apiUrl: string;
	getAuthToken: () => Promise<string | null>;
}

export class FetchVoiceGenerationAdapter implements VoiceGenerationAdapter {
	private config: FetchAdapterConfig;

	constructor(config: FetchAdapterConfig) {
		this.config = config;
	}

	async generate(
		voicePreset: string,
		text: string,
		opts?: VoicePrepareOptions,
	): Promise<VoiceGenerationResult> {
		const preset = VOICE_PRESETS[voicePreset as VoicePresetId];
		if (!preset) {
			throw new Error(`Unknown voice preset: ${voicePreset}`);
		}

		const token = await this.config.getAuthToken();
		if (!token) {
			throw new Error("Not authenticated");
		}

		const response = await fetch(
			`${this.config.apiUrl}/api/audio/generate-voice`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					text,
					voiceId: preset.voiceId,
					modelId: "eleven_flash_v2_5",
					stability: opts?.stability ?? 0.5,
					similarityBoost: opts?.similarityBoost ?? 0.75,
					style: opts?.style ?? 0,
				}),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Voice generation failed (${response.status}): ${errorText}`,
			);
		}

		const data = (await response.json()) as {
			assetId: string;
			url: string;
			contentType: string;
			durationSeconds: number | null;
		};

		const assetUrl = data.url.startsWith("http")
			? data.url
			: `${this.config.apiUrl}${data.url}`;

		return { assetUrl };
	}
}
