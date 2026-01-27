# Tier 1 Templates - AI Game Generation

## Overview

Tier 1 provides curated, "black-box" game templates designed for maximum reliability and ease of generation. These templates use pre-configured systems (like Match3) where the AI only needs to provide high-level configuration and visual assets, while the complex logic is handled by the engine's internal "slots".

## Match3 (Gem Crush Style)

The Match3 template enables the creation of grid-based puzzle games where players swap adjacent pieces to create matches of 3 or more.

### Configuration

When generating a Match3 game, the AI should populate the `match3` field in the `GameDefinition`.

| Field | Type | Range | Default | Description |
|-------|------|-------|---------|-------------|
| `rows` | number | 4-12 | 8 | Number of rows in the grid. |
| `cols` | number | 4-12 | 8 | Number of columns in the grid. |
| `cellSize` | number | 0.8-1.5 | 1.2 | Size of each cell in world units (meters). |
| `pieceTemplates` | string[] | 3-6 items | - | List of entity template IDs to use as game pieces. |
| `minMatch` | number | 3-5 | 3 | Minimum number of pieces required for a match. |
| `swapDuration` | number | 0.1-0.3 | 0.15 | Duration of the swap animation in seconds. |
| `fallDuration` | number | 0.05-0.2 | 0.1 | Duration of the piece falling animation per cell. |
| `clearDelay` | number | 0.05-0.2 | 0.1 | Delay before cleared pieces disappear. |

## Tetris (Block Puzzle Style)

The Tetris template enables the creation of falling block puzzle games where players rotate and position tetrominoes to clear horizontal lines.

### Configuration

When generating a Tetris game, the AI should populate the `tetris` field in the `GameDefinition`.

| Field | Type | Range | Default | Description |
|-------|------|-------|---------|-------------|
| `boardWidth` | number | 10-20 | 10 | Number of columns in the board. |
| `boardHeight` | number | 15-25 | 20 | Number of rows in the board. |
| `pieceTemplates` | string[] | 7 items | - | List of 7 entity template IDs (I, O, T, S, Z, J, L). |
| `initialDropSpeed` | number | 0.1-5 | 1 | Initial speed at which pieces fall (cells per second). |

### Tier 1 Constraints

To ensure stability in Tier 1 generation:
- **Do NOT customize slots**: Fields like `rotationRule`, `lineClearing`, and `pieceSpawner` should be omitted to use the default engine implementations.
- **Fixed Grid ID**: Always use `"main_grid"` as the `gridId`.
- **Piece Templates**: Exactly 7 templates must be provided, corresponding to the standard tetromino shapes.
- **Physics**: Tetris pieces should use `kinematic` bodies with `isSensor: true`.
- **Zero Gravity**: The world gravity must be set to `{ x: 0, y: 0 }` as the Tetris system handles piece movement.

### Example Game Definition

```json
{
  "metadata": {
    "id": "neon-tetris",
    "title": "Neon Tetris",
    "version": "1.0.0"
  },
  "world": { "gravity": { "x": 0, "y": 0 } },
  "tetris": {
    "gridId": "main_grid",
    "boardWidth": 10,
    "boardHeight": 20,
    "initialDropSpeed": 1,
    "pieceTemplates": ["piece_i", "piece_o", "piece_t", "piece_s", "piece_z", "piece_j", "piece_l"]
  },
  "templates": {
    "piece_i": {
      "id": "piece_i",
      "tags": ["piece", "cyan"],
      "sprite": { "type": "rect", "width": 0.8, "height": 0.8, "color": "#00FFFF" },
      "physics": { "bodyType": "kinematic", "shape": "box", "width": 0.8, "height": 0.8, "isSensor": true },
      "conditionalBehaviors": [
        { "when": { "hasTag": "sys.tetris:falling" }, "priority": 1, "behaviors": [{ "type": "sprite_effect", "effect": "glow" }] }
      ]
    }
  }
}
```

## AI System Prompt Addendum


When the user's intent is classified as a Match-3 game, the following instructions should be appended to the generation prompt:

```text
For Match-3 games, use the Match3GameSystem:
1. Populate the 'match3' configuration object.
2. Set 'match3.rows' and 'match3.cols' between 4 and 12.
3. Provide 3 to 6 distinct piece templates in 'match3.pieceTemplates'.
4. Ensure all pieces use 'bodyType: kinematic' and 'isSensor: true'.
5. Do NOT provide 'matchDetection' or 'scoring' slots; the engine will use default Match-3 logic.
6. Use 'sys.match3:hovered', 'sys.match3:selected', and 'sys.match3:matched' tags in conditionalBehaviors for visual feedback.
```

```text
For Tetris games, use the TetrisGameSystem:
1. Populate the 'tetris' configuration object.
2. Set 'tetris.boardWidth' (10-20) and 'tetris.boardHeight' (15-25).
3. Provide exactly 7 piece templates in 'tetris.pieceTemplates' (I, O, T, S, Z, J, L).
4. Ensure all pieces use 'bodyType: kinematic' and 'isSensor: true'.
5. Set 'world.gravity' to { x: 0, y: 0 }.
6. Do NOT provide 'rotationRule', 'lineClearing', or 'pieceSpawner' slots.
7. Use 'sys.tetris:falling', 'sys.tetris:locked', and 'sys.tetris:clearing' tags in conditionalBehaviors for visual feedback.
```
