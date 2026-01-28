# Cross-Platform UI Library Research Report
## Building a Complex Game Editor with Shared React Native Code

**Date**: 2026-01-27  
**Research Focus**: Libraries needed to build a DevTools-like inspector UI that works across iOS, Android, and Web via React Native Web  
**Scope**: Tree views, panel layouts, drag-and-drop, forms/property editors

---

## Executive Summary

**Bottom Line**: Building a complex game editor with **fully shared UI code** across web and native is possible but requires significant compromises. You'll need to either:

1. **Use lowest-common-denominator libraries** (simpler features, acceptable on both)
2. **Build custom components** (high development cost, maximum control)
3. **Accept platform-specific implementations** (more code, better UX per platform)

**Key Finding**: The React Native ecosystem lacks mature, full-featured cross-platform libraries for complex editor patterns (trees, resizable panels, drag-drop). The gap is 2-3 years behind web-only solutions.

---

## Component Category Analysis

### 1. Tree / Hierarchy Views

#### The Challenge
Tree views are the hardest component to get right cross-platform. You need:
- Virtualized rendering (performance with 1000+ nodes)
- Expand/collapse with smooth animations
- Multi-selection
- Drag-and-drop reordering
- Search/filtering
- Keyboard navigation

#### Available Options

**Option A: react-native-tree-multi-select** ⭐ BEST FOR CROSS-PLATFORM
- **GitHub**: 103 stars, actively maintained
- **Web Support**: ✅ **EXPLICIT** (has Web badge in README)
- **Features**: Multi-selection, search, expandable nodes, virtualized (via FlashList)
- **Limitations**: NO drag-and-drop, NO inline renaming
- **Bundle**: ~40KB + FlashList dependency
- **Maintenance**: Active (542 commits)

```typescript
import { Tree } from 'react-native-tree-multi-select';

<Tree
  data={entityHierarchy}
  onCheck={handleSelection}
  showSearch={true}
  initialExpanded={['root']}
/>
```

**Option B: react-native-nested-listview** 
- **GitHub**: 195 stars (most popular RN tree)
- **Web Support**: ❌ Not mentioned (Android/iOS only per badges)
- **Features**: N-level nesting, customizable rendering
- **Limitations**: NO multi-select, NO search, NO virtualization
- **Maintenance**: Stale (last update Oct 2022)

**Option C: Build Custom with FlashList**
- **Approach**: Recursive FlatList components
- **Web Support**: ✅ FlashList works on web
- **Effort**: 2-3 weeks for basic tree, 4-6 weeks for full features
- **Pros**: Full control, can add drag-drop later
- **Cons**: High development cost

#### Web Libraries (NOT Compatible)
- **react-arborist** (3.5k stars): Uses DOM elements, not React Native
- **react-complex-tree** (1.3k stars): Web-only, W3C accessibility features

#### Recommendation
Use **react-native-tree-multi-select** for Phase 1. Accept no drag-and-drop initially. Build custom tree later if needed.

---

### 2. Panel / Layout Management

#### The Challenge
Game editors need:
- Resizable panels (sidebar, viewport, properties)
- Collapsible sections
- Persistent layout state
- Touch-friendly handles
- Nested panel groups

#### Available Options

**Option A: react-native-resizable-panels** ⭐ RECOMMENDED
- **Status**: Active (v0.0.3, July 2025)
- **Web Support**: ✅ Yes (port of popular web library)
- **Features**: 
  - Horizontal/vertical panel groups
  - Collapsible panels with min/max constraints
  - Auto-save to AsyncStorage
  - Imperative API (collapse/expand programmatically)
  - Smooth 60fps animations
