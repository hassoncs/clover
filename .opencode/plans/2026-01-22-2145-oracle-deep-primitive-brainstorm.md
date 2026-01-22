---
title: "Oracle: Deep primitive brainstorm"
agent: oracle
created: 2026-01-22T21:45:26.341Z
session_id: ses_41854f488ffeij2WbcJ2FcaRL6
duration: 14s
---

# Oracle: Deep primitive brainstorm

**Bottom line**
- You’re very close: the missing “engine primitives” aren’t more physics or more triggers—they’re (1) parts/attachments, (2) collections + memory, and (3) first-class randomization utilities.
- If you add a small set of *data-driven composition* and *container* primitives, every one of your six use cases becomes a simple recipe of “pick → assemble → animate/resolve”.

**Action plan**
1. Add **Attachment + PartSlot** (visual + physics), so entities can be built from parts reliably.
2. Add **Collections/Containers** (List/Map + Deck/Bag/Inventory) with a few child-friendly ops (shuffle/draw/put-back).
3. Add **Randomization utilities** (weighted pick, shuffle bag, seeded RNG) that integrate with Rules/Expressions.
4. Add **Query/Tag + ForEach** so rules can operate over groups (“all reels”, “all rooms”, “all cards in hand”).
5. Add **Recipe/Builder** as a composition pattern: a declarative “how to assemble” asset that Rules can run.

**Effort estimate**
- Medium (1–2d) for a minimal, high-impact version (Attachment/Slots + Deck/Bag + weighted random + basic query/foreach).
- Large (3d+) if you also want dungeon graph generation + editor UX polish (previews, snapping, part palettes).

---

## 1) Fundamental primitives missing (prioritized)

### 1) `PartSlot` (aka Socket)
What it is:
- A named attachment location on an entity, defined by transform + optional constraints.
- Example slots: `head`, `eyes`, `mouth`, `wheel_front`, `door_north`.

Key properties:
- `slotName: string`
- `localTransform: Transform`
- `layerHint/zIndexHint`
- `allowedTags: string[]` (what can go here)
- `maxParts: number` (usually 1; sometimes many like “stickers”)

Enables:
- Random Doll Builder, Monster Mixer, Car Builder (visual assembly becomes trivial and consistent).

---

### 2) `AttachPart(part, slot)` + `DetachPart(slot)` (
