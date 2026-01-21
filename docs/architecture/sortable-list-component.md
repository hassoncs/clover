# Unified Sortable List Component Architecture

## Problem Statement
We need a unified, high-quality "Sortable List" component that provides a consistent developer experience across React Native (iOS/Android) and Web (Desktop/Mobile), while leveraging the best platform-specific interaction models under the hood.

The component must abstract away platform differences (touch vs mouse, native drivers vs DOM events) and provide a clean, declarative API for:
1.  **Drag-to-Reorder**: Smooth, animated reordering of items.
2.  **Swipe-to-Action** (Optional): iOS-style swipe gestures for actions like delete.
3.  **Platform-Adaptive Interaction**:
    *   **Native**: High-performance, gesture-driven (likely Reanimated/Gesture Handler).
    *   **Web**: Mouse/Touch compatible, accessible (likely dnd-kit or similar).

## Requirements

### Core Features
*   **Vertical Reordering**: Drag items up/down to change order.
*   **Drag Handles**: Optional dedicated area to initiate drag.
*   **Auto-Scrolling**: List should scroll when dragging near edges.
*   **Animations**:
    *   Items should animate out of the way when hovering.
    *   Dropped item should animate to its new position.
    *   Swipe actions should feel elastic and native.

### Platform Considerations
*   **iOS/Android**: Must run at 60fps on the UI thread (Reanimated).
*   **Web (Desktop)**: Mouse-based drag, hover states, keyboard accessibility.
*   **Web (Mobile)**: Touch-based drag, prevent scrolling conflict.

### API Design Goals
*   **Unified Interface**: `props` should be identical (or 90% overlapping) across platforms.
*   **Composition**: Should work with custom item renderers.
*   **State Management**: Should handle optimistic updates and return final order.

## Technical Constraints
*   **React Native**: Must use `react-native-reanimated` + `react-native-gesture-handler` for performance.
*   **Web**: Should likely use a dedicated React DnD library (`dnd-kit` is a strong candidate for its modularity and headless nature) or a custom Reanimated web implementation if feasible.
*   **Metro Bundling**: Use `.native.tsx` and `.web.tsx` extensions for clean separation.

## Research Questions
1.  Can `react-native-sortables` be polyfilled for web, or is it better to swap it out entirely?
2.  Is `dnd-kit` the best choice for React Native Web, or is there a lighter alternative?
3.  How do we unify the "Swipe-to-Delete" API between a native gesture handler implementation and a web-friendly version?
