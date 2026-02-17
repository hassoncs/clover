# Learnings - Wireframe Panel

## Structural Rendering
- Created `WireframeViewer.web.tsx` to handle the phone frame aspect ratio (9:19.5).
- Created `WireframeRenderer.tsx` to render low-fidelity UI elements.
- Used `@slopcade/shared` for type imports to ensure consistency.
- Used `StyleSheet` for styling to keep it simple and performant.

## Navigation Controls
- Added flow navigation controls to `WireframePanel.tsx` using `useWireframeMode`.
- Implemented keyboard shortcuts for web (ArrowLeft/ArrowRight) with `window.addEventListener`.
- Used `Platform.OS` to conditionally add keyboard listeners.
- Added screen counter display (e.g., "1 / 3").

## Wireframe Renderer Implementation
- Implemented `WireframeRenderer` to visualize entities as simple boxes/circles.
- Implemented `WireframeViewer.web.tsx` with a phone frame container (aspect ratio 9:19.5).
- Implemented `WireframeViewer.native.tsx` as a fallback.
- Used `WireframeViewer.ts` to export the web version as default for tools, while Metro handles platform extensions.
- Updated `WireframePanel` to use the new viewer.
- Coordinate conversion maps world space (center origin, Y up) to screen space (top-left origin, Y down).
- Created `LayoutAdapter` to map `OverlayElement` anchors to canonical `LayoutZone`s (header, footer, center, left, right).
- This enables code-driven screens to resolve positional elements into structural zones without hardcoding anchor logic in the renderer.

## Phone Frame Integration
- Integrated `WireframeRenderer` directly into `WireframePanel.tsx` with a responsive phone frame.
- Calculated phone dimensions dynamically based on container size to maintain 9:19.5 aspect ratio.
- Added visual polish: rounded corners, shadow/elevation, notch placeholder.
- Ensured proper scaling of game entities within the phone frame using world bounds.
