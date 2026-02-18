import type {
	AssetResponse,
	JobResponse,
	JobStatus,
	Model,
	ModelsResponse,
	ScenarioConfig,
	UploadResponse,
} from "@/ai/providers/scenario/types";
import { MIME_TO_EXT, SCENARIO_DEFAULTS } from "@/ai/providers/scenario/types";

// Log level utility for production-safe debugging
const LOG_LEVEL = process.env.LOG_LEVEL || "INFO";
const LOG_LEVELS: Record<string, number> = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
};

function shouldLog(level: string): boolean {
	return (LOG_LEVELS[level] ?? 1) >= (LOG_LEVELS[LOG_LEVEL] ?? 1);
}

export function scenarioLog(
	level: string,
	context: string,
	message: string,
): void {
	if (shouldLog(level)) {
		const formatted = `[Scenario] [${level}] ${context ? `[${context}] ` : ""}${message}`;
		if (level === "ERROR") console.error(formatted);
		else if (level === "WARN") console.warn(formatted);
		else console.log(formatted);
	}
}

export class ScenarioClient {
	private apiKey: string;
	private apiSecret: string;
	private apiUrl: string;

	constructor(config: ScenarioConfig) {
		this.apiKey = config.apiKey;
		this.apiSecret = config.apiSecret;
		this.apiUrl = config.apiUrl ?? SCENARIO_DEFAULTS.API_URL;

		if (!this.apiKey || !this.apiSecret) {
			throw new Error(
				"Scenario API credentials required. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.",
			);
		}
	}

	private getAuthHeader(): string {
		const credentials = `${this.apiKey}:${this.apiSecret}`;
		return `Basic ${btoa(credentials)}`;
	}

	async request<T>(
		method: "GET" | "POST",
		endpoint: string,
		body?: Record<string, unknown>,
	): Promise<T> {
		const url = `${this.apiUrl}${endpoint}`;
		const headers: HeadersInit = {
			Authorization: this.getAuthHeader(),
			"Content-Type": "application/json",
		};

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const message =
				(errorData as { error?: { message?: string }; message?: string }).error
					?.message ??
				(errorData as { message?: string }).message ??
				`HTTP ${response.status}`;
			throw new Error(`Scenario API error: ${message}`);
		}

		return response.json() as Promise<T>;
	}

	async pollJobUntilComplete(jobId: string): Promise<string[]> {
		for (
			let attempt = 0;
			attempt < SCENARIO_DEFAULTS.MAX_POLL_ATTEMPTS;
			attempt++
		) {
			const response = await this.request<JobResponse>("GET", `/jobs/${jobId}`);
			const job = response.job;

			if (!job) {
				throw new Error("Invalid job response");
			}

			const status: JobStatus = job.status;

			scenarioLog(
				"DEBUG",
				jobId,
				`Polling: status=${status} (attempt ${attempt + 1}/${SCENARIO_DEFAULTS.MAX_POLL_ATTEMPTS})`,
			);

			if (status === "success") {
				const assetIds = job.metadata?.assetIds ?? [];
				if (assetIds.length === 0) {
					throw new Error("No assets generated");
				}
				scenarioLog(
					"INFO",
					jobId,
					`Job succeeded: ${assetIds.length} asset(s) generated`,
				);
				return assetIds;
			}

			if (status === "failed" || status === "cancelled") {
				throw new Error(job.error ?? `Job ${status}`);
			}

			await this.sleep(SCENARIO_DEFAULTS.POLL_INTERVAL_MS);
		}

		throw new Error("Job timed out");
	}

	async getAssetDetails(
		assetId: string,
	): Promise<{ url: string; mimeType?: string }> {
		const response = await this.request<AssetResponse>(
			"GET",
			`/assets/${assetId}`,
		);
		const asset = response.asset;

		if (!asset?.url) {
			throw new Error(`No URL found for asset ${assetId}`);
		}

		return { url: asset.url, mimeType: asset.mimeType };
	}

	async downloadAsset(assetId: string): Promise<{
		buffer: ArrayBuffer;
		mimeType: string;
		extension: string;
	}> {
		scenarioLog("DEBUG", "", `Downloading asset: ${assetId}`);

		const { url, mimeType } = await this.getAssetDetails(assetId);

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to download asset: HTTP ${response.status}`);
		}

		const buffer = await response.arrayBuffer();
		const extension = MIME_TO_EXT[mimeType ?? ""] ?? ".png";

		scenarioLog(
			"INFO",
			"",
			`Downloaded: ${assetId} (${mimeType}, ${extension})`,
		);

		return { buffer, mimeType: mimeType ?? "image/png", extension };
	}

	async uploadAsset(imageBuffer: ArrayBuffer, name?: string): Promise<string> {
		scenarioLog(
			"DEBUG",
			"",
			`Uploading asset: ${name ?? "unnamed"} (size: ${imageBuffer.byteLength} bytes)`,
		);

		const base64Image = this.arrayBufferToBase64(imageBuffer);

		const response = await this.request<UploadResponse>("POST", "/assets", {
			image: base64Image,
			name: name ?? `upload-${Date.now()}`,
		});

		const assetId = response.asset?.id;
		if (!assetId) {
			throw new Error("No asset ID returned from upload");
		}

		scenarioLog("INFO", "", `Asset uploaded: ${assetId}`);

		return assetId;
	}

	async listModels(includePublic = false): Promise<Model[]> {
		const endpoint = includePublic ? "/models/public" : "/models";
		const response = await this.request<ModelsResponse>("GET", endpoint);
		return response.models ?? [];
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = "";
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}
}

export function createScenarioClient(env: {
	SCENARIO_API_KEY?: string;
	SCENARIO_SECRET_API_KEY?: string;
	SCENARIO_API_URL?: string;
}): ScenarioClient {
	const apiKey = env.SCENARIO_API_KEY;
	const apiSecret = env.SCENARIO_SECRET_API_KEY;

	if (!apiKey || !apiSecret) {
		throw new Error(
			"Missing Scenario API credentials. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.",
		);
	}

	return new ScenarioClient({
		apiKey,
		apiSecret,
		apiUrl: env.SCENARIO_API_URL,
	});
}
