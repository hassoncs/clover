import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type VoiceGenerationAdapter,
	type VoiceGenerationResult,
	VoicePrepareService,
} from "./VoicePrepareService";

function createMockAdapter(
	behavior: "success" | "fail" = "success",
): VoiceGenerationAdapter & { callCount: number } {
	const adapter = {
		callCount: 0,
		generate: vi.fn(
			async (
				voicePreset: string,
				text: string,
			): Promise<VoiceGenerationResult> => {
				adapter.callCount++;
				if (behavior === "fail") {
					throw new Error("Generation failed");
				}
				return {
					assetUrl: `/assets/audio/voice/${voicePreset}-${text.replace(/\s+/g, "-")}.mp3`,
				};
			},
		),
	};
	return adapter;
}

function createDeferredAdapter(): VoiceGenerationAdapter & {
	callCount: number;
	resolve: (result: VoiceGenerationResult) => void;
	reject: (err: Error) => void;
} {
	let resolve!: (result: VoiceGenerationResult) => void;
	let reject!: (err: Error) => void;
	const adapter = {
		callCount: 0,
		resolve: (r: VoiceGenerationResult) => resolve(r),
		reject: (e: Error) => reject(e),
		generate: vi.fn(async (): Promise<VoiceGenerationResult> => {
			adapter.callCount++;
			return new Promise<VoiceGenerationResult>((res, rej) => {
				resolve = res;
				reject = rej;
			});
		}),
	};
	return adapter;
}

describe("VoicePrepareService", () => {
	let adapter: ReturnType<typeof createMockAdapter>;
	let service: VoicePrepareService;

	beforeEach(() => {
		adapter = createMockAdapter();
		service = new VoicePrepareService(adapter);
	});

	it("returns a handle id from prepare", () => {
		const handle = service.prepare("announcer", "hello world");
		expect(typeof handle).toBe("string");
		expect(handle.length).toBeGreaterThan(0);
	});

	it("transitions to ready on successful generation", async () => {
		const handle = service.prepare("announcer", "hello");
		expect(service.getStatus(handle)).toBe("pending");

		await vi.waitFor(() => {
			expect(service.getStatus(handle)).toBe("ready");
		});

		expect(service.isReady(handle)).toBe(true);
		expect(service.getPlayableAsset(handle)).toContain("/assets/audio/voice/");
	});

	it("transitions to failed on generation error", async () => {
		const failAdapter = createMockAdapter("fail");
		const failService = new VoicePrepareService(failAdapter);

		const handle = failService.prepare("announcer", "fail text");

		await vi.waitFor(() => {
			expect(failService.getStatus(handle)).toBe("failed");
		});

		expect(failService.isReady(handle)).toBe(false);
		expect(failService.getPlayableAsset(handle)).toBeNull();
	});

	it("deduplicates in-flight requests for same phrase+voice", async () => {
		const deferred = createDeferredAdapter();
		const dedupService = new VoicePrepareService(deferred);

		const h1 = dedupService.prepare("announcer", "same phrase");
		const h2 = dedupService.prepare("announcer", "same phrase");

		expect(h1).not.toBe(h2);
		expect(deferred.callCount).toBe(1);

		deferred.resolve({ assetUrl: "/assets/audio/voice/test.mp3" });

		await vi.waitFor(() => {
			expect(dedupService.isReady(h1)).toBe(true);
			expect(dedupService.isReady(h2)).toBe(true);
		});
	});

	it("does not dedupe different phrases", async () => {
		const handle1 = service.prepare("announcer", "phrase one");
		const handle2 = service.prepare("announcer", "phrase two");

		await vi.waitFor(() => {
			expect(service.isReady(handle1)).toBe(true);
			expect(service.isReady(handle2)).toBe(true);
		});

		expect(adapter.callCount).toBe(2);
	});

	it("uses cache for already-generated phrase", async () => {
		const h1 = service.prepare("announcer", "cached");

		await vi.waitFor(() => {
			expect(service.isReady(h1)).toBe(true);
		});

		expect(adapter.callCount).toBe(1);

		const h2 = service.prepare("announcer", "cached");
		expect(service.isReady(h2)).toBe(true);
		expect(adapter.callCount).toBe(1);
	});

	it("normalizes text for cache key (trim + lowercase)", async () => {
		const h1 = service.prepare("announcer", "  Hello World  ");

		await vi.waitFor(() => {
			expect(service.isReady(h1)).toBe(true);
		});

		const h2 = service.prepare("announcer", "hello world");
		expect(service.isReady(h2)).toBe(true);
		expect(adapter.callCount).toBe(1);
	});

	it("awaitMany resolves when all handles complete", async () => {
		const h1 = service.prepare("announcer", "one");
		const h2 = service.prepare("announcer", "two");

		const result = await service.awaitMany([h1, h2]);
		expect(result.ready).toContain(h1);
		expect(result.ready).toContain(h2);
		expect(result.failed).toHaveLength(0);
		expect(result.pending).toHaveLength(0);
	});

	it("awaitMany includes failed handles in result", async () => {
		const failAdapter = createMockAdapter("fail");
		const failService = new VoicePrepareService(failAdapter);

		const h1 = failService.prepare("announcer", "fail");
		const result = await failService.awaitMany([h1]);

		expect(result.failed).toContain(h1);
		expect(result.ready).toHaveLength(0);
	});

	it("cancelAll marks pending handles as cancelled", () => {
		const deferred = createDeferredAdapter();
		const cancelService = new VoicePrepareService(deferred);

		const h1 = cancelService.prepare("announcer", "cancel me");
		expect(cancelService.getStatus(h1)).toBe("pending");

		cancelService.cancelAll();
		expect(cancelService.getStatus(h1)).toBe("cancelled");
	});

	it("cancelAll resolves pending waiters", async () => {
		const deferred = createDeferredAdapter();
		const cancelService = new VoicePrepareService(deferred);

		const h1 = cancelService.prepare("announcer", "will cancel");

		const waitPromise = cancelService.awaitMany([h1]);
		cancelService.cancelAll();

		const result = await waitPromise;
		expect(result.failed).toContain(h1);
		expect(result.pending).toHaveLength(0);
	});

	it("getStatus returns null for unknown handle", () => {
		expect(service.getStatus("nonexistent")).toBeNull();
	});

	it("getPlayableAsset returns null for non-ready handle", () => {
		const deferred = createDeferredAdapter();
		const svc = new VoicePrepareService(deferred);
		const h = svc.prepare("announcer", "pending");
		expect(svc.getPlayableAsset(h)).toBeNull();
	});
});
