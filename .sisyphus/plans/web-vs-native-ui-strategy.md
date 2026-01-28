# Web vs Native UI Strategy - Inspector Panel System

**Date**: 2026-01-27  
**Context**: Building a DevTools-like inspector for the Slopcade game editor  
**Decision Required**: Should we build separate web/native implementations or attempt code sharing?

---

## Executive Summary

**RECOMMENDATION: Web-First with Separate Native Implementation (Deferred)**

Build the inspector as a **web-only feature first** using specialized React web libraries. Do not attempt to share code with native. When native support is needed later, build a simplified native-specific inspector using React Native primitives.

**Rationale**:
- Web has mature, battle-tested libraries for complex editor UIs (trees, panels, drag-drop)
- React Native lacks equivalent quality libraries for these complex patterns
- Code sharing attempts result in lowest-common-denominator experiences
- The web editor is the primary development environment
- Native inspector can be simpler (read-only, basic tree) without harming productivity

---

## Current Stack Analysis

### What's Already in Use

| Library | Purpose | Web/Native |
|---------|---------|------------|
| `react-native` + `react-native-web` | Core framework | Both |
| `nativewind` | Styling (Tailwind) | Both |
| `@gorhom/bottom-sheet` | Panel infrastructure | Both |
| `react-native-gesture-handler` | Gestures | Both |
| `react-native-reanimated` | Animations | Both |
| `@react-native-community/slider` | Sliders | Both |

### Current UI Patterns

- **Panels**: Custom implementations on top of `@gorhom/bottom-sheet`
- **Styling**: NativeWind utility classes
- **Gestures**: Custom hooks using `react-native-gesture-handler`
- **No tree component**: Currently using flat lists

### Critical Gap

**No existing tree/hierarchy component** - this is the hardest part to build cross-platform.

---

## Library Research Summary

### Web-Only Libraries (Excellent for Editors)

| Library | Bundle Size | Feature | Quality |
|---------|-------------|---------|---------|
| **React Complex Tree** | ~30KB | Tree hierarchy | ⭐⭐⭐⭐⭐ |
| **react-resizable-panels** | ~5KB | Panel layout | ⭐⭐⭐⭐⭐ |
| **dnd-kit** | ~14KB | Drag-and-drop | ⭐⭐⭐⭐⭐ |
| **react-arborist** | ~25KB | Tree (virtualized) | ⭐⭐⭐⭐⭐ |

**Total for core UI**: ~75KB gzipped

### Cross-Platform Libraries (Limitations)

| Library | Bundle Size | Tree | Panels | Drag-Drop | Notes |
|---------|-------------|------|--------|-----------|-------|
| **Tamagui** | ~24KB | ❌ | ⚠️ | ❌ | Performance king, no tree |
| **React Native Paper** | ~300KB | ❌ | ❌ | ❌ | Material Design only |
| **NativeBase** | ~400KB | ❌ | ❌ | ❌ | Heavy, less maintained |
| **React Native Reusables** | ~50KB | ❌ | ⚠️ | ❌ | Modern but limited |

**Reality**: No cross-platform library provides quality tree, panel, or drag-drop components suitable for a complex editor.

---

## Strategic Options

### Option 1: Web-First, Separate Native (RECOMMENDED)

**Approach**:
- Build rich web inspector using specialized web libraries
- Build simplified native inspector using RN primitives
- Accept they are different implementations

**Web Stack**:
```
React Complex Tree    →  Hierarchy panel
react-resizable-panels →  Draggable panel layout
dnd-kit               →  Drag-and-drop entity reordering
react-hook-form       →  Property editors
Tailwind CSS          →  Styling
```

**Native Stack** (simplified):
```
Custom FlatList       →  Simple entity list (no hierarchy)
@gorhom/bottom-sheet  →  Panels (existing)
No drag-drop          →  Tap to select only
NativeWind           →  Styling (existing)
```

