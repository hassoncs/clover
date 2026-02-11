import './global.css';
import type { Preview } from '@storybook/react';
import { tokens } from '@slopcade/theme/tokens';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: tokens.colors.background,
        },
        {
          name: 'dark',
          value: tokens.colors.secondary[900],
        },
      ],
    },
  },
};

export default preview;