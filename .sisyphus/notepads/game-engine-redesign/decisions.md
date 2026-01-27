# Game Engine Redesign - Decisions

## Architectural Decisions

### Oracle Session (ses_4081244a2ffeIAKQha6jyYXg6W)
- **Conditional behaviors**: Keep grouped `conditionalBehaviors` (not inline per-behavior)
- **Tags-first**: `when: { hasTag: "selected" }` primary, expressions optional escape hatch
- **Performance-critical**: Evaluate conditionals **only on tag change** (not per-frame)
- **Unify Rules vs Behaviors**: Rules are authoritative, behaviors compile to rules at load
- **Slots from day one**: Fundamental to "Unity Marketplace" vision

### Slot Architecture
- **3 Slot Kinds**: `pure` (match detection), `policy` (swap rules), `hook` (visual feedback)
- **5 Match3 Slots**: `matchDetection`, `swapRule`, `scoring`, `pieceSpawner`, `feedback`
- **Marketplace Resolution**: `"marketplace://diagonal-match@1.2.0"` resolves to registered implementation

### 5 Core Primitives (Unity-Validated)
1. EntityManager - Create, destroy, query entities
2. Transform - Position, rotation, scale (always present)
3. TagManager - Dynamic tags with namespacing (`sys.match3:selected`)
4. EventBus - System-to-system decoupled communication
5. Clock - Delta time, elapsed time