**Pros**:
- ✅ Best possible web experience
- ✅ Mature, well-tested libraries
- ✅ Fast development
- ✅ Native still functional (just simpler)
- ✅ Easy to maintain (separate concerns)

**Cons**:
- ❌ Two implementations to maintain
- ❌ Feature parity requires double work

**Best For**: Primary web development with mobile as secondary

---

### Option 2: Cross-Platform with Custom Components

**Approach**:
- Build custom tree component that works on both platforms
- Use Tamagui or similar for base primitives
- Implement custom drag-drop

**Stack**:
```
Custom Tree Component →  Built with Tamagui primitives
Tamagui Layout        →  Panels
Custom DnD            →  react-native-gesture-handler
dnd-kit (web)         →  Web drag-drop
Tamagui Forms         →  Property editors
```

**Pros**:
- ✅ Single codebase (mostly)
- ✅ Shared business logic
- ✅ Feature parity

**Cons**:
- ❌ Complex tree component is HARD to build well
- ❌ Gesture handling differences between web/native
- ❌ Slower development
- ❌ Compromised UX on both platforms
- ❌ Bundle size increases significantly

**Best For**: Simple inspectors only (not recommended for complex game editors)

---

### Option 3: Web-Only Inspector (No Native)

**Approach**:
- Inspector only works on web
- Native has basic debugging via DevToolbar only

**Stack** (same as Option 1 web):

**Pros**:
- ✅ Maximum development velocity
- ✅ Best possible experience
- ✅ No compromises

**Cons**:
- ❌ No native inspector at all
- ❌ Mobile debugging limited

**Best For**: MVPs, web-first products

---

## Detailed Comparison Matrix

| Criteria | Option 1 (Recommended) | Option 2 (Cross-Platform) | Option 3 (Web-Only) |
|----------|------------------------|---------------------------|---------------------|
| **Development Speed** | Fast | Slow | Very Fast |
| **Web UX Quality** | Excellent | Good | Excellent |
| **Native UX Quality** | Adequate | Good | N/A |
| **Code Sharing** | 30-40% | 70-80% | 0% |
| **Maintenance Burden** | Medium | High | Low |
| **Bundle Size** | Web: 75KB, Native: +0KB | Web: 300KB+, Native: 300KB+ | Web: 75KB |
| **Library Maturity** | High | Low-Medium | High |
| **Team Expertise** | Web-focused | Full-stack | Web-focused |

---

## Implementation Recommendations

### Phase 1: Web Inspector MVP (4-6 weeks)

**Libraries to Install**:
```bash
# Web-only dependencies (app/package.json)
npm install react-complex-tree react-resizable-panels @dnd-kit/core @dnd-kit/sortable
npm install -D @types/react-complex-tree
```

**File Structure**:
```
app/components/editor/inspector/
├── InspectorProvider.tsx          # Shared state
├── InspectorProvider.web.tsx      # Web implementation
├── HierarchyPanel.web.tsx         # React Complex Tree
├── PropertiesPanel.web.tsx        # Resizable panels + forms
├── InspectOverlay.web.tsx         # Highlight overlay
├── hooks/
│   ├── useInspector.ts            # Shared
│   └── useEntityDragDrop.web.ts   # dnd-kit hooks
└── styles/
    └── inspector.css              # Tree-specific styles
```

**Key Decisions**:
1. Use `.web.tsx` extension for web-specific components
2. Keep `InspectorProvider` shared where possible
3. Use feature detection, not platform detection
4. Accept native will have fallback UI

### Phase 2: Native Basic Inspector (2-3 weeks)

**Approach**:
- Flat list of entities (no hierarchy initially)
- Simple properties view
- No drag-and-drop
- Read-only or basic editing

**Benefit**:
- Mobile debugging is possible
- Doesn't block on complex tree implementation
- Can iterate based on usage

### Phase 3: Advanced Features (Both Platforms)

**Web**:
- Drag-and-drop entity reordering
- Advanced filtering/search
- Multi-select operations
- Custom property editors

