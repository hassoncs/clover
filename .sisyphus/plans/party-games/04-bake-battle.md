# Gargoyle Garnish

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 2–8
> **Category**: Creative Decoration

## Concept
The Great Wizard's garden is full of boring stone gargoyles. Players are "Magical Landscapers" tasked with decorating them using enchanted moss, glowing gems, and ancient runes to satisfy specific "Customer Requests."

## Core Mechanic
Players are given a 3D-looking "Shaped Canvas" (the gargoyle). They have a toolset of "Layers": Base Paint, Icing/Moss (thick strokes), and Toppings/Gems (stamps). The canvas is masked so you can't draw outside the gargoyle's silhouette.

## Game Flow
1. **Lobby** → Choose your "Toolbox" (Theme: Nature, Arcane, or Gothic).
2. **The Request** → A customer asks for something specific (e.g., "A gargoyle that looks like it's been underwater for 100 years").
3. **Decoration Phase** → 90 seconds to apply layers. 
   - Layer 1: Texture (Moss/Stone).
   - Layer 2: Details (Cracks/Runes).
   - Layer 3: Toppings (Gems/Flowers).
4. **The Sabotage** → In the last 20 seconds, you are forced to add one "Cursed Item" to the player's gargoyle to your left.
5. **Finale: The Garden Walk** → Head-to-head voting on which gargoyle best fits the request.

## Scoring System
- **Request Match**: Audience votes on a scale of 1-5.
- **Layering Bonus**: Points for using all three tool types effectively.
- **Sabotage Survival**: If the audience likes the "Cursed Item" you were given, you get bonus points.
- **Aesthetic Peak**: The "Most Beautiful" gargoyle (voted by the host/AI) gets a trophy.

## Content Requirements
- 50+ Gargoyle Silhouettes (Shapes).
- 100+ Decoration Stamps (Gems, Runes, Eyes).
- 200+ Customer Requests.

## Technical Implementation
### Template Changes
- `ShapedCanvas`: Support for `alphaMask` to restrict drawing area.
- `LayeredBrush`: New brush type that supports "Depth" (Z-index) for strokes.

### New Infrastructure
- **Layered Decoration Toolset**: A specialized drawing engine that handles "Stamps" (PNGs with transparency) and "Thick Brushes" (simulating 3D volume).
- **Masking System**: GPU-based masking to ensure all "Ink" stays within the bounds of the `Entity` silhouette.
- **Randomized Selection Logic**: A system to serve a subset of tools/toppings to each player to ensure variety.

### Input Types Used
- `LayeredDrawing`: Drawing with Z-index and stamps.
- `StampPlacement`: Drag-and-drop assets onto the canvas.

### Estimated Phases
- `LOBBY`
- `REQUEST_REVEAL`
- `DECORATION_PHASE`
- `SABOTAGE_PHASE`
- `VOTING`
- `RESULTS`

## Dependencies
- `AlphaMaskingSystem` (New)
- `LayeredDrawingEngine` (New)

## Design Notes
- The "Sabotage" phase prevents the game from being too "serious" and adds a laugh-out-loud moment.
- Pitfall: Too many options overwhelming players. Solution: Limit the "Toppings" palette to 5 random items per round.
