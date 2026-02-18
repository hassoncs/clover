import { type ScenarioClient, scenarioLog } from "./client";

export class ScenarioAudioClient {
	constructor(private client: ScenarioClient) {}

	async createMusicJob(params: {
		modelId: string;
		prompt: string;
		durationSeconds: number;
		negativePrompt?: string;
		lyrics?: string;
	}): Promise<string> {
		const payload: Record<string, unknown> = {
			prompt: params.prompt,
			duration: params.durationSeconds,
		};
		if (params.negativePrompt) payload.negativePrompt = params.negativePrompt;
		if (params.lyrics) payload.lyrics = params.lyrics;

		scenarioLog(
			"DEBUG",
			"",
			`POST /generate/custom/${params.modelId} - music: "${params.prompt.substring(0, 80)}..." duration: ${params.durationSeconds}s`,
		);

		const response = await this.client.request<{ job?: { jobId?: string } }>(
			"POST",
			`/generate/custom/${params.modelId}`,
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) throw new Error("No jobId returned from music generation");

		scenarioLog("INFO", "", `Music job created: ${jobId}`);
		return jobId;
	}

	async createSfxJob(params: {
		modelId: string;
		text: string;
		durationSeconds?: number;
		promptInfluence?: number;
		loop?: boolean;
		outputFormat?: string;
	}): Promise<string> {
		const payload: Record<string, unknown> = {
			text: params.text,
		};
		if (params.durationSeconds !== undefined) {
			payload.durationSeconds = params.durationSeconds;
		}
		if (params.promptInfluence !== undefined) {
			payload.promptInfluence = params.promptInfluence;
		}
		if (params.loop !== undefined) {
			payload.loop = params.loop;
		}
		if (params.outputFormat !== undefined) {
			payload.outputFormat = params.outputFormat;
		}

		scenarioLog(
			"DEBUG",
			"",
			`POST /generate/custom/${params.modelId} - sfx: "${params.text.substring(0, 60)}..."`,
		);

		const response = await this.client.request<{ job?: { jobId?: string } }>(
			"POST",
			`/generate/custom/${params.modelId}`,
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) throw new Error("No jobId returned from SFX generation");

		scenarioLog("INFO", "", `SFX job created: ${jobId}`);
		return jobId;
	}

	async createVoiceJob(params: {
		modelId: string;
		text: string;
		voice: string;
		stability?: number;
		similarityBoost?: number;
		styleExaggeration?: number;
		speed?: number;
		languageCode?: string;
	}): Promise<string> {
		const payload: Record<string, unknown> = {
			text: params.text,
			voice: params.voice,
		};
		if (params.stability !== undefined) payload.stability = params.stability;
		if (params.similarityBoost !== undefined) {
			payload.similarityBoost = params.similarityBoost;
		}
		if (params.styleExaggeration !== undefined) {
			payload.styleExaggeration = params.styleExaggeration;
		}
		if (params.speed !== undefined) payload.speed = params.speed;
		if (params.languageCode !== undefined) {
			payload.languageCode = params.languageCode;
		}

		scenarioLog(
			"DEBUG",
			"",
			`POST /generate/custom/${params.modelId} - voice: "${params.voice}" text: "${params.text.substring(0, 40)}..."`,
		);

		const response = await this.client.request<{ job?: { jobId?: string } }>(
			"POST",
			`/generate/custom/${params.modelId}`,
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) throw new Error("No jobId returned from voice generation");

		scenarioLog("INFO", "", `Voice job created: ${jobId}`);
		return jobId;
	}
}
