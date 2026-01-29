export function generate(ctx) {
  const GRID_SIZE = ctx.getConstant("GRID_SIZE");
  const CELL_SIZE = ctx.getConstant("CELL_SIZE");
  const TOTAL_CELL_SIZE = ctx.getConstant("TOTAL_CELL_SIZE");
  const HALF_W = ctx.getConstant("HALF_W");
  const HALF_H = ctx.getConstant("HALF_H");
  
  const LEVEL = [
    ["#", "#", "#", "#", "#", "#", "#"],
    ["#", ".", ".", ".", ".", "G", "#"],
    ["#", ".", "B", ".", ".", ".", "#"],
    ["#", ".", ".", ".", "#", ".", "#"],
    ["#", ".", ".", ".", ".", ".", "#"],
    ["#", ".", ".", ".", ".", ".", "#"],
    ["#", "#", "#", "#", "#", "#", "#"]
  ];
  
  function gridToWorld(row, col) {
    const startX = -HALF_W + 0.5 + CELL_SIZE / 2;
    const startY = HALF_H - 0.5 - CELL_SIZE / 2;
    return {
      x: startX + col * TOTAL_CELL_SIZE,
      y: startY - row * TOTAL_CELL_SIZE
    };
  }
  
  const entities = [];
  let blockId = 0;
  let goalId = 0;
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = LEVEL[row][col];
      const pos = gridToWorld(row, col);
      
      if (cell === "#") {
        entities.push({
          id: `wall-${row}-${col}`,
          name: `Wall ${row},${col}`,
          template: "wall",
          transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
          layer: 1
        });
      } else {
        entities.push({
          id: `floor-${row}-${col}`,
          name: `Floor ${row},${col}`,
          template: "floor",
          transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
          layer: -1
        });
        
        if (cell === "G") {
          entities.push({
            id: `goal-${goalId++}`,
            name: `Goal ${goalId}`,
            template: "goal",
            transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
            layer: 0
          });
        }
        
        if (cell === "B") {
          entities.push({
            id: `block-${blockId++}`,
            name: `Ice Block ${blockId}`,
            template: "iceBlock",
            tags: ["iceBlock"],
            transform: { x: pos.x, y: pos.y, angle: 0, scaleX: 1, scaleY: 1 },
            layer: 2
          });
        }
      }
    }
  }
  
  return entities;
}
