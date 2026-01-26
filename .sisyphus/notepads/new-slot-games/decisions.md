# Decisions - New Slot Games Implementation

## Implementation Order
1. Flappy Bird - Simplest, validates basic slot system
2. Memory Match - Simple grid, no physics complexity
3. 2048 - Grid-based, validates grid patterns
4. Bubble Shooter - First Match3 reuse
5. Connect 4 - Second Match3 reuse
6. Puyo Puyo - Ultimate test combining Tetris + Match3

## Asset Strategy
- Use placeholder sprites (rect/circle) for initial implementation
- Assets will be generated later via Scenario.com pipeline
- ASSET_BASE can point to placeholder or be empty initially

## Slot Reuse Strategy
- Match3.matchDetection -> Bubble Shooter (flood-fill), Connect 4 (4-length), Puyo Puyo (4+ connected)
- Tetris.rotationRule -> Puyo Puyo (pair rotation)
- Tetris.dropSpeed -> Puyo Puyo (falling speed)

