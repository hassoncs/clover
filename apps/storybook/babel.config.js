module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@clover/ui': './packages/ui/src',
            '@clover/physics': './packages/physics/src',
            '@clover/theme': './packages/theme/src',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};