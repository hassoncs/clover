# Learnings: Font Rendering Support Audit

- **Godot's MSDF Strength**: Godot 4's MSDF support is a major asset for high-quality text rendering at any scale.
- **Expo-Font Infrastructure**: The project already has `expo-font` installed, which significantly lowers the barrier to fixing the UI layer gaps.
- **URL-based Caching**: The MD5-based caching strategy in `TextEffectSystem.gd` is a solid pattern for dynamic asset management.
- **Platform Discrepancy**: WOFF2 is a "trap" format—it works in Godot and Web but fails in React Native native builds.
