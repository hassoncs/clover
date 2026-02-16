import { getBrandManifest } from "@slopcade/brands";
import type { ConfigContext, ExpoConfig } from "expo/config";
import appJson from "./app.json";

const BRAND_ID = process.env.BRAND_ID || "slopcade";
const brand = getBrandManifest(BRAND_ID);

export default ({ config }: ConfigContext): ExpoConfig => {
	const baseConfig = appJson.expo as unknown as ExpoConfig;

	const plugins: NonNullable<ExpoConfig["plugins"]> = [
		...(baseConfig.plugins ?? []),
	];

	if (process.env.SENTRY_AUTH_TOKEN) {
		plugins.push([
			"@sentry/react-native",
			{
				disableAutoUploadSourceMaps: false,
			},
		]);
	} else if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
		plugins.push([
			"@sentry/react-native",
			{
				disableAutoUploadSourceMaps: true,
			},
		]);
	}

	return {
		...baseConfig,
		name: brand.displayName,
		slug: brand.id,
		scheme: brand.scheme,

		ios: {
			...baseConfig.ios,
			bundleIdentifier: brand.ios.bundleIdentifier,
			associatedDomains: [`applinks:${brand.domain}`],
		},
		android: {
			...baseConfig.android,
			package: brand.android.package,
			intentFilters: [
				{
					action: "VIEW",
					autoVerify: true,
					data: [
						{
							scheme: "https",
							host: brand.domain,
							pathPrefix: "/join",
						},
					],
					category: ["BROWSABLE", "DEFAULT"],
				},
			],
		},

		icon: `./assets/brands/${brand.id}/icon.png`,
		splash: {
			...baseConfig.splash,
			image: `./assets/brands/${brand.id}/splash.png`,
			backgroundColor: brand.theme.colors.background,
		},

		extra: {
			...baseConfig.extra,
			brandId: brand.id,
			brandDisplayName: brand.displayName,
			brandDomain: brand.domain,
		},

		plugins,
	};
};
