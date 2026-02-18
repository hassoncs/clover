/**
 * Expo Config Plugin: withMetroPort
 * 
 * Ensures Metro bundler uses port 8085 instead of default 8081.
 * This plugin runs during `expo prebuild` and modifies:
 * 
 * 1. Podfile.properties.json - enables building React Native from source
 *    (required because prebuilt binaries have port 8081 hardcoded)
 * 2. Podfile - sets RCT_METRO_PORT environment variable
 * 
 * See: docs/shared/reference/metro-port-configuration.md
 */
const { withDangerousMod, withPodfileProperties } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const METRO_PORT = '8085';

/**
 * Modifies Podfile.properties.json to enable building RN from source + ccache
 */
function withMetroPodfileProperties(config) {
  return withPodfileProperties(config, (config) => {
    config.modResults['ios.buildReactNativeFromSource'] = 'true';
    config.modResults['apple.ccacheEnabled'] = 'true';
    console.log('[withMetroPort] Set ios.buildReactNativeFromSource=true, apple.ccacheEnabled=true');
    return config;
  });
}

/**
 * Modifies Podfile to set RCT_METRO_PORT environment variable
 */
function withMetroPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        console.warn('[withMetroPort] Podfile not found, skipping');
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');
      
      const metroPortLine = `ENV['RCT_METRO_PORT'] = '${METRO_PORT}'`;
      
      // Check if already present
      if (podfile.includes("ENV['RCT_METRO_PORT']")) {
        console.log('[withMetroPort] RCT_METRO_PORT already set in Podfile');
        return config;
      }

      // Insert before "platform :ios" line
      const platformLineRegex = /^(platform :ios.*$)/m;
      const match = podfile.match(platformLineRegex);
      
      if (match) {
        const insertBlock = `
# Use port ${METRO_PORT} for Metro bundler (requires ios.buildReactNativeFromSource=true)
# Injected by withMetroPort plugin - see docs/shared/reference/metro-port-configuration.md
${metroPortLine}

`;
        podfile = podfile.replace(platformLineRegex, insertBlock + '$1');
        fs.writeFileSync(podfilePath, podfile);
        console.log(`[withMetroPort] Added RCT_METRO_PORT=${METRO_PORT} to Podfile`);
      } else {
        console.warn('[withMetroPort] Could not find platform :ios line in Podfile');
      }

      return config;
    },
  ]);
}

/**
 * Main plugin: combines both modifications
 */
function withMetroPort(config) {
  config = withMetroPodfileProperties(config);
  config = withMetroPodfile(config);
  return config;
}

module.exports = withMetroPort;
