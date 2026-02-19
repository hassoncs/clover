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
		name: "Slopcade",
		slug: "slopcade",
		scheme: "slopcade",

		ios: {
			...baseConfig.ios,
			bundleIdentifier: "app.slopcade",
			associatedDomains: ["applinks:slopcade.com"],
		},
		android: {
			...baseConfig.android,
			package: "app.slopcade",
			intentFilters: [
				{
					action: "VIEW",
					autoVerify: true,
					data: [
						{
							scheme: "https",
							host: "slopcade.com",
							pathPrefix: "/join",
						},
					],
					category: ["BROWSABLE", "DEFAULT"],
				},
			],
		},

		icon: "./assets/brands/slopcade/icon.png",
		splash: {
			...baseConfig.splash,
			image: "./assets/brands/slopcade/splash.png",
			backgroundColor: "#050608",
		},

		extra: {
			...baseConfig.extra,
			brandId: "slopcade",
			brandDisplayName: "Slopcade",
			brandDomain: "slopcade.com",
		},

		plugins,
	};
};
