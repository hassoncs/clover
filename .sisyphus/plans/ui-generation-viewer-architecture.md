# UI Generation Viewer Architecture Plan

**Status:** Design Document  
**Created:** 2026-01-27  
**Purpose:** Design a production-quality React-based debugging interface for UI generation experiments

---

## Executive Summary

Build a reusable React + Vite application for viewing, comparing, and debugging UI element generation experiments. This will replace the current static HTML comparison reports with a polished, interactive interface suitable for ongoing development work.

**Key Requirements:**
- Show all control types (button, checkbox, panel, etc.) in unified view
- React-based (not static HTML strings)
- A/B overlay comparison (silhouette vs generated)
- Filtering (by theme, strength, control type)
- Production-quality code (clean, organized, maintainable)
- Potential for separate package or integration into existing Storybook

---

## 1. Architecture Decision

### Recommendation: New Package `packages/ui-gen-viewer`

**Rationale:**
- **Clean separation**: Dedicated package with clear boundaries
- **Monorepo integration**: Shares types with `shared`, uses existing infrastructure
- **Reusability**: Can be used by other tools (not just experiments)
- **Storybook independence**: Not tied to Storybook's constraints
- **Build flexibility**: Can be built as static app or integrated into existing apps

**Alternative considered:**
- **Storybook integration**: Would be simpler short-term but limits customization
- **Part of app/**: Would require Expo build to iterate, too slow
- **Standalone in tools/**: Less integration with monorepo

### Directory Structure

```
packages/ui-gen-viewer/
├── src/
│   ├── components/
│   │   ├── App.tsx                    # Main application
│   │   ├── Viewer/
│   │   │   ├── ExperimentGrid.tsx     # Grid of all experiments
│   │   │   ├── ExperimentCard.tsx     # Individual experiment card
│   │   │   ├── ControlFilter.tsx      # Filter by control type
│   │   │   ├── ThemeFilter.tsx        # Filter by theme
│   │   │   └── StrengthFilter.tsx     # Filter by strength
│   │   ├── Comparison/
│   │   │   ├── ABModeSelector.tsx     # Silhouette/Generated/Click-to-Switch
│   │   │   ├── ImageOverlay.tsx       # Overlay comparison component
│   │   │   └── SideBySide.tsx         # Side-by-side comparison
│   │   ├── Preview/
│   │   │   ├── SilhouettePreview.tsx
│   │   │   ├── GeneratedPreview.tsx
│   │   │   └── MetadataPanel.tsx
│   │   └── Layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── MainContent.tsx
│   ├── hooks/
│   │   ├── useExperiments.ts          # Load experiment data
│   │   ├── useComparisonMode.ts       # A/B mode state
│   │   ├── useFilters.ts              # Filter state
│   │   └── useFileWatcher.ts          # Live reload on changes
│   ├── services/
│   │   ├── experimentLoader.ts        # Read experiment files
│   │   ├── imageProcessor.ts          # Image comparison logic
│   │   └── exportManager.ts           # Export/share functionality
│   ├── types/
│   │   ├── experiment.ts              # Experiment data types
│   │   ├── comparison.ts              # Comparison types
│   │   └── filter.ts                  # Filter types
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── styles/
│   │   ├── main.css
│   │   └── variables.css
│   ├── assets/
│   │   └── icons/
│   index.tsx                         # Entry point
│   vite.config.ts                    # Vite configuration
├── package.json
├── tsconfig.json
├── tailwind.config.js                # Tailwind CSS (or use CSS modules)
├── README.md
└── CHANGELOG.md
```

---

## 2. Technology Stack

### Core
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **pnpm** - Package manager (consistent with monorepo)

### Styling
- **Tailwind CSS** - Utility-first styling (fast iteration)
- **CSS Modules** - Component-scoped styles if needed
- **clsx** - Conditional class names

### State Management
- **React Query (TanStack Query)** - Server state, caching
- **Zustand** - Local state (filters, comparison mode)
- **React Context** - Dependency injection if needed

### Image Handling
- **Browser native** - Canvas API for overlays
- **sharp** - Server-side image processing (if needed)
- **lucide-react** - UI icons

### Development
- **ESLint + Prettier** - Code formatting
- **Husky + lint-staged** - Git hooks
- **Vitest** - Unit testing
- **Playwright** - E2E testing

---

## 3. Data Flow

### Current (Static HTML)
```
ui-experiment.ts
  → Generate images
  → Build HTML string
  → Write comparison.html
  → Open in browser (static file)
```

### New (React Viewer)
```
ui-experiment.ts
  → Generate images
  → Write experiment.json (metadata)
  → Write image files
  → (Optional) Open viewer in browser

Viewer (Vite dev server)
  → Load experiment.json
  → Display React UI
  → Watch for file changes (live reload)
  → Interactive comparison
```

### Experiment Data Format
```typescript
interface ExperimentMetadata {
  id: string;
  timestamp: string;
  parameters: {
    controlType: 'button' | 'checkbox' | 'panel' | 'progress_bar' | 'scroll_bar' | 'tab_bar';
    theme: string;
    strength: number;
    promptModifiers: string[];
  };
  files: {
    silhouette: string;      // Relative path
    prompt: string;          // Relative path
    generated: string;       // Relative path
    final: string;           // Relative path (if bg removed)
  };
  metadata: {
    dimensions: { width: number; height: number };
    overlayRegions?: {
      text?: { x: number; y: number; width: number; height: number };
      icon?: { x: number; y: number; size: number };
    };
  };
}

interface ExperimentCollection {
  version: '1.0';
  generatedAt: string;
  experiments: ExperimentMetadata[];
}
```

---

## 4. Key Components

### App.tsx
```typescript
export function App() {
  const { experiments, loading, error } = useExperiments();
  const { filters, setFilters } = useFilters();
  const { comparisonMode, setComparisonMode } = useComparisonMode();

  return (
    <div className="ui-gen-viewer">
      <Header />
      <div className="viewer-layout">
        <Sidebar>
          <ControlFilter />
          <ThemeFilter />
          <StrengthFilter />
        </Sidebar>
        <MainContent>
          <ABModeSelector />
          <ExperimentGrid experiments={filteredExperiments} />
        </MainContent>
      </div>
    </div>
  );
}
```

### ImageOverlay.tsx (The core A/B comparison)
```typescript
interface ImageOverlayProps {
  silhouette: string;
  generated: string;
  mode: 'silhouette' | 'generated' | 'click-to-switch';
  onToggle?: () => void;
}

export function ImageOverlay({ silhouette, generated, mode, onToggle }: ImageOverlayProps) {
  const [showGenerated, setShowGenerated] = useState(false);
  
  const handleMouseDown = () => setShowGenerated(true);
  const handleMouseUp = () => setShowGenerated(false);
  
  const isVisible = mode === 'silhouette' 
    ? !showGenerated 
    : mode === 'generated' 
      ? true 
      : showGenerated;
  
  return (
    <div 
      className="image-overlay"
      data-mode={mode}
      onMouseDown={mode === 'click-to-switch' ? handleMouseDown : undefined}
      onMouseUp={mode === 'click-to-switch' ? handleMouseUp : undefined}
      onMouseLeave={mode === 'click-to-switch' ? handleMouseUp : undefined}
    >
      <img src={silhouette} className="layer silhouette" alt="Silhouette" />
      <img 
        src={generated} 
        className={`layer generated ${isVisible ? 'visible' : 'hidden'}`} 
        alt="Generated" 
      />
    </div>
  );
}
```

### useExperiments Hook
```typescript
export function useExperiments() {
  const [experiments, setExperiments] = useState<ExperimentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExperiments() {
      try {
        const data = await loadExperimentCollection();
        setExperiments(data.experiments);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load experiments');
      } finally {
        setLoading(false);
      }
    }

    loadExperiments();
  }, []);

  return { experiments, loading, error };
}
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `packages/ui-gen-viewer` package
- [ ] Set up Vite + React + TypeScript
- [ ] Implement basic experiment loading
- [ ] Create experiment.json format and loader
- [ ] Build simple grid view of all experiments

### Phase 2: Core Features (Week 2)
- [ ] Implement ImageOverlay component (A/B comparison)
- [ ] Add Click-to-Switch interaction
- [ ] Build filtering system (theme, strength, control type)
- [ ] Create metadata panel

### Phase 3: Polish (Week 3)
- [ ] Design and implement sidebar/header
- [ ] Add export functionality (shareable links)
- [ ] Implement file watching (live reload)
- [ ] Add keyboard shortcuts

### Phase 4: Integration (Week 4)
- [ ] Update `ui-experiment.ts` to generate experiment.json
- [ ] Add "open viewer" command to experiment tool
- [ ] Create VS Code extension or command palette integration
- [ ] Document usage

### Phase 5: Future (Post-MVP)
- [ ] Side-by-side comparison mode
- [ ] Multi-image comparison (silhouette → generated → variations)
- [ ] Batch operations (regenerate, export all)
- [ ] Integration with Storybook
- [ ] Cloud sync (save experiments to Supabase)

---

## 6. Migration Path

### From Current Static HTML
1. Keep `ui-experiment.ts` largely unchanged
2. Add `experiment.json` output alongside existing files
3. Update comparison report generation to use new package
4. Optionally deprecate static HTML mode

### Data Compatibility
```typescript
// The new experiment.json should include all data from current HTML report
interface ExperimentMetadata {
  // ... (as defined above)
  
  // Additional data from current implementation
  prompt?: string;           // Current: ui-base-state_2-prompt-*.txt
  timestamp?: number;        // From directory name
  runId?: string;            // From directory name
}
```

---

## 7. Integration Points

### With ui-experiment.ts
```typescript
// In ui-experiment.ts, after generating:
async function generateExperiment() {
  // ... existing generation code ...
  
  // Write experiment.json
  const metadata: ExperimentMetadata = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    parameters: { controlType, theme, strength, modifiers },
    files: { silhouette, prompt, generated, final },
    metadata: { dimensions, overlayRegions }
  };
  
  await writeExperimentJson(experimentDir, metadata);
  
  // Optionally open viewer
  await openViewer(experimentDir);
}
```

### With Build System
```bash
# Build viewer for production
cd packages/ui-gen-viewer
pnpm build

# Output to dist/ (static HTML + assets)
# Can be deployed to any static host
```

### With VS Code (Future)
```json
// .vscode/commands.json
{
  "command": "ui-gen-viewer.open",
  "title": "Open UI Generation Viewer",
  "category": "UI Generation"
}
```

---

## 8. Success Criteria

### Functional
- [ ] Can load and display all experiment data
- [ ] A/B overlay comparison works smoothly
- [ ] Filtering by theme/strength/control type works
- [ ] Click-to-Switch interaction feels responsive
- [ ] Live reload updates without page refresh

### Quality
- [ ] Clean, consistent code style (ESLint + Prettier)
- [ ] TypeScript strict mode passes
- [ ] Unit test coverage > 80%
- [ ] Accessible (keyboard navigation, ARIA labels)

### Experience
- [ ] Fast startup (< 3s for dev server)
- [ ] Smooth animations (60fps)
- [ ] Intuitive navigation
- [ ] Professional appearance

---

## 9. Open Questions

### 1. Styling Approach
**Question:** Tailwind CSS or CSS Modules?
- **Tailwind**: Faster iteration, consistent with rest of project?
- **CSS Modules**: More isolation, less learning curve?

**Recommendation:** Start with Tailwind (matches modern React patterns)

### 2. State Management
**Question:** React Query + Zustand or just Context?
- **React Query**: Good for caching, but may be overkill
- **Zustand**: Simple, lightweight
- **Context**: Built-in, but can cause re-renders

**Recommendation:** Use Zustand for global state, React Query if we add server sync

### 3. Build Output
**Question:** Static HTML or SPA?
- **Static HTML**: Can run without JS (degrades gracefully)
- **SPA**: Better interactivity, requires JS

**Recommendation:** SPA (all interactivity requires JS anyway)

### 4. Deployment
**Question:** Where does this run?
- **Local**: Vite dev server (`pnpm viewer`)
- **Cloud**: Static build on Vercel/Netlify
- **Integrated**: Part of existing app

**Recommendation:** All of the above - make it flexible

---

## 10. Immediate Next Steps

1. **Create package structure** and basic Vite config
2. **Implement experiment loading** (read directory, parse JSON)
3. **Build simple grid view** to verify data loading
4. **Update ui-experiment.ts** to generate experiment.json
5. **Iterate** based on feedback

---

## References

- [Vite React Template](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Query](https://tanstack.com/query/latest)
- [Existing UI Generation Documentation](../asset-generation/UI-GENERATION-GUIDE.md)
- [Text Overlay Architecture](../asset-generation/UI-TEXT-OVERLAY-ARCHITECTURE.md)
