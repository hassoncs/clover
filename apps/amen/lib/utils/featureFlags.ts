import { getStorageItem, setStorageItem } from "./storage";

export interface FeatureFlags {
	useRemixDefault: boolean;
	experimentalAiFeatures: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
	useRemixDefault: false,
	experimentalAiFeatures: false,
};

const FEATURE_FLAGS_KEY = "slopcade_feature_flags";

export async function getFeatureFlags(): Promise<FeatureFlags> {
	return await getStorageItem<FeatureFlags>(
		FEATURE_FLAGS_KEY,
		DEFAULT_FEATURE_FLAGS,
	);
}

export async function isFeatureEnabled(
	flag: keyof FeatureFlags,
): Promise<boolean> {
	const flags = await getFeatureFlags();
	return flags[flag] ?? DEFAULT_FEATURE_FLAGS[flag];
}

export async function setFeatureFlags(
	flags: Partial<FeatureFlags>,
): Promise<void> {
	const current = await getFeatureFlags();
	await setStorageItem(FEATURE_FLAGS_KEY, { ...current, ...flags });
}

export async function resetFeatureFlags(): Promise<void> {
	await setStorageItem(FEATURE_FLAGS_KEY, DEFAULT_FEATURE_FLAGS);
}
