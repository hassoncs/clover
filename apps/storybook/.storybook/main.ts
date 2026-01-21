import { dirname, join } from "path";
import type { StorybookConfig } from '@storybook/react';
import type { Configuration } from 'webpack';

const config: StorybookConfig = {
  stories: ['../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)'],
  
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  
  docs: {
    autodocs: true
  },

  webpackFinal: async (config: Configuration) => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
        'postcss-loader',
      ],
    });

    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      ],
    });

    config.resolve = config.resolve || {};
    config.resolve.extensions = config.resolve.extensions || [];
    config.resolve.extensions.push('.ts', '.tsx');
    
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['react-native'] = 'react-native-web';

    return config;
  },
};

export default config;