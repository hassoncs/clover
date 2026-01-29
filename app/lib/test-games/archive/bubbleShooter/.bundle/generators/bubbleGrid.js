export function generate(ctx) {
  const WORLD_WIDTH = ctx.getConstant("WORLD_WIDTH");
  const WORLD_HEIGHT = ctx.getConstant("WORLD_HEIGHT");
  const BUBBLE_RADIUS = ctx.getConstant("BUBBLE_RADIUS");
  const BUBBLE_DIAMETER = ctx.getConstant("BUBBLE_DIAMETER");
  const GRID_ROWS = ctx.getConstant("GRID_ROWS");
  const GRID_START_Y = ctx.getConstant("GRID_START_Y");
  
  const cx = (x) => x - WORLD_WIDTH / 2;
  const cy = (y) => WORLD_HEIGHT / 2 - y;
  
  const COLOR_KEYS = ["red", "blue", "green", "yellow", "purple"];
  const rowHeight = BUBBLE_DIAMETER * 0.866;
  
  const bubbles = [];
  let bubbleId = 0;
  
  for (let row = 0; row < GRID_ROWS; row++) {
    const isOffsetRow = row % 2 === 1;
    const bubblesInRow = isOffsetRow ? 7 : 8;
    const startX = isOffsetRow ? 2.0 + BUBBLE_RADIUS : 1.65;
    const spacing = BUBBLE_DIAMETER;
    
    for (let col = 0; col < bubblesInRow; col++) {
      const x = startX + col * spacing;
      const y = GRID_START_Y + row * rowHeight;
      const color = COLOR_KEYS[ctx.randomInt(0, COLOR_KEYS.length - 1)];
      
      bubbles.push({
        id: `bubble-${bubbleId}`,
        name: `Bubble ${bubbleId + 1}`,
        template: `bubble_${color}`,
        transform: {
          x: cx(x),
          y: cy(y),
          angle: 0,
          scaleX: 1,
          scaleY: 1
        }
      });
      
      bubbleId++;
    }
  }
  
  return bubbles;
}
