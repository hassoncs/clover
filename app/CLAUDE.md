# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ MANDATORY: GODOT AUTOMATION

Godot exports are **AUTOMATICALLY WATCHED AND REBUILT**. 
- **DO NOT** manually run `pnpm godot:export` or `node scripts/export-godot.mjs --once` unless specifically troubleshooting a CI failure.
- **NEVER** instruct the user to manually rebuild Godot.
- The `godot` service in `devmux` handles all `.gd`, `.tscn`, and asset watching.

## Project Overview

This is a React Native game engine powered by Godot 4 for physics-based game rendering. It uses a bridge pattern to communicate between React Native (UI/logic) and Godot (physics/rendering).

**Key Stack:**
- Expo Router
- Godot 4 (native via react-native-godot, web via WASM)
- NativeWind (Tailwind for React Native)
- TypeScript

## Development Commands

```bash
# Start development server (Managed by DevMux - starts Godot watcher automatically)
pnpm dev

# Start native development
pnpm ios
pnpm android

# Start web development
pnpm web

# Build for web deployment
npx expo export -p web

# Clean commands
pnpm clean:js      # Clean JS/web build artifacts
pnpm clean:ios     # Clean iOS build artifacts
pnpm clean:android # Clean Android build artifacts
pnpm clean         # Clean all artifacts

# Native iOS setup
pnpm pods          # Install CocoaPods dependencies
```

## Critical Architecture Patterns

### Godot Bridge Pattern

The app communicates with Godot through a TypeScript bridge:

```typescript
// Import the bridge
import { createGodotBridge } from '@/lib/godot';

// Initialize
const bridge = await createGodotBridge();
await bridge.initialize();

// Load a game
await bridge.loadGame(gameDefinition);

// Control entities
bridge.setEntityImage(entityId, url, width, height);
bridge.applyImpulse(entityId, { x: 0, y: -10 });
```

### Platform-Specific Implementations

The bridge has separate implementations:
- `GodotBridge.native.ts` - iOS/Android using react-native-godot
- `GodotBridge.web.ts` - Web using Godot WASM

Use the unified import:
```typescript
import { createGodotBridge, GodotView } from '@/lib/godot';
```

### Game Definitions

Games are defined using the `GameDefinition` schema:

```typescript
const game: GameDefinition = {
  metadata: { id: 'my-game', title: 'My Game', version: '1.0.0' },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 14, height: 18 },
  },
  templates: {
    box: {
      sprite: { type: 'rect', width: 1, height: 1, color: '#FF0000' },
      physics: { bodyType: 'dynamic', shape: 'box', width: 1, height: 1 },
    },
  },
  entities: [
    { id: 'box1', template: 'box', transform: { x: 5, y: 2, angle: 0 } },
  ],
};
```

### NativeWind Integration

This project uses NativeWind v4 for Tailwind-style utilities:

```tsx
<View className="flex-1 items-center justify-center">
  <Text className="text-3xl font-bold">Hello</Text>
</View>
```

## Project Structure

```
app/                      # Expo Router pages
├── _layout.tsx          # Root layout
├── index.tsx            # Home page
└── examples/            # Game examples

lib/
├── godot/               # Godot bridge
│   ├── GodotBridge.native.ts
│   ├── GodotBridge.web.ts
│   └── types.ts
└── registry/            # Auto-discovered modules

components/              # Reusable components

godot_project/           # Godot project files
├── scripts/
│   └── GameBridge.gd    # Main bridge singleton
└── project.godot
```

## Common Patterns

### Adding a new game example

1. Create file in `app/examples/my_example.tsx`
2. Export metadata and default component:

```typescript
import type { ExampleMeta } from '@/lib/registry/types';

export const metadata: ExampleMeta = {
  title: 'My Example',
  description: 'Description here',
};

export default function MyExample() {
  // Use GodotView and bridge
}
```

3. Run `pnpm generate:registry` to register it

### Working with dynamic images

```typescript
// Set entity image at runtime
bridge.setEntityImage(entityId, imageUrl, widthMeters, heightMeters);

// Clear texture cache if needed
bridge.clearTextureCache();
```

## Important References

- **[Project Guide](./AGENTS.md)** - Full development guide
- **[Godot Project README](../godot_project/README.md)** - Godot-specific docs
