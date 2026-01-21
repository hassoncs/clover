# Template Features

This template includes a complete setup for React Native Skia web deployments with additional useful features.

## Core Features

### React Native Skia with CanvasKit WASM

- Working deployment to Cloudflare Pages
- Code-splitting with `<WithSkiaWeb />`
- Proper WASM loading and initialization

### NativeWind (Tailwind CSS)

- Tailwind-style utility classes for React Native
- Full TypeScript support
- Configured for Expo Router

## NativeWind Configuration

### Files

- `tailwind.config.js` - Tailwind configuration
- `babel.config.js` - NativeWind Babel plugin
- `global.css` - Tailwind directives
- `nativewind-env.d.ts` - TypeScript declarations

### Usage

```tsx
<View className="flex-1 items-center justify-center">
  <Text className="text-3xl font-bold italic">Hello</Text>
</View>
```

## Dependencies

### Core

- `@shopify/react-native-skia` - Skia graphics library
- `expo-router` - File-based routing
- `react-native-reanimated` - Animations

### Styling

- `nativewind` - Tailwind CSS for React Native
- `tailwindcss` - Tailwind CSS (v3)

## Quick Reference

### Styling with NativeWind

Common Tailwind classes that work in React Native:

- Layout: `flex-1`, `items-center`, `justify-center`, `p-4`, `m-2`
- Typography: `text-3xl`, `font-bold`, `italic`
- Positioning: `absolute`, `inset-0`, `top-0`, `left-0`
- Colors: `bg-blue-500`, `text-white`

## Next Steps

1. Use Tailwind classes instead of inline styles
2. Customize `tailwind.config.js` for your design system
