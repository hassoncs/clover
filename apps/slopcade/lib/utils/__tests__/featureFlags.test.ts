import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_FEATURE_FLAGS,
	getFeatureFlags,
	isFeatureEnabled,
	resetFeatureFlags,
	setFeatureFlags,
} from "../featureFlags";
import { storage } from "../storage";

vi.mock("../storage", () => ({
	storage: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
	},
	getStorageItem: vi.fn(),
	setStorageItem: vi.fn(),
}));

import { getStorageItem, setStorageItem } from "../storage";

describe("featureFlags", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return default flags when none are stored", async () => {
		vi.mocked(getStorageItem).mockResolvedValue(DEFAULT_FEATURE_FLAGS);

		const flags = await getFeatureFlags();
		expect(flags).toEqual(DEFAULT_FEATURE_FLAGS);
	});

	it("should check if a feature is enabled", async () => {
		vi.mocked(getStorageItem).mockResolvedValue({
			...DEFAULT_FEATURE_FLAGS,
			useRemixDefault: true,
		});

		const enabled = await isFeatureEnabled("useRemixDefault");
		expect(enabled).toBe(true);
	});

	it("should set feature flags", async () => {
		vi.mocked(getStorageItem).mockResolvedValue(DEFAULT_FEATURE_FLAGS);

		await setFeatureFlags({ useRemixDefault: true });

		expect(setStorageItem).toHaveBeenCalledWith(expect.any(String), {
			...DEFAULT_FEATURE_FLAGS,
			useRemixDefault: true,
		});
	});

	it("should reset feature flags", async () => {
		await resetFeatureFlags();
		expect(setStorageItem).toHaveBeenCalledWith(
			expect.any(String),
			DEFAULT_FEATURE_FLAGS,
		);
	});
});
