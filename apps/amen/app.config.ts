import type { ConfigContext, ExpoConfig } from "expo/config";
import appJson from "./app.json";

/**
 * Amen App Configuration
 *
 * Hardcoded configuration for the Amen app - a standalone Christian party games app.
 * Scripture. Fellowship. Fun.
 */
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
		name: "Amen",
		slug: "amen",
		scheme: "amen",

		ios: {
			...baseConfig.ios,
			bundleIdentifier: "games.amen.app",
			associatedDomains: ["applinks:amen.games"],
		},
		android: {
			...baseConfig.android,
			package: "games.amen.app",
			intentFilters: [
				{
					action: "VIEW",
					autoVerify: true,
					data: [
						{
							scheme: "https",
							host: "amen.games",
							pathPrefix: "/join",
						},
					],
					category: ["BROWSABLE", "DEFAULT"],
				},
			],
		},

		icon: "./assets/brands/amen/icon.png",
		splash: {
			...baseConfig.splash,
			image: "./assets/brands/amen/splash.png",
			backgroundColor: "#0D1C33", // Amen dark theme background
		},

		extra: {
			...baseConfig.extra,
			brandId: "amen",
			brandDisplayName: "Amen",
			brandDomain: "amen.games",
		},

		plugins,
	};
};
