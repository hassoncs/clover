# GodotJS Compatibility Exploration

> **Date:** 2026-01-31
> **Status:** Complete - Not Recommended for Slopcade
> **Prior Research:** Session ses_3f9ef750fffeMCzm6H12lnWrRd (2026-01-28)

## Overview

This document summarizes the exploration of GodotJS (by aspect-gd) as a potential alternative to the current Slopcade architecture.

## What is GodotJS?

GodotJS allows writing Godot scripts in TypeScript/JavaScript instead of GDScript. Key features:

- **Multiple JS Engines:** V8, QuickJS, JavaScriptCore, Browser JS
- **Platform Support:** Web, iOS, Android, Desktop
- **TypeScript Support:** Full TypeScript with type definitions for Godot API
- **Signal Handling:** Connect to Godot signals from JavaScript

## Current Slopcade Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                          │
│  (TypeScript game logic, UI, state management)              │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                      │
┌────────▼────────┐                   ┌────────▼────────┐
│   Native (JSI)   │                   │   Web (WASM)    │
│ react-native-    │                   │  Godot WASM +   │
│   godot          │                   │  JavaScriptBridge│
└──────────────────┘                   └─────────────────┘
         │                                      │
         └──────────────────┬──────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Godot Engine   │
                   │ (Physics/Render)│
                   └─────────────────┘
```

**Key characteristics:**
- Game logic runs in React Native (TypeScript)
- Godot handles physics + rendering only
- Games defined in JSON (GameDefinition)
- Bridge communicates between TS and Godot

## GodotJS vs Current Approach

| Aspect | Current (react-native-godot) | GodotJS |
|--------|------------------------------|---------|
| **JS Runtime** | React Native (Hermes/JSC) | V8/QuickJS inside Godot |
| **Bridge** | JSI (native) / JavaScriptBridge (web) | Native Godot bindings |
| **Game Logic** | TypeScript in RN | TypeScript in Godot |
| **React Integration** | Native | Would require custom bridge |
| **UI Framework** | React Native | Godot UI or custom |

## Key Finding: Separate Projects

**GodotJS and react-native-godot are completely separate projects that solve different problems:**

- **react-native-godot:** Embed Godot engine in React Native apps
- **GodotJS:** Write Godot scripts in TypeScript (replaces GDScript)

There is **no integration** between them. Using GodotJS would mean abandoning the React Native architecture entirely.

## Recommendation: Do NOT Switch to GodotJS

For Slopcade, GodotJS is **not recommended** because:

1. **Current architecture works well** - The unified system architecture (Phases 0-8) provides clean TypeScript-side organization
2. **Would lose React Native** - GodotJS runs inside Godot, not React Native
3. **No benefit for use case** - JSON-driven games with TS orchestration don't need GodotJS
4. **Would lose UI capabilities** - React Native UI, navigation, and ecosystem would be lost
5. **Significant rewrite** - Would require rewriting the entire game engine

## When GodotJS Makes Sense

GodotJS is a good choice for:
- Standalone Godot games (not embedded in React Native)
- Teams preferring TypeScript over GDScript
- Projects not needing React Native UI/ecosystem

## Conclusion

The current Slopcade architecture (React Native + embedded Godot) is the right choice for this project. The unified system architecture refactor (Phases 0-8) already provides the clean TypeScript organization that was the original motivation for exploring GodotJS.

**No further action required.**
