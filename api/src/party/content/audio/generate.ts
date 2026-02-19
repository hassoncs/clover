import { BRAND_VOICES } from "@slopcade/shared";
import {
	DEFAULT_VOICE_MODEL,
	VOICE_MODELS,
} from "@slopcade/shared/constants/audio-voice-models";
import { ElevenLabsService } from "@/ai/providers/elevenlabs";
import {
	createScenarioClient,
	ScenarioAudioClient,
	type ScenarioClient,
} from "@/ai/providers/scenario";
import { buildContentAudioR2Key, SKIP_VOICE_TYPES } from "./r2-keys";
import { getReadableText, sanitizeForTTS } from "./readable-text";

export type AudioProvider = "scenario" | "elevenlabs";

export interface ContentAudioInput {
	contentId: string;
	brandId: string;
	contentType: string;
	body: string;
}

export interface GeneratedAudio {
	contentId: string;
	r2Key: string;
	audioBytes: Uint8Array;
}

export interface AudioGenerationEnv {
	SCENARIO_API_KEY?: string;
	SCENARIO_SECRET_API_KEY?: string;
	SCENARIO_API_URL?: string;
	ELEVENLABS_API_KEY?: string;
}

export function createAudioGenerator(
	env: AudioGenerationEnv,
	provider: AudioProvider = "scenario",
) {
	let scenarioBase: ScenarioClient | undefined;
	let scenarioAudio: ScenarioAudioClient | undefined;
	let elevenLabs: ElevenLabsService | undefined;

	if (provider === "scenario") {
		scenarioBase = createScenarioClient(env);
		scenarioAudio = new ScenarioAudioClient(scenarioBase);
	} else {
		if (!env.ELEVENLABS_API_KEY) {
			throw new Error("ELEVENLABS_API_KEY required for ElevenLabs provider");
		}
		elevenLabs = new ElevenLabsService(env.ELEVENLABS_API_KEY);
	}

	return async function generateAudioForContent(
		input: ContentAudioInput,
	): Promise<GeneratedAudio | null> {
		if (SKIP_VOICE_TYPES.has(input.contentType)) return null;

		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(input.body);
		} catch {
			return null;
		}

		const rawText = getReadableText(parsed, input.contentType);
		if (!rawText) return null;

		const text = sanitizeForTTS(rawText);
		const r2Key = buildContentAudioR2Key(
			input.brandId,
			input.contentType,
			input.contentId,
		);

		const voice = BRAND_VOICES[input.brandId]?.rules;
		if (!voice) {
			throw new Error(`No voice config for brand: ${input.brandId}`);
		}

		let audioBytes: Uint8Array;

		if (provider === "scenario" && scenarioBase && scenarioAudio) {
			const voiceModel = VOICE_MODELS[DEFAULT_VOICE_MODEL];
			if (!voiceModel)
				throw new Error(`Voice model not found: ${DEFAULT_VOICE_MODEL}`);

			const scenarioVoice = "George";

			const jobId = await scenarioAudio.createVoiceJob({
				modelId: voiceModel.scenarioModelId,
				text,
				voice: scenarioVoice,
				stability: voice.settings.stability,
				similarityBoost: voice.settings.similarityBoost,
				styleExaggeration: voice.settings.style,
			});

			const assetIds = await scenarioBase.pollJobUntilComplete(jobId);
			const assetId = assetIds[0];
			if (!assetId)
				throw new Error("Voice job completed but returned no assets");

			const downloaded = await scenarioBase.downloadAsset(assetId);
			audioBytes = new Uint8Array(downloaded.buffer);
		} else if (elevenLabs) {
			const result = await elevenLabs.generateVoice({
				text,
				voiceId: voice.voiceId,
				modelId: voice.model,
				stability: voice.settings.stability,
				similarityBoost: voice.settings.similarityBoost,
				style: voice.settings.style,
				outputFormat: "mp3_44100_128",
			});
			audioBytes = new Uint8Array(result.audio);
		} else {
			throw new Error("No audio provider configured");
		}

		return { contentId: input.contentId, r2Key, audioBytes };
	};
}
