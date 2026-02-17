
## Layout Adapter
- Created `LayoutAdapter` interface to abstract layout resolution from `GameDefinition` entities.
- Implemented `createEntityLayoutAdapter` as the default adapter for entity-based screens.
- Integrated `LayoutAdapter` into `WireframeRenderer` to support future code-driven screens (party games).
- `LayoutZone` uses world coordinates (center X, center Y) to match the renderer's coordinate system.

## Testing Patterns
- Wireframe components are tested using Vitest and @testing-library/react.
- Although they are React Native components, they are tested in a jsdom environment with react-native-web alias, so @testing-library/react is preferred over @testing-library/react-native to avoid transformation issues.
- Added // @vitest-environment jsdom directive to test files for robustness.
- Updated app/vitest.config.mjs to include .ts files in components directory and define __DEV__ global.
