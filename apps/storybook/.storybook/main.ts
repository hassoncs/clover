import type { StorybookConfig } from '@storybook/react-webpack5';
import type { Configuration, RuleSetRule } from 'webpack';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagesPath = path.resolve(__dirname, '../../../packages');

const config: StorybookConfig = {
  stories: [
    '../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },

  typescript: {
    reactDocgen: false,
  },
  
  docs: {
    autodocs: true
  },

  webpackFinal: async (config: Configuration) => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    config.module.rules = config.module.rules.filter((rule) => {
      if (!rule || typeof rule !== 'object') return true;
      return !rule.test?.toString().includes('css');
    });
    
    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [tailwindcss, autoprefixer],
            },
          },
        },
      ],
    });

    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: [
        packagesPath,
        path.resolve(__dirname, '../'),
      ],
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
            ['@babel/preset-react', { runtime: 'automatic', importSource: 'nativewind' }],
            '@babel/preset-typescript',
            'nativewind/babel',
          ],
        },
      },
    });

    config.module.rules.push({
      test: /\.(js|jsx)$/,
      include: [
        /node_modules\/@expo\/vector-icons/,
        /node_modules\/react-native-vector-icons/,
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
            ['@babel/preset-react', { runtime: 'automatic' }],
          ],
        },
      },
    });

    config.resolve = config.resolve || {};
    config.resolve.extensions = ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.jsx', ...(config.resolve.extensions || [])];
    
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
      '@clover/ui': path.resolve(__dirname, '../../../packages/ui/src'),
      '@clover/theme': path.resolve(__dirname, '../../../packages/theme/src'),
      '@clover/physics': path.resolve(__dirname, '../../../packages/physics/src'),
    };

    return config;
  },
};

export default config;
