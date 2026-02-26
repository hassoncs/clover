import {
	DEFAULT_FEATURE_FLAGS,
	getFeatureFlags,
	isFeatureEnabled,
	resetFeatureFlags,
	setFeatureFlags,
} from "../featureFlags";
import { storage } from "../storage";

jest.mock("../storage", () => ({
	storage: {
		getItem: jest.fn(),
		setItem: jest.fn(),
		removeItem: jest.fn(),
		clear: jest.fn(),
	},
	getStorageItem: jest.fn(),
	setStorageItem: jest.fn(),
}));

import { getStorageItem, setStorageItem } from "../storage";

describe("featureFlags", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should return default flags when none are stored", async () => {
		jest.mocked(getStorageItem).mockResolvedValue(DEFAULT_FEATURE_FLAGS);

		const flags = await getFeatureFlags();
		expect(flags).toEqual(DEFAULT_FEATURE_FLAGS);
	});

	it("should check if a feature is enabled", async () => {
		jest.mocked(getStorageItem).mockResolvedValue({
			...DEFAULT_FEATURE_FLAGS,
			useRemixDefault: true,
		});

		const enabled = await isFeatureEnabled("useRemixDefault");
		expect(enabled).toBe(true);
	});

	it("should set feature flags", async () => {
		jest.mocked(getStorageItem).mockResolvedValue(DEFAULT_FEATURE_FLAGS);

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
