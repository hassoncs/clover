export function createCoordinateHelpers(worldWidth, worldHeight) {
    const halfW = worldWidth / 2;
    const halfH = worldHeight / 2;
    return {
        cx: (x) => x - halfW,
        cy: (y) => halfH - y,
    };
}
export function generateGridEntities(options) {
    const { rows, cols, startX, startY, cellSize, gap = 0, prefab, tags = [], idPrefix = 'grid', namePrefix = 'Grid', coordinateHelpers, } = options;
    const entities = [];
    const cellSpacing = cellSize + gap;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = startX + col * cellSpacing;
            const y = startY + row * cellSpacing;
            entities.push({
                id: `${idPrefix}-${row}-${col}`,
                name: `${namePrefix} ${row},${col}`,
                prefab,
                tags,
                transform: {
                    x: coordinateHelpers.cx(x),
                    y: coordinateHelpers.cy(y),
                    angle: 0,
                    scaleX: 1,
                    scaleY: 1,
                },
            });
        }
    }
    return entities;
}
//# sourceMappingURL=game-helpers.js.map