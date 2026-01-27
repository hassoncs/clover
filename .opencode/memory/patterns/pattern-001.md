# pattern-001: Platform-Specific Module Pattern

**Category**: architecture  
**Status**: active  
**Documented in**: `.opencode/AGENTS.md` > Established Patterns

## Description

Use `.web.ts` and `.native.ts` extensions for platform-specific implementations with unified `index.ts` export.

## Pattern Structure

```
lib/module/
├── Module.native.ts   # iOS/Android implementation
├── Module.web.ts      # Web implementation
├── index.ts           # Unified export (bundler auto-resolves)
└── types.ts           # Shared types
```

## Examples in Codebase

### Godot Bridge
```
lib/godot/
├── GodotBridge.native.ts  # JSI bridge for native
├── GodotBridge.web.ts     # WASM bridge for web
├── index.ts
└── types.ts
```

### Physics Engine
```
packages/physics/src/physics2d/
├── index.native.ts
├── index.web.ts
├── createPhysics2D.native.ts
├── createPhysics2D.web.ts
└── types.ts
```

## Benefits

1. **Type Safety**: Shared types ensure consistent API across platforms
2. **Clean Imports**: Consumers import from `index.ts`, bundler handles platform resolution
3. **Separation of Concerns**: Platform-specific code is isolated
4. **Testability**: Can test each platform independently

## Configuration

Metro bundler automatically resolves `.native.ts` for iOS/Android and `.web.ts` for web builds.

Webpack/Storybook requires explicit extension prioritization:
```typescript
config.resolve.extensions = [
  '.web.tsx', '.web.ts', '.tsx', '.ts',
  '.web.js', '.js', '.jsx',
  ...(config.resolve.extensions || [])
];
```

## Related

- [AGENTS.md Established Patterns](../../AGENTS.md#established-patterns)
- [Platform-Specific Modules Reference](../../../docs/shared/reference/platform-specific-modules.md) (if exists)
