import type { ConfigContext, ExpoConfig } from "expo/config";
import appJson from "./app.json";

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
		name: "Slopbox",
		slug: "slopbox",
		scheme: "slopbox",

		ios: {
			...baseConfig.ios,
			bundleIdentifier: "tv.slopbox.app",
			associatedDomains: ["applinks:slopbox.tv"],
		},
		android: {
			...baseConfig.android,
			package: "tv.slopbox.app",
			intentFilters: [
				{
					action: "VIEW",
					autoVerify: true,
					data: [
						{
							scheme: "https",
							host: "slopbox.tv",
							pathPrefix: "/join",
						},
					],
					category: ["BROWSABLE", "DEFAULT"],
				},
			],
		},

		icon: "./assets/brands/slopbox/icon.png",
		splash: {
			...baseConfig.splash,
			image: "./assets/brands/slopbox/splash.png",
			backgroundColor: "#0D1117",
		},

		extra: {
			...baseConfig.extra,
			brandId: "slopbox",
			brandDisplayName: "Slopbox",
			brandDomain: "slopbox.tv",
		},

		plugins,
	};
};
