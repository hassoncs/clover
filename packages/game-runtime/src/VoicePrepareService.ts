import type {
	VoiceHandleId,
	VoicePrepareOptions,
	VoicePrepareStatus,
	VoiceWaitResult,
} from "@slopcade/shared/types/voice-handle";
import { nanoid } from "nanoid";

export interface VoiceGenerationResult {
	assetUrl: string;
}

export interface VoiceGenerationAdapter {
	generate(
		voicePreset: string,
		text: string,
		opts?: VoicePrepareOptions,
	): Promise<VoiceGenerationResult>;
}

interface HandleEntry {
	id: VoiceHandleId;
	cacheKey: string;
	phrase: string;
	voicePreset: string;
	status: VoicePrepareStatus;
	error?: string;
	assetUrl?: string;
}

interface InFlightEntry {
	promise: Promise<VoiceGenerationResult>;
	subscribers: VoiceHandleId[];
}

function buildCacheKey(
	voicePreset: string,
	text: string,
	opts?: VoicePrepareOptions,
): string {
	const normalizedText = text.trim().toLowerCase();
	const optsHash = opts
		? `${opts.stability ?? ""}_${opts.similarityBoost ?? ""}_${opts.style ?? ""}`
		: "";
	return `${voicePreset}:${normalizedText}:${optsHash}`;
}

export class VoicePrepareService {
	private handles = new Map<VoiceHandleId, HandleEntry>();
	private cache = new Map<string, string>();
	private inFlight = new Map<string, InFlightEntry>();
	private adapter: VoiceGenerationAdapter;
	private waiters: Array<{
		handleIds: VoiceHandleId[];
		resolve: (result: VoiceWaitResult) => void;
	}> = [];

	constructor(adapter: VoiceGenerationAdapter) {
		this.adapter = adapter;
	}

	prepare(
		voicePreset: string,
		text: string,
		opts?: VoicePrepareOptions,
	): VoiceHandleId {
		const cacheKey = buildCacheKey(voicePreset, text, opts);
		const handleId = nanoid(12);

		const entry: HandleEntry = {
			id: handleId,
			cacheKey,
			phrase: text,
			voicePreset,
			status: "pending",
		};
		this.handles.set(handleId, entry);

		const cachedUrl = this.cache.get(cacheKey);
		if (cachedUrl) {
			entry.status = "ready";
			entry.assetUrl = cachedUrl;
			return handleId;
		}

		const existing = this.inFlight.get(cacheKey);
		if (existing) {
			existing.subscribers.push(handleId);
			return handleId;
		}

		const promise = this.adapter.generate(voicePreset, text, opts);
		const flight: InFlightEntry = { promise, subscribers: [handleId] };
		this.inFlight.set(cacheKey, flight);

		promise
			.then((result) => {
				this.cache.set(cacheKey, result.assetUrl);
				for (const subId of flight.subscribers) {
					const h = this.handles.get(subId);
					if (h && h.status === "pending") {
						h.status = "ready";
						h.assetUrl = result.assetUrl;
					}
				}
			})
			.catch((err) => {
				const message = err instanceof Error ? err.message : String(err);
				for (const subId of flight.subscribers) {
					const h = this.handles.get(subId);
					if (h && h.status === "pending") {
						h.status = "failed";
						h.error = message;
					}
				}
			})
			.finally(() => {
				this.inFlight.delete(cacheKey);
				this.checkWaiters();
			});

		return handleId;
	}

	getStatus(handleId: VoiceHandleId): VoicePrepareStatus | null {
		return this.handles.get(handleId)?.status ?? null;
	}

	isReady(handleId: VoiceHandleId): boolean {
		return this.handles.get(handleId)?.status === "ready";
	}

	getPlayableAsset(handleId: VoiceHandleId): string | null {
		const entry = this.handles.get(handleId);
		if (!entry || entry.status !== "ready") return null;
		return entry.assetUrl ?? null;
	}

	async awaitMany(handleIds: VoiceHandleId[]): Promise<VoiceWaitResult> {
		const result = this.buildWaitResult(handleIds);
		if (result.pending.length === 0) return result;

		return new Promise<VoiceWaitResult>((resolve) => {
			this.waiters.push({ handleIds, resolve });
		});
	}

	cancelAll(): void {
		for (const [, entry] of this.handles) {
			if (entry.status === "pending") {
				entry.status = "cancelled";
			}
		}
		this.inFlight.clear();

		for (const waiter of this.waiters) {
			waiter.resolve(this.buildWaitResult(waiter.handleIds));
		}
		this.waiters = [];
	}

	dispose(): void {
		this.cancelAll();
		this.handles.clear();
		this.cache.clear();
	}

	private buildWaitResult(handleIds: VoiceHandleId[]): VoiceWaitResult {
		const ready: VoiceHandleId[] = [];
		const failed: VoiceHandleId[] = [];
		const pending: VoiceHandleId[] = [];

		for (const id of handleIds) {
			const entry = this.handles.get(id);
			if (!entry) {
				failed.push(id);
				continue;
			}
			switch (entry.status) {
				case "ready":
					ready.push(id);
					break;
				case "failed":
				case "cancelled":
					failed.push(id);
					break;
				case "pending":
					pending.push(id);
					break;
			}
		}
		return { ready, failed, pending };
	}

	private checkWaiters(): void {
		const remaining: typeof this.waiters = [];
		for (const waiter of this.waiters) {
			const result = this.buildWaitResult(waiter.handleIds);
			if (result.pending.length === 0) {
				waiter.resolve(result);
			} else {
				remaining.push(waiter);
			}
		}
		this.waiters = remaining;
	}
}
