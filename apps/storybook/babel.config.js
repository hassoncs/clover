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
            '@slopcade/ui': '../../packages/ui/src',
            '@slopcade/physics': '../../packages/physics/src',
            '@slopcade/theme': '../../packages/theme/src',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};