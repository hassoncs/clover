# Storybook Setup Guide

## Overview

This project uses Storybook for developing and testing UI components in isolation. The setup is optimized for a **React Native Web** environment with **NativeWind (Tailwind CSS)** styling.

**Storybook URL**: http://localhost:6006

## Architecture

### Monorepo Structure

```
packages/
├── theme/           # Design tokens (colors, spacing, typography, etc.)
├── ui/              # Cross-platform UI components (Button, Typography, etc.)
└── physics/         # Skia/physics components (NOT compatible with web Storybook)

apps/
└── storybook/       # Dedicated Storybook application
```

### Design Philosophy

**Separation of Concerns:**
- **`packages/theme`**: Platform-agnostic design tokens exported as constants
- **`packages/ui`**: Pure UI components using React Native primitives (View, Text, Pressable)
- **`packages/physics`**: Skia graphics + physics components (native/on-device only)
- **`apps/storybook`**: Web-based Storybook for UI component development

## What Works in Web Storybook

✅ **Supported:**
- React Native primitives (View, Text, Pressable, etc.) via `react-native-web`
- NativeWind/Tailwind styling
- Pure UI components
- Component controls and interactions
- Hot module reloading

❌ **NOT Supported:**
- Skia graphics components (`@shopify/react-native-skia`)
- React Native physics components
- Native-only APIs (Dimensions, Platform-specific code)
- Reanimated animations (without additional setup)

## Key Configuration

### 1. React Native Web Aliasing

**File**: `apps/storybook/.storybook/main.ts`

```typescript
config.resolve.alias = config.resolve.alias || {};
config.resolve.alias['react-native'] = 'react-native-web';
```

This ensures React Native imports resolve to `react-native-web` for browser compatibility.

### 2. TypeScript Compilation

**Required**: Each package needs a `tsconfig.json` with proper `include` paths:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Webpack TypeScript Loader

Storybook uses `ts-loader` to compile TypeScript files:

```typescript
config.module.rules.push({
  test: /\.(ts|tsx)$/,
  use: [{
    loader: 'ts-loader',
    options: { transpileOnly: true }
  }]
});
```

## Gotchas and Solutions

### ❗ Gotcha 1: React Native Components Won't Load

**Problem**: Webpack errors about missing React Native modules.

**Solution**: 
1. Install `react-native-web` in Storybook package
2. Configure webpack alias to map `react-native` → `react-native-web`
3. Only import UI components that use basic RN primitives

### ❗ Gotcha 2: TypeScript Parse Errors

**Problem**: `The 'files' list in config file 'tsconfig.json' is empty`

**Solution**: Each package must have a `tsconfig.json` with an `include` array pointing to source files:

```json
{
  "include": ["src/**/*"]
}
```

### ❗ Gotcha 3: Token Export Issues

**Problem**: `export 'tokens' was not found`

**Solution**: Export a combined `tokens` object from your theme package:

```typescript
export const tokens = {
  colors,
  spacing,
  typography,
  // ...all token categories
} as const;
```

### ❗ Gotcha 4: Skia/Physics Components Fail

**Problem**: Components using `@shopify/react-native-skia` or native modules crash in web Storybook.

**Solution**: **DO NOT** add physics/Skia stories to web Storybook. These require on-device Storybook (different setup). Only create stories for pure UI components.

### ❗ Gotcha 5: Story Paths Must Be Correct

**Problem**: Storybook can't find story files.

**Solution**: Story paths in `main.ts` are relative to the Storybook app directory:

```typescript
stories: [
  '../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)',
  // NOT '../packages/ui/...' - needs full relative path
]
```

## Commands

```bash
# Root workspace
pnpm storybook              # Start Storybook on port 6006
pnpm storybook:build        # Build static Storybook site

# From apps/storybook directory
cd apps/storybook
pnpm storybook              # Direct start
```

## Creating Stories

### Best Practices

