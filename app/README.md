# Slopcade App

React Native game engine powered by Godot 4 for physics-based game rendering.

## Features

- Godot 4 physics engine (native + web via WASM)
- React Native bridge for game control
- NativeWind (Tailwind CSS for React Native)
- Cross-platform: iOS, Android, Web

## Quick Start

```bash
# Start development server
pnpm dev

# Run on iOS simulator
pnpm ios

# Run on Android emulator  
pnpm android

# Run web version
pnpm web
```

## Architecture

The app uses a React Native ↔ Godot bridge pattern:

```
React Native (UI/Logic)
        ↓
   GodotBridge (TypeScript)
        ↓
   GameBridge.gd (GDScript)
        ↓
   Godot Engine (Physics/Rendering)
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/godot/GodotBridge.native.ts` | Native bridge implementation |
| `lib/godot/GodotBridge.web.ts` | Web bridge implementation |
| `lib/godot/types.ts` | TypeScript type definitions |

### Godot Project

The Godot project lives in `godot_project/`:
- `scripts/GameBridge.gd` - Main bridge singleton
- `scripts/PhysicsBody.gd` - Physics body script
- `project.godot` - Godot project config

## Documentation

- **[Project Guide](./AGENTS.md)** - Development guide
- **[Godot Migration](../docs/godot-migration/)** - Migration documentation
