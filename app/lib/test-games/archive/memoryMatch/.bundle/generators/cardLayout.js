// Memory Match Card Layout Generator
// Generates a shuffled 4x4 grid of card pairs

export function generate(ctx) {
  const WORLD_WIDTH = ctx.getConstant("WORLD_WIDTH");
  const WORLD_HEIGHT = ctx.getConstant("WORLD_HEIGHT");
  const CARD_WIDTH = ctx.getConstant("CARD_WIDTH");
  const CARD_HEIGHT = ctx.getConstant("CARD_HEIGHT");
  const GRID_COLS = ctx.getConstant("GRID_COLS");
  const GRID_ROWS = ctx.getConstant("GRID_ROWS");
  const CARD_SPACING_X = ctx.getConstant("CARD_SPACING_X");
  const CARD_SPACING_Y = ctx.getConstant("CARD_SPACING_Y");
  const GRID_START_X = ctx.getConstant("GRID_START_X");
  const GRID_START_Y = ctx.getConstant("GRID_START_Y");
  const NUM_PAIRS = ctx.getConstant("NUM_PAIRS");
  
  // Helper to convert grid to world coordinates
  function cx(x) {
    return x - WORLD_WIDTH / 2;
  }
  
  function cy(y) {
    return WORLD_HEIGHT / 2 - y;
  }
  
  // Create pairs array [0,0,1,1,2,2,...]
  const pairIds = [];
  for (let i = 0; i < NUM_PAIRS; i++) {
    pairIds.push(i, i);
  }
  
  // Fisher-Yates shuffle using seeded random
  for (let i = pairIds.length - 1; i > 0; i--) {
    const j = ctx.randomInt(0, i);
    [pairIds[i], pairIds[j]] = [pairIds[j], pairIds[i]];
  }
  
  // Generate card entities
  const cards = [];
  let idx = 0;
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = GRID_START_X + col * CARD_SPACING_X;
      const y = GRID_START_Y + row * CARD_SPACING_Y;
      const pairId = pairIds[idx];
      
      cards.push({
        id: `card-${idx}`,
        name: `Card ${idx + 1}`,
        template: "cardBack",
        tags: ["card", "face-down", `pair-${pairId}`],
        transform: {
          x: cx(x),
          y: cy(y),
          angle: 0,
          scaleX: 1,
          scaleY: 1
        },
        variables: {
          pairId: pairId,
          cardIndex: idx
        }
      });
      
      idx++;
    }
  }
  
  return cards;
}
