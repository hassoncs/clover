module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Note: react-native-reanimated/plugin is auto-configured by Expo's preset
    // DO NOT add it manually - doing so causes conflicts on iOS
  };
};

