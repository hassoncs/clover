# Storybook + NativeWind Setup Guide

This guide documents how to set up Storybook for a React Native Expo monorepo with NativeWind (Tailwind CSS) styling. This configuration enables web-based component previews with full NativeWind styling support.

## Architecture Overview

```
monorepo/
├── apps/
│   └── storybook/           # Storybook web app
│       ├── .storybook/
│       │   ├── main.ts      # Webpack & babel config
│       │   ├── preview.ts   # Story decorators & globals
│       │   └── global.css   # Tailwind directives
│       ├── package.json
│       ├── tailwind.config.js
│       └── postcss.config.js
├── packages/
│   ├── ui/                  # Shared UI components
│   │   └── src/
│   │       ├── Button.tsx
│   │       └── Button.stories.tsx
│   └── theme/               # Design tokens & Tailwind preset
│       └── src/
│           ├── tokens.ts
│           └── tailwind.ts
└── app/                     # Main Expo app
```

## Key Concepts

### Two Storybook Modes

| Mode | Description | NativeWind Support |
|------|-------------|-------------------|
| **Web** (`.storybook/`) | Runs in browser via Webpack | Requires careful configuration |
| **On-device** (`.ondevice/`) | Runs inside Expo app via Metro | Works out of the box |

This guide focuses on **web-based Storybook** which is more complex but enables features like Chromatic visual testing.

### Why This Is Complex

1. **NativeWind uses JSX transforms** that need special babel configuration
2. **Monorepo packages** live outside the Storybook app and need explicit transpilation
3. **React Native → Web** requires aliasing `react-native` to `react-native-web`
4. **Tailwind CSS** needs PostCSS processing in the webpack pipeline

---

## Step-by-Step Setup

### 1. Create the Storybook App Directory

```bash
mkdir -p apps/storybook/.storybook
```

### 2. Package Dependencies

**`apps/storybook/package.json`**:

```json
{
  "name": "@your-org/storybook",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "@your-org/ui": "workspace:*",
    "@your-org/theme": "workspace:*",
    "nativewind": "^4.2.1",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.4",
    "react-native-css-interop": "0.2.1",
    "react-native-web": "~0.21.2"
  },
  "devDependencies": {
    "@babel/core": "^7.28.6",
    "@babel/preset-env": "^7.28.6",
    "@babel/preset-react": "^7.28.5",
    "@babel/preset-typescript": "^7.28.5",
    "@storybook/addon-essentials": "^8.0.0",
    "@storybook/addon-interactions": "^8.0.0",
    "@storybook/react-webpack5": "^8.6.0",
    "autoprefixer": "^10.4.23",
    "babel-loader": "^10.0.0",
    "css-loader": "^7.1.2",
    "postcss": "^8.5.6",
    "postcss-loader": "^8.2.0",
    "storybook": "^8.0.0",
    "style-loader": "^4.0.0",
    "tailwindcss": "3.4.17",
    "typescript": "~5.9.3"
  }
}
```

### 3. Main Storybook Configuration

**`apps/storybook/.storybook/main.ts`**:

```typescript
import type { StorybookConfig } from '@storybook/react-webpack5';
import type { Configuration } from 'webpack';
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
    // Add other package story paths as needed
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

    // Remove default CSS rules (we'll add our own with Tailwind)
    config.module.rules = config.module.rules.filter((rule) => {
      if (!rule || typeof rule !== 'object') return true;
      return !rule.test?.toString().includes('css');
    });
    
    // Add CSS rule with Tailwind/PostCSS
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

    // CRITICAL: Add babel-loader for TypeScript files in monorepo packages
    // Without this, files outside the storybook app won't be transpiled
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
            'nativewind/babel',  // MUST be a preset, not a plugin!
          ],
        },
      },
    });

    config.resolve = config.resolve || {};
    
    // Add .web.ts extensions for platform-specific imports
    config.resolve.extensions = [
      '.web.tsx', '.web.ts', '.tsx', '.ts', 
      '.web.js', '.js', '.jsx', 
      ...(config.resolve.extensions || [])
    ];
    
    // Alias react-native to react-native-web
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
      // Add your monorepo package aliases
      '@your-org/ui': path.resolve(__dirname, '../../../packages/ui/src'),
      '@your-org/theme': path.resolve(__dirname, '../../../packages/theme/src'),
    };

    return config;
  },
};

export default config;
```

