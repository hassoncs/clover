# Graph Editor Performance Gate

## Overview

This document defines performance thresholds, benchmarking methodology, and decision criteria for the graph editor renderer architecture. It establishes go/no-go gates for migrating from WebView parity to native Skia rendering.

## Performance Thresholds

### Target Performance (v1)
- **Pan/Zoom**: 60fps sustained during continuous interaction
- **Add Node**: <100ms from user action to visual feedback (50 node graph)
- **Connect Nodes**: <100ms from drag release to edge rendered (50 node graph)
- **Initial Render**: <500ms for 50 node graph with connections

### Acceptable Performance
- **Pan/Zoom**: 30fps minimum during interaction
- **Add Node**: <200ms (50 nodes)
- **Connect Nodes**: <200ms (50 nodes)
- **Initial Render**: <1000ms (50 nodes)

### Performance Failure (triggers Skia migration evaluation)
- Pan/Zoom drops below 30fps on target devices
- Add/Connect operations exceed 200ms at 50 nodes
- Initial render exceeds 1000ms at 50 nodes
- Memory usage exceeds 150MB for 100 node graph

## Benchmarking Methodology

### Web Platform (React Flow)
**Tool**: Playwright with Performance API

```typescript
// Example benchmark structure
const page = await browser.newPage();
await page.goto('http://localhost:8085/editor');

// Measure pan/zoom
const panStart = performance.now();
await page.mouse.move(500, 500);
await page.mouse.down();
await page.mouse.move(600, 600);
await page.mouse.up();
const panDuration = performance.now() - panStart;

// Measure add node
const addStart = performance.now();
await page.click('[data-testid="add-node-button"]');
await page.waitForSelector('[data-node-id="node-51"]');
const addDuration = performance.now() - addStart;
```

**Metrics to Capture**:
- Frame rate during pan/zoom (via `requestAnimationFrame` timing)
- Time to interactive for add/connect operations
- Memory usage via Chrome DevTools Protocol

### Native Platform (WebView)
**Tool**: Xcode Instruments (Time Profiler, Allocations)

**Procedure**:
1. Load benchmark graph (20/50/100 nodes) via fixture
2. Record Instruments trace during:
   - 10 seconds of continuous pan/zoom
   - 10 add node operations
   - 10 connect operations
3. Analyze:
   - CPU usage (target <50% on iPhone 12)
   - Memory footprint
   - Frame drops in main thread

**Metrics to Capture**:
- Main thread CPU %
- Memory allocations
- Frame drops (target 0 drops during pan/zoom)

## Decision Matrix

### Keep WebView Parity (Current Recommendation)
**Conditions**:
- Performance meets "Acceptable" thresholds at 50 nodes
- Development velocity remains high (React Flow ecosystem)
- No user complaints about performance in beta testing

**Rationale**:
- React Flow is battle-tested and feature-rich
- WebView overhead is acceptable for v1 graph sizes (<100 nodes)
- Faster time to market with proven library

### Evaluate Skia Migration
**Triggers** (any of):
- Performance falls below "Acceptable" at 50 nodes
- User feedback indicates sluggishness
- Product roadmap requires >100 node graphs
- Need for custom rendering features (e.g., minimap, curved edges)

**Requirements Before Migration**:
- Benchmark shows >2x performance improvement with Skia prototype
- Skia implementation achieves feature parity with React Flow
- Development cost justified by performance gains

### Commit to Skia Migration
**Conditions** (all must be true):
- Performance failure at 50 nodes OR product requirement for 100+ nodes
- Skia prototype demonstrates 60fps at 100 nodes
- Team capacity for 2-3 week migration effort

## Go/No-Go Gates

### Gate 1: v1 Launch (Current)
**Decision**: Keep WebView parity
**Criteria**: Performance meets "Acceptable" at 50 nodes
**Action**: Ship with React Flow (web) + WebView (native)

### Gate 2: Post-Launch Evaluation (3 months)
**Decision Point**: Evaluate Skia migration
**Criteria**:
- User analytics show average graph size
- Performance metrics from production
- User feedback on responsiveness

**Go**: If >20% of users create 75+ node graphs OR performance complaints
**No-Go**: If <10% of users exceed 50 nodes AND no performance issues

### Gate 3: Skia Migration (if triggered)
**Decision Point**: Commit to Skia implementation
**Criteria**:
- Prototype benchmarks show 60fps at 100 nodes
- Feature parity checklist complete
- Engineering capacity available

**Go**: All criteria met
**No-Go**: Defer to next quarter, optimize WebView path

## Initial Recommendation

**Status**: Keep WebView parity for v1

**Reasoning**:
1. **Time to Market**: React Flow provides immediate feature completeness
2. **Risk Mitigation**: Proven library reduces unknowns
3. **Sufficient Performance**: WebView overhead acceptable for target graph sizes (20-50 nodes)
4. **Deferred Optimization**: Skia migration can be data-driven post-launch

**Next Steps**:
1. Implement benchmark fixtures (see `benchmark-graphs.ts`)
2. Run baseline performance tests on web and native
3. Establish monitoring for production graph sizes
4. Re-evaluate at Gate 2 (3 months post-launch)

## Benchmark Fixtures

See `shared/src/graph-core/__tests__/fixtures/benchmark-graphs.ts` for:
- `generateBenchmarkGraph(nodeCount)`: Creates connected graphs at 20/50/100 nodes
- Chain topology for realistic edge density
- Validated against `validateDocument`

## References

- Web Editor: `app/components/editor/graph/GraphEditor.web.tsx`
- Native Editor: `app/components/editor/graph/GraphEditor.native.tsx`
- Graph Core: `shared/src/graph-core/`
