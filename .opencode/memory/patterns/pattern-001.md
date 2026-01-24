# Platform-Specific Module Pattern

**Category**: architecture
**Detected From**: codebase-scan
**Proposed for AGENTS.md**: Yes

## Description

Use `.web.ts` and `.native.ts` extensions for platform-specific implementations with a unified `index.ts` export.

## Pattern

```
lib/module/
├── Module.native.ts   # iOS/Android implementation
├── Module.web.ts      # Web implementation
├── index.ts           # Unified export
└── types.ts           # Shared types
```

The `index.ts` file exports from the platform-specific file:

```typescript
// index.ts
export * from './Module';  // Bundler resolves to .native.ts or .web.ts
```

## Examples

### Example 1: Godot Bridge
```
lib/godot/
├── GodotBridge.native.ts  # JSI bridge for native
├── GodotBridge.web.ts     # WASM bridge for web
├── index.ts               # Unified export
└── types.ts               # Shared TypeScript types
```

### Example 2: Physics Engine
```
packages/physics/src/physics2d/
├── index.native.ts        # Native physics implementation
├── index.web.ts           # Web physics implementation
├── createPhysics2D.native.ts
├── createPhysics2D.web.ts
└── types.ts
```

## Benefits

1. **Type Safety**: Shared types ensure consistent API across platforms
2. **Clean Imports**: Consumers import from `index.ts`, bundler handles platform resolution
3. **Separation of Concerns**: Platform-specific code is isolated
4. **Testability**: Can test each platform implementation independently

## Webpack/Metro Configuration

Ensure platform extensions are prioritized in resolution:

```typescript
// Webpack (for Storybook)
config.resolve.extensions = [
  '.web.tsx', '.web.ts', '.tsx', '.ts',
  '.web.js', '.js', '.jsx',
  ...(config.resolve.extensions || [])
];

// Metro (metro.config.js)
resolver: {
  sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json'],
  platforms: ['ios', 'android', 'native', 'web'],
}
```

## Related Documentation

- [Platform-Specific Modules Reference](../../../docs/shared/reference/platform-specific-modules.md)
- [Storybook Setup Guide](../../../docs/storybook-setup.md)