### 4. Preview Configuration

**`apps/storybook/.storybook/preview.ts`**:

```typescript
import './global.css';  // CRITICAL: Import Tailwind CSS
import type { Preview } from '@storybook/react';

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
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#333333' },
      ],
    },
  },
};

export default preview;
```

### 5. Global CSS with Tailwind Directives

**`apps/storybook/.storybook/global.css`**:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6. Tailwind Configuration

**`apps/storybook/tailwind.config.js`**:

```javascript
const { tailwindPreset } = require('@your-org/theme/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './.storybook/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
    '../../packages/theme/src/**/*.{js,jsx,ts,tsx}',
    // Add all packages that contain Tailwind classes
  ],
  presets: [tailwindPreset],  // Use shared theme preset
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### 7. PostCSS Configuration

**`apps/storybook/postcss.config.js`**:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 8. Theme Package Setup

Your theme package should export a Tailwind preset:

**`packages/theme/src/tailwind.ts`**:

```typescript
import { tokens } from './tokens';

export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        destructive: { DEFAULT: tokens.colors.error, foreground: '#ffffff' },
        // ... other colors
      },
      // ... other theme extensions
    },
  },
  presets: [require('nativewind/preset')],
  plugins: [],
};
```

---

## Writing Stories

Stories should be co-located with components in your packages:

**`packages/ui/src/Button.stories.tsx`**:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'ghost'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Button',
    variant: 'default',
  },
};

export const Destructive: Story = {
  args: {
    label: 'Destructive',
    variant: 'destructive',
  },
};
```

---

## Running Storybook

```bash
# From monorepo root
pnpm --filter @your-org/storybook storybook

# Or from the storybook directory
cd apps/storybook && pnpm storybook
```

Storybook will be available at `http://localhost:6006`

---

## Troubleshooting

### Error: `import type` syntax fails / "Unexpected token"

**Symptom**:
```
Module parse failed: Unexpected token (2:12)
> import type { Preview } from '@storybook/react';
```

**Cause**: TypeScript files outside the Storybook app aren't being transpiled.

**Solution**: Add a `babel-loader` rule in `webpackFinal` that includes your packages path:

```typescript
config.module.rules.push({
  test: /\.(ts|tsx)$/,
  include: [
    path.resolve(__dirname, '../../../packages'),  // Include monorepo packages
    path.resolve(__dirname, '../'),
  ],
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: { /* babel config */ },
  },
});
```

---

### Error: `.plugins is not a valid Plugin property`

**Symptom**:
```
Error: [BABEL] /path/to/file.tsx: .plugins is not a valid Plugin property
```

**Cause**: `nativewind/babel` is incorrectly placed in the `plugins` array.

**Solution**: Move `nativewind/babel` to the `presets` array:

```typescript
// WRONG
plugins: ['nativewind/babel']

// CORRECT
presets: [
  '@babel/preset-env',
  '@babel/preset-react',
  '@babel/preset-typescript',
  'nativewind/babel',  // <-- Must be a preset!
]
```

---

### NativeWind Styles Not Appearing

**Symptoms**: Components render but without Tailwind styles (no colors, spacing, etc.)

**Checklist**:

1. **Is `global.css` imported in `preview.ts`?**
   ```typescript
   import './global.css';  // Must be first import
   ```

2. **Does `global.css` have Tailwind directives?**
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