**✅ DO create stories for:**
- Button components
- Typography variants
- Form inputs
- Layout primitives
- Card/container components
- Navigation elements
- Any pure UI component using React Native primitives

**❌ DON'T create stories for:**
- Skia Canvas components
- Physics simulations
- Components with native module dependencies
- Screen-level components with complex navigation

### Story Template

**File**: `packages/ui/src/MyComponent.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'UI/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'primary',
    children: 'Example',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Example',
  },
};
```

### Story Naming Convention

- **File**: `ComponentName.stories.tsx` (co-located with component)
- **Title**: `Category/ComponentName` (e.g., `UI/Button`, `UI/Typography`)
- **Exports**: Use descriptive names for variants (`Primary`, `Large`, `Disabled`, etc.)

## Workflow

### 1. Create Component

```typescript
// packages/ui/src/Badge.tsx
import { View, Text } from 'react-native';
import { cn } from '@clover/theme';

export const Badge = ({ variant, children }) => {
  return (
    <View className={cn('px-2 py-1 rounded-full', {
      'bg-primary-500': variant === 'primary',
      'bg-secondary-500': variant === 'secondary',
    })}>
      <Text className="text-white text-xs">{children}</Text>
    </View>
  );
};
```

### 2. Create Story

```typescript
// packages/ui/src/Badge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'New' }
};
```

### 3. Export Component

```typescript
// packages/ui/src/index.ts
export * from './Badge';
```

### 4. View in Storybook

Start Storybook and navigate to the new story in the sidebar.

## Snapshot Testing Strategy

### When to Use Storybook

**Primary Use Case**: Component development and visual regression testing.

Every **pure UI component** should have:
1. A `.stories.tsx` file co-located with the component
2. Stories for all major variants/states
3. Interactive controls for dynamic props

### Snapshot Testing Benefits

- **Visual Regression**: Catch unintended styling changes
- **Component Isolation**: Test components independently
- **Documentation**: Stories serve as live documentation
- **Design System**: Single source of truth for UI patterns

## Dependencies

### Required Packages (apps/storybook)

```json
{
  "dependencies": {
    "@clover/ui": "workspace:*",
    "@clover/theme": "workspace:*",
    "react": "19.1.0",
    "react-native-web": "~0.21.0"
  },
  "devDependencies": {
    "@storybook/addon-essentials": "^8.0.0",
    "@storybook/addon-interactions": "^8.0.0",
    "@storybook/react": "^8.0.0",
    "@storybook/react-webpack5": "^8.0.0",
    "storybook": "^8.0.0",
    "ts-loader": "^9.5.0",
    "typescript": "~5.9.3"
  }
}
```

## Troubleshooting

### Storybook Won't Start

1. **Check port 6006**: `lsof -i :6006` (kill if occupied)
2. **Clear cache**: `rm -rf node_modules/.cache`
3. **Reinstall**: `pnpm install`
4. **Check TypeScript configs**: Ensure all packages have `tsconfig.json`

### Component Not Rendering

1. **Check imports**: Ensure using React Native primitives, not native-only APIs
2. **Check exports**: Component must be exported from package index
3. **Check console**: Open browser console for error messages
4. **React Native Web**: Verify `react-native-web` is installed

### Styling Issues

1. **NativeWind setup**: Ensure `tailwind.config.js` extends theme tokens
2. **Class names**: Use `className` prop (NativeWind requirement)
3. **Theme reference**: Import utilities from `@clover/theme`

## Future Enhancements

### Potential Additions

- **Chromatic**: Visual regression testing CI/CD
- **Accessibility testing**: Storybook a11y addon
- **On-device Storybook**: Separate setup for physics/Skia components
- **Interaction testing**: Using `@storybook/test` addon
- **Design tokens viewer**: Custom addon for theme exploration

## Related Documentation

- [NativeWind Documentation](https://www.nativewind.dev/)
- [Storybook for React](https://storybook.js.org/docs/react/get-started/introduction)
- [React Native Web](https://necolas.github.io/react-native-web/)