- **Dependencies**: react-native-reanimated, react-native-gesture-handler
- **Demo**: [Live Expo Example](https://react-native-resizable-panels-example.expo.app/)

```typescript
import { Panel, PanelGroup, PanelResizeHandle } from 'react-native-resizable-panels';

<PanelGroup direction="horizontal" autoSaveId="editor-layout">
  <Panel defaultSize={25} minSize={10}>
    <HierarchyPanel />
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={50}>
    <Viewport />
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={25} collapsible>
    <PropertiesPanel />
  </Panel>
</PanelGroup>
```

**Option B: react-native-split-panel**
- **Status**: v0.2.0 (Sept 2025)
- **Web Support**: ✅ Yes (explicitly documented)
- **Features**: Two-pane split, drag-to-resize, controlled/uncontrolled
- **Limitations**: Only 2 panels (not multi-panel)
- **Bundle**: Lightweight (no dependencies)

**Option C: Custom with Gesture Handler**
- **Approach**: Build with react-native-gesture-handler + reanimated
- **Effort**: 1-2 weeks for basic implementation
- **Pros**: Full customization, can add snap points
- **Cons**: More code to maintain

#### Web-Only Alternatives (Not for RN)
- **react-resizable-panels** (web): Brian Vaughn's popular library
- **dockview**: Full docking/tabbing system (web-only)
- **golden-layout**: Mature dockable panels (web-only)

#### Recommendation
Use **react-native-resizable-panels**. It's actively maintained, has web support, and matches the popular web library's API.

---

### 3. Drag-and-Drop

#### The Challenge
Editor patterns need:
- Entity reordering in hierarchy
- Drag to rearrange panels
- Drag to assign parent/child relationships
- Visual feedback during drag
- Touch and mouse support

#### Available Options

**Option A: react-native-gesture-handler + reanimated** ⭐ RECOMMENDED
- **Status**: Industry standard, maintained by Software Mansion
- **Web Support**: ✅ Full Pan gesture support on web
- **Features**:
  - Native-thread execution (60fps)
  - Pan, pinch, rotation, long-press gestures
  - Web cursor customization
  - Multi-touch support
- **Dependencies**: Required for resizable panels anyway
- **Learning Curve**: Medium (gesture system concepts)

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

const dragGesture = Gesture.Pan()
  .onUpdate((event) => {
    position.value = { 
      x: startPos.x + event.translationX, 
      y: startPos.y + event.translationY 
    };
  })
  .onEnd(() => {
    position.value = withSpring(snapTarget);
  });
```

**Option B: @dnd-kit with React Native Web**
- **Status**: Modern web DnD library
- **Web Support**: ✅ Excellent (built for web)
- **React Native**: ⚠️ Requires RN Web (not pure RN)
- **Features**: Sortable, multiple containers, sensors
- **Limitations**: Not optimized for touch gestures

**Option C: react-native-sortable-list**
- **Status**: Legacy (last update ~2019)
- **Web Support**: ❌ Not mentioned
- **Note**: Already in your codebase! Check version.

#### Libraries to AVOID
- **react-native-draggable**: Abandoned (2020)
- **@procraft/react-native-drag-drop**: 0 dependents
- **react-beautiful-dnd**: DEPRECATED by Atlassian (2024)

#### Recommendation
Use **gesture-handler + reanimated** for all drag interactions. It's already needed for panels, works cross-platform, and gives maximum control.

---

### 4. Forms / Property Editors

#### The Challenge
Inspector panels need:
- Various input types (text, number, dropdown, checkbox)
- Validation
- Real-time updates
- Grouping/sections
- Conditional fields

#### Available Options

**Option A: Tamagui**
- **Status**: Very active (13.5k stars)
- **Web Support**: ✅ 100% parity
- **Components**: Input, Checkbox, Select, Slider, Switch, TextArea
- **Pros**: 
  - Cross-platform forms work well
  - Optimizing compiler for performance
  - Excellent TypeScript support
- **Cons**: 
  - Large bundle size (~300KB)
  - Learning curve for compiler
  - May be overkill for just forms

**Option B: React Native Paper**
- **Status**: Active (7.3k stars)
- **Web Support**: ✅ Via RN Web
- **Components**: TextInput, Checkbox, RadioButton, Switch
- **Pros**: Material Design, mature, accessible
- **Cons**: Large bundle (~300KB), opinionated styling

**Option C: React Native Reusables**
- **Status**: Growing community
- **Web Support**: ✅ Built for universal apps
- **Style**: shadcn/ui-inspired, Tailwind-like
- **Components**: Input, Checkbox, Select, Textarea
- **Pros**: Modern, clean, uses NativeWind

**Option D: Native Components + NativeWind**
- **Approach**: Use RN TextInput, Switch, etc. with Tailwind styling
- **Web Support**: ✅ react-native-web handles these
- **Pros**: No additional dependencies, full control
- **Cons**: Need to build wrapper components

#### Recommendation
For a game editor, use **Option D** (Native components + NativeWind) or add **Tamagui** if you want more sophisticated theming. Avoid Paper (too opinionated for editors).

---

## Complete Library Stack for Cross-Platform

### If You Proceed with Shared Code:

```json
{
  "dependencies": {
    "react-native-tree-multi-select": "^latest",
    "react-native-resizable-panels": "^0.0.3",
    "react-native-gesture-handler": "^2.30.0",
    "react-native-reanimated": "^4.1.6",
    "@shopify/flash-list": "^1.0.0",
    "nativewind": "^4.2.1"
  }
}
```

**Total Bundle Impact**: ~500KB additional (tree + panels + gestures + flashlist)

---

## Real-World Evidence

### Success Stories

**Discord (iOS App)**
- Built with React Native
- Millions of users, 99.9% crash-free
- Complex UI with lists, panels, real-time updates
- Proves RN can handle complex UIs at scale

**Meta Messenger Desktop**
- Migrated from Electron to React Native Desktop
- Smaller memory footprint, better performance
- Demonstrates desktop viability

**Radon IDE**
- VSCode extension by Software Mansion
- Full IDE features for React Native development
- Inspector, preview, debugging panels
- Shows complex tooling UIs are feasible

### Cautionary Tales

**Meta Messenger Desktop Shutdown (Dec 2025)**
- Despite technical success, discontinued for strategic reasons
- Lesson: Technical viability ≠ business success

**Discord Performance Challenges**
- Documented memory leaks and optimization struggles
- Required ongoing engineering effort
- Lesson: Complex RN apps need dedicated performance work

---

## Limitations & Challenges

### 1. Tree View Drag-and-Drop
**Problem**: No cross-platform tree library supports drag-and-drop for reordering.
**Options**:
- Build custom on top of gesture-handler (3-4 weeks)
- Use different UX on web vs native (platform split)
- Skip drag-and-drop initially (Phase 2 feature)

### 2. Advanced Panel Features
**Problem**: No docking, floating windows, or tabbing in RN.
**Reality Check**: 
- Web has `dockview`, `golden-layout` for this
- RN has no equivalent
- Would need to build from scratch (8+ weeks)

### 3. Performance at Scale
**Problem**: RN can lag with complex UIs.
**Mitigation**:
- Use FlashList for virtualization
- Enable New Architecture (0.76+)
- Profile with Flipper/Reanimated tools
- Test on low-end devices

### 4. Web vs Native Behavior Differences
**Problem**: Touch vs mouse, hover states, keyboard shortcuts.
**Examples**:
- Right-click context menus (web) vs long-press (native)
- Hover tooltips work on web, need alternative on native
- Keyboard shortcuts need Platform.OS checks

---

## Development Cost Comparison

| Approach | Timeline | Pros | Cons |
|----------|----------|------|------|
| **Web-First** (separate native) | 4-6 weeks | Best UX, proven libraries | Two implementations |
| **Cross-Platform** (shared) | 8-12 weeks | One codebase | Compromised UX, custom dev |
| **Web-Only** (no native) | 3-4 weeks | Maximum velocity | No mobile inspector |

**Cross-Platform Adds**:
- +2-4 weeks for custom tree implementation
- +1-2 weeks for platform-specific behaviors
- +1 week for testing on both platforms
- Ongoing: maintaining shared abstractions

---

## Architecture Recommendations

### If Building Cross-Platform:

**File Structure**:
```
app/components/editor/inspector/
├── InspectorProvider.tsx          # Shared state
├── tree/
│   ├── TreeView.tsx               # react-native-tree-multi-select wrapper
│   ├── TreeNode.tsx               # Custom node renderer
│   └── hooks/useTreeDragDrop.ts   # Gesture-based drag (custom)
├── panels/
│   ├── ResizablePanels.tsx        # react-native-resizable-panels wrapper
│   ├── PanelGroup.tsx
│   └── PanelHandle.tsx
├── properties/
│   ├── PropertyEditor.tsx         # Native + NativeWind
│   ├── PropertyField.tsx
│   └── PropertyGroup.tsx
└── platform/
    ├── useHover.ts                # web: mouse, native: press
    ├── ContextMenu.tsx            # Platform-specific menus
    └── KeyboardShortcuts.ts       # Conditional shortcuts
```

**Key Abstractions**:
1. **Platform-aware hooks**: `useHover()`, `useContextMenu()`
2. **Conditional rendering**: Some features web-only
3. **Feature detection**: Check capabilities, not Platform.OS
4. **Shared types**: TypeScript interfaces for all platforms

---

## Migration Path

### If Starting Cross-Platform:

**Phase 1 (Weeks 1-4)**: Foundation
- Set up react-native-resizable-panels
- Integrate react-native-tree-multi-select
- Build basic property editor
- Test on web + iOS simulator

**Phase 2 (Weeks 5-8)**: Polish
- Add gesture-based interactions
- Platform-specific behaviors
- Performance optimization
- Testing on Android

**Phase 3 (Weeks 9-12)**: Advanced
- Custom tree with drag-and-drop
- Advanced panel layouts
- Keyboard shortcuts
- Stress testing with large scenes

**Phase 4+**: Iterate based on usage

---

## Final Verdict

### Can You Build a Complex Game Editor with Shared UI Code?

**Yes, but with compromises**:

✅ **What's feasible**:
- Basic tree view with selection
- Resizable panel layouts
- Property editors with forms
- Touch + mouse interactions
- Good performance (< 500 entities)

❌ **What's difficult**:
- Tree drag-and-drop (custom build needed)
- Floating/dockable panels (not available)
- Advanced features (inline editing, multi-select drag)
- Identical UX across platforms

⚠️ **What requires trade-offs**:
- Feature parity vs development time
- Bundle size vs functionality
- Custom components vs library limitations

---

## Recommendations

### If You MUST Share Code:

1. **Use the stack**: react-native-tree-multi-select + react-native-resizable-panels + gesture-handler
2. **Start simple**: Basic tree, no drag-drop initially
3. **Build incrementally**: Add complex features later
4. **Test early**: Run on both platforms from week 1
5. **Plan for divergence**: Some features may need platform-specific implementations

### If You Want Best Experience:

**Go Web-First** as recommended in the previous strategy document. Build amazing web inspector with react-arborist + react-resizable-panels. Build simplified native inspector separately.

### If Timeline is Tight:

**Go Web-Only** initially. Add native later if demand exists. Don't compromise both platforms trying to share code.

---

## Appendix: Library Installation

### Cross-Platform Stack

```bash
# Core tree component
npm install react-native-tree-multi-select

# Panels
npm install react-native-resizable-panels

# Gestures + animations (likely already installed)
npm install react-native-gesture-handler react-native-reanimated

# Performance
npm install @shopify/flash-list

# Dev dependencies
npm install -D @types/react-native-tree-multi-select
```

### babel.config.js additions:

```javascript
module.exports = {
  plugins: [
    'react-native-reanimated/plugin',
  ],
};
```

---

## References

- [react-native-tree-multi-select](https://github.com/JairajJangle/react-native-tree-multi-select)
- [react-native-resizable-panels](https://github.com/wcpos/react-native-resizable-panels)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Shopify FlashList](https://shopify.github.io/flash-list/)
- [Radon IDE](https://ide.swmansion.com/)

---

*Research completed 2026-01-27. Library versions and availability subject to change.*
