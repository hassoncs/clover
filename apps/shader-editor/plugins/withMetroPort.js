const {
	withDangerousMod,
	withPodfileProperties,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const METRO_PORT = "8088";

function withMetroPodfileProperties(config) {
	return withPodfileProperties(config, (config) => {
		config.modResults["ios.buildReactNativeFromSource"] = "true";
		config.modResults["apple.ccacheEnabled"] = "true";
		console.log(
			"[withMetroPort] Set ios.buildReactNativeFromSource=true, apple.ccacheEnabled=true",
		);
		return config;
	});
}

function withMetroPodfile(config) {
	return withDangerousMod(config, [
		"ios",
		async (config) => {
			const podfilePath = path.join(
				config.modRequest.platformProjectRoot,
				"Podfile",
			);

			if (!fs.existsSync(podfilePath)) {
				console.warn("[withMetroPort] Podfile not found, skipping");
				return config;
			}

			let podfile = fs.readFileSync(podfilePath, "utf8");

			const metroPortLine = `ENV['RCT_METRO_PORT'] = '${METRO_PORT}'`;

			if (podfile.includes("ENV['RCT_METRO_PORT']")) {
				console.log("[withMetroPort] RCT_METRO_PORT already set in Podfile");
				return config;
			}

			const platformLineRegex = /^(platform :ios.*$)/m;
			const match = podfile.match(platformLineRegex);

			if (match) {
				const insertBlock = `\n${metroPortLine}\n\n`;
				podfile = podfile.replace(platformLineRegex, insertBlock + "$1");
				fs.writeFileSync(podfilePath, podfile);
				console.log(
					`[withMetroPort] Added RCT_METRO_PORT=${METRO_PORT} to Podfile`,
				);
			} else {
				console.warn(
					"[withMetroPort] Could not find platform :ios line in Podfile",
				);
			}

			return config;
		},
	]);
}

function withMetroPort(config) {
	config = withMetroPodfileProperties(config);
	config = withMetroPodfile(config);
	return config;
}

module.exports = withMetroPort;