3. **Are package paths in `tailwind.config.js` content array?**
   ```javascript
   content: [
     '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
     // Must include ALL packages that use Tailwind classes
   ]
   ```

4. **Is `jsxImportSource: 'nativewind'` set in babel preset-react?**
   ```typescript
   ['@babel/preset-react', { runtime: 'automatic', importSource: 'nativewind' }]
   ```

5. **Is PostCSS configured correctly?**
   Check that `postcss-loader` is in the CSS rule chain.

---

### Error: `Module not found: Can't resolve '../some/path'`

**Cause**: Webpack can't resolve imports in your packages.

**Solutions**:

1. **Check webpack aliases** match your package structure:
   ```typescript
   config.resolve.alias = {
     '@your-org/ui': path.resolve(__dirname, '../../../packages/ui/src'),
   };
   ```

2. **Check that `.web.ts` extensions are prioritized**:
   ```typescript
   config.resolve.extensions = ['.web.tsx', '.web.ts', '.tsx', '.ts', ...];
   ```

3. **For platform-specific code**, ensure web versions exist or mock native modules.

---

### Warning: Babel "loose" mode mismatch

**Symptom**:
```
The "loose" option must be the same for @babel/plugin-transform-class-properties...
```

**Cause**: NativeWind's babel preset uses `loose: true` for some transforms, conflicting with preset-env defaults.

**Solution**: This warning can be ignored, or silence it by adding explicit plugin config:

```typescript
plugins: [
  ['@babel/plugin-transform-class-properties', { loose: true }],
  ['@babel/plugin-transform-private-methods', { loose: true }],
  ['@babel/plugin-transform-private-property-in-object', { loose: true }],
]
```

---

### Warning: Tailwind content pattern matching node_modules

**Symptom**:
```
warn - Your `content` configuration includes a pattern which looks like it's accidentally matching all of `node_modules`
```

**Cause**: Using `**/*.js` patterns that traverse into `node_modules`.

**Solution**: Be specific with content paths:

```javascript
// WRONG
'../../packages/physics/**/*.js'

// CORRECT  
'../../packages/physics/src/**/*.{js,jsx,ts,tsx}'
```

---

### Storybook Builds But Components Show Errors

**Cause**: Runtime errors in components, often from missing native module polyfills.

**Solutions**:

1. **Check browser console** for specific error messages
2. **Mock native modules** that don't work on web
3. **Use `.web.ts` variants** for web-specific implementations
4. **Add webpack externals** for modules that should be excluded

---

## Version Compatibility

Tested with:

| Package | Version |
|---------|---------|
| Storybook | 8.6.x |
| NativeWind | 4.2.x |
| Tailwind CSS | 3.4.x |
| React | 19.x |
| React Native | 0.81.x |
| Expo | 54.x |
| Babel | 7.28.x |

---

## Monorepo Considerations

### Package Resolution

In a pnpm monorepo, ensure packages are linked:

```json
{
  "dependencies": {
    "@your-org/ui": "workspace:*",
    "@your-org/theme": "workspace:*"
  }
}
```

### Theme Package Must Have NativeWind

If your theme package uses `require('nativewind/preset')`, it needs `nativewind` as a dependency, or the consuming package (storybook) must have it installed.

### Story Discovery

Stories should be in packages, not the storybook app:

```typescript
stories: [
  '../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)',
  '../../../packages/components/**/*.stories.@(js|jsx|ts|tsx)',
]
```

---

## Alternative: On-Device Storybook

For native-first development, consider on-device Storybook which uses Metro instead of Webpack:

```bash
npx sb init --type react_native
```

This runs inside your actual Expo app and has better native module support, but lacks web-based features like Chromatic integration.

---

## References

- [NativeWind Documentation](https://www.nativewind.dev/)
- [Storybook for React Native Web](https://github.com/storybookjs/addon-react-native-web)
- [expo-nativewind-template-storybook](https://github.com/expo/examples)
