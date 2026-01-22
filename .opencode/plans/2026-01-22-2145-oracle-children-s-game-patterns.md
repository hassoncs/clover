---
title: "Oracle: Children's game patterns"
agent: oracle
created: 2026-01-22T21:45:37.347Z
session_id: ses_41854d702ffeC5OYBfzy9WHrV6
duration: 14s
---

# Oracle: Children's game patterns

**Bottom line**
Build the kid-facing language around concrete nouns + “When…do…” cause/effect, with a tiny set of primitives that always produce immediate, visible results. Make “random” and “composition” physical (bag/spinner + snap/stick/wear), and make “memory” a collectible container (bag/sticker book) rather than “variables.”

**Action plan**
1. Pick ~12 primitives (below) and enforce a “one screen reads it” JSON style (no deep nesting, no IDs).
2. Implement them as an ECS-style runtime: entities (“Things”) + components (“can move / can be worn / is in bag”) + event systems (“when touched”).
3. Add 3 “magic moment” affordances: instant preview, big juicy defaults (particles/sounds), and a remix/share button.
4. Add a “kid text” layer: every JSON node can render as a single English sentence (“Pick a random hat from Hats”).

**Effort estimate**
Medium (1–2d) to define primitives + schema + runtime mapping; Large (3d+) if you also want a polished live editor + instant preview UX.

---

## 1) Patterns kids intuitively understand (Scratch / Roblox / Mario Maker)

- “When X happens, do Y” (events/triggers beat polling/loops)
- Objects-as-actors: “my character”, “enemy”, “coin” (not classes/types)
- Direct manipulation first, rules second (drag/drop, then configure)
- Big, named categories: Looks / Sounds / Movement / Power-ups (components)
- Constrained choices: palettes, menus, preset behaviors (reduces blank-page fear)
- Copy/remix: duplicating working things is the main learning loop
- Spatial thinking: levels are places; objects live “in” places; camera is a window

---

## 2) Children’s natural mental models of games

- Games are made of “Things” in a “World/Level”
- Things have “costumes” and “powers”
- Things react when they “touch”, “see”, “hear”, “get clicked”
- Rules feel like “if this, then that” stories
- Progress = collections (coins, badges) +