**Native** (if needed):
- Hierarchical tree view (custom implementation)
- Basic drag-and-drop
- Property editing

---

## Technical Considerations

### State Management Strategy

**Shared State** (works on both):
```typescript
// app/components/editor/inspector/types.ts
interface InspectorState {
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  inspectEnabled: boolean;
  // ...
}
```

**Web-Specific State**:
```typescript
// app/components/editor/inspector/types.web.ts
interface WebInspectorState {
  expandedNodes: Set<string>;
  panelSizes: number[];
  dragActive: boolean;
}
```

### Styling Approach

**Web**:
- Tailwind CSS for layout
- react-complex-tree custom renderers
- CSS modules for tree-specific styles

**Native**:
- NativeWind (existing)
- FlatList + custom items
- Bottom sheet panels (existing)

### Bundle Size Impact

**Web** (additional):
- react-complex-tree: 30KB
- react-resizable-panels: 5KB
- dnd-kit: 14KB
- **Total**: ~50KB gzipped

**Native** (no additional libraries):
- Use existing primitives
- **Total**: 0KB additional

---

## Migration Path

If you start with Option 3 (web-only) and later need native:

1. **Month 1-2**: Build web inspector (Option 3)
2. **Month 3**: Evaluate native needs
3. **Month 4**: Implement native basic inspector
4. **Result**: You have Option 1 (recommended)

This is low-risk and lets you validate the inspector's value before investing in native.

---

## Final Recommendation

### Choose Option 1: Web-First, Separate Native

**Why**:
1. **User Value**: Web editor is primary development environment - maximize its quality
2. **Development Velocity**: Use best-in-class libraries, ship faster
3. **Technical Reality**: Complex editor UIs are genuinely hard to build cross-platform
4. **Maintenance**: Separate implementations are easier than fighting abstractions
5. **Future-Proof**: Can always add native later without rewriting web

**Implementation Order**:
1. ✅ Build web inspector with React Complex Tree + resizable panels
2. ⚠️ Native uses existing DevToolbar + basic entity list
3. 🔄 Add native tree view later if demand exists

**Success Metrics**:
- Web inspector feels like Chrome DevTools
- Native debugging is "good enough" for mobile testing
- Development time < 6 weeks for web MVP

---

## Open Questions

Before finalizing, consider:

1. **What % of development happens on web vs mobile?**
   - If 80%+ web → Option 1 is clear winner
   - If 50/50 → Consider Option 2 (but expect compromises)

2. **Is mobile inspector critical or nice-to-have?**
   - Critical → Option 2 or invest in native tree component
   - Nice-to-have → Option 1 with basic native fallback

3. **Team expertise?**
   - Strong web team → Option 1
   - Balanced team → Could attempt Option 2

4. **Timeline pressure?**
   - Tight deadline → Option 3 (web-only) then expand
   - Comfortable timeline → Option 1 with native phase 2

---

## Next Steps

1. **Decide**: Confirm Option 1, 2, or 3
2. **If Option 1**:
   - Add web-only dependencies to package.json
   - Create `.web.tsx` component structure
   - Implement web inspector first
   - Plan native basic inspector for phase 2
3. **Update Plan**: Modify `.sisyphus/plans/ui-inspector-panel-system.md` with library choices
4. **Prototype**: Build 1-day spike with React Complex Tree to validate

---

## Appendix: Library Installation Commands

### Option 1 - Web Inspector Dependencies

```bash
cd app

# Core tree component
npm install react-complex-tree

# Panel layout
npm install react-resizable-panels

# Drag and drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Form handling (optional, can use native forms)
npm install react-hook-form @hookform/resolvers zod

# Dev dependencies
npm install -D @types/react-complex-tree
```

### Option 2 - Cross-Platform (Not Recommended)

```bash
cd app

# Tamagui (if choosing this path)
npm install tamagui @tamagui/core @tamagui/config

# Still need custom tree implementation
# Still need dnd-kit for web drag-drop
```

---

*Document created for Slopcade UI Inspector Panel System planning*
