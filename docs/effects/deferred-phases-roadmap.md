 # Deferred Phases Roadmap: AI Authoring & Visual Node Editor

This document outlines the roadmap for Phase 8 (AI Authoring) and Phase 9 (Visual Node Editor), which were deferred from the initial Effects System implementation. These phases focus on lowering the barrier to entry for creating complex visual effects and providing a high-fidelity authoring experience.

---

## Phase 8: AI Authoring (The "Genie" System)

**Goal:** Enable users to generate complex effect specifications and GLSL shaders using natural language prompts.

### Tasks & Effort

| Task | Description | Estimated Effort |
| :--- | :--- | :--- |
| **1. Prompt Engineering** | Create `EFFECT_GENERATION_PROMPT` with comprehensive shader library metadata, uniform conventions, and example specs. | 1 day |
| **2. AI Service Integration** | Implement a backend service that interfaces with LLMs (e.g., Claude 3.5 Sonnet, GPT-4o) to generate and validate JSON effect specs. | 1 day |
| **3. Iterative Refinement** | Develop "adjustment prompts" that allow users to patch existing specs (e.g., "make it more blue," "increase the speed"). | 1 day |
| **4. GLSL Validation Pipeline** | **CRITICAL:** Build a headless Godot validation pipeline. Shaders are compiled in a background Godot instance to catch errors before they reach the user. Includes an automated retry loop for AI-generated code. | 2-3 days |
| **5. Spec Database + Sharing** | Integrate with Supabase for saving, loading, and remixing community-generated effect specs. | 1 day |

### Prerequisites
- Stable Effect Spec JSON schema (Phase 1-4).
- Shader Library Metadata (Phase 5-6).
- Headless Godot binary available in the server environment for validation.
- Supabase project initialized with `effect_specs` table.

### Success Metrics
- **Zero-Error Rate:** >90% of AI-generated shaders compile successfully on the first try (after internal validation loop).
- **Iteration Speed:** Users can go from prompt to live preview in under 10 seconds.
- **Remixability:** Users can successfully modify 3+ parameters of an existing effect via natural language.

---

## Phase 9: Visual Node Editor

**Goal:** Provide a professional-grade, node-based interface for composing effects using React Flow.

### Tasks & Effort

| Task | Description | Estimated Effort |
| :--- | :--- | :--- |
| **1. React Flow Setup** | Initialize the node editor environment using `react-flow`. Define the basic canvas, zoom/pan behavior, and theme. | 1 day |
| **2. Custom Node Components** | Create specialized nodes for Effect Specs, including parameter controls (sliders, color pickers) and real-time thumbnails. | 1-2 days |
| **3. Connection Logic** | Implement drag-and-drop connection logic with type-safety (e.g., preventing invalid connections between incompatible nodes) and feedback edges. | 1 day |
| **4. Sync with Runtime** | Integrate the node graph with the live game preview. Changes in the graph trigger hot-swaps of the effect spec in the running game. | 1 day |

### Prerequisites
- Phase 1-7 (Core Effects System) fully operational.
- React-based dashboard or admin tool to host the editor (Web only).
- WebSocket or bridge for live-preview synchronization with the Godot runtime.

### Success Metrics
- **Usability:** A non-technical user can create a "Pulse" effect by connecting three nodes in under 2 minutes.
- **Performance:** The editor remains responsive (60fps) with 50+ nodes on screen.
- **Parity:** 100% of Effect Spec features are representable and editable within the node graph.

---

## Execution Strategy

### Execution Order
1. **Phase 8 (AI Authoring)**: Prioritized first to enable rapid content generation and testing.
2. **Phase 9 (Visual Node Editor)**: Follows to provide fine-grained control over generated or manual effects.

### Recommended Scheduling Options
- **Option A (Sequential):** 2 weeks of dedicated development (approx. 10 days).
- **Option B (Parallel):** Two developers working concurrently (one on AI backend, one on React Flow frontend). Total duration: 1 week.
- **Option C (Phased):** Implement Phase 8 Tasks 1-2 first for immediate "magic" value, then follow with the rest.
