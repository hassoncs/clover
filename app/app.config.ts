import { ExpoConfig, ConfigContext } from "expo/config";
import appJson from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = appJson.expo as unknown as ExpoConfig;

  const plugins: NonNullable<ExpoConfig["plugins"]> = [
    ...(baseConfig.plugins ?? []),
  ];

  if (process.env.SENTRY_AUTH_TOKEN || process.env.EXPO_PUBLIC_SENTRY_DSN) {
    plugins.push([
      "@sentry/react-native",
      {
        disableAutoUploadSourceMaps: !process.env.SENTRY_AUTH_TOKEN,
      },
    ]);
  }

  return {
    ...baseConfig,
    plugins,
  };
};
