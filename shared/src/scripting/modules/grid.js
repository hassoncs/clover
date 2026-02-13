function worldToGrid(x, y, cellSize) {
	return {
		col: Math.floor(x / cellSize),
		row: Math.floor(y / cellSize),
	};
}

function gridToWorld(col, row, cellSize) {
	return {
		x: col * cellSize + cellSize / 2,
		y: row * cellSize + cellSize / 2,
	};
}

function neighbors(col, row, opts) {
	var includeDiagonals = opts && opts.diagonals ? true : false;
	var result = [];
	var i;
	var directions = [
		{ col: 0, row: -1 },
		{ col: 1, row: 0 },
		{ col: 0, row: 1 },
		{ col: -1, row: 0 },
	];
	if (includeDiagonals) {
		directions.push(
			{ col: 1, row: -1 },
			{ col: 1, row: 1 },
			{ col: -1, row: 1 },
			{ col: -1, row: -1 },
		);
	}
	for (i = 0; i < directions.length; i++) {
		result.push({ col: col + directions[i].col, row: row + directions[i].row });
	}
	return result;
}

function cellKey(row, col) {
	return row + "," + col;
}

function isValidCell(grid, row, col) {
	if (row < 0 || row >= grid.length) return false;
	var rowCells = grid[row];
	if (!rowCells || col < 0 || col >= rowCells.length) return false;
	return true;
}

function floodFill(grid, row, col, matchFn) {
	var rows = grid.length;
	var startCell, matched, visited, queue, current, key, cell, nbrs, i, nKey;
	if (rows === 0) return [];
	startCell = grid[row] && grid[row][col];
	if (startCell === undefined) return [];

	matched = [];
	visited = {};
	queue = [{ row: row, col: col }];

	while (queue.length > 0) {
		current = queue.shift();
		key = cellKey(current.row, current.col);
		if (visited[key]) continue;
		visited[key] = true;

		if (!isValidCell(grid, current.row, current.col)) continue;

		cell = grid[current.row][current.col];
		if (cell === undefined || !matchFn(cell, startCell)) continue;

		matched.push({ row: current.row, col: current.col });

		nbrs = neighbors(current.col, current.row);
		for (i = 0; i < nbrs.length; i++) {
			nKey = cellKey(nbrs[i].row, nbrs[i].col);
			if (!visited[nKey]) {
				queue.push({ row: nbrs[i].row, col: nbrs[i].col });
			}
		}
	}

	return matched;
}

function findConnectedGroups(grid, matchFn, minSize) {
	var rows = grid.length;
	var visited, groups, row, col, key, cell, group, i;
	var min = minSize !== undefined ? minSize : 1;
	if (rows === 0) return [];

	visited = {};
	groups = [];

	for (row = 0; row < rows; row++) {
		if (!grid[row]) continue;
		for (col = 0; col < grid[row].length; col++) {
			key = cellKey(row, col);
			if (visited[key]) continue;

			cell = grid[row][col];
			if (cell === undefined) continue;

			group = floodFill(grid, row, col, matchFn);
			for (i = 0; i < group.length; i++) {
				visited[cellKey(group[i].row, group[i].col)] = true;
			}

			if (group.length >= min) {
				groups.push(group);
			}
		}
	}

	return groups;
}

function findLineMatches(grid, minLength, matchFn) {
	var rows = grid.length;
	var directions,
		matches,
		foundLines,
		row,
		col,
		cell,
		d,
		line,
		lineKey,
		cells,
		i,
		keys;
	if (rows === 0) return [];

	directions = [
		{ dRow: 0, dCol: 1 },
		{ dRow: 1, dCol: 0 },
		{ dRow: 1, dCol: 1 },
		{ dRow: 1, dCol: -1 },
	];
	matches = [];
	foundLines = {};

	for (row = 0; row < rows; row++) {
		if (!grid[row]) continue;
		for (col = 0; col < grid[row].length; col++) {
			cell = grid[row][col];
			if (cell === undefined || !matchFn(cell)) continue;

			for (d = 0; d < directions.length; d++) {
				line = checkLine(
					grid,
					row,
					col,
					directions[d].dRow,
					directions[d].dCol,
					minLength,
					matchFn,
				);
				if (line) {
					keys = [];
					for (i = 0; i < line.length; i++) {
						keys.push(cellKey(line[i].row, line[i].col));
					}
					keys.sort();
					lineKey = keys.join("|");
					if (!foundLines[lineKey]) {
						foundLines[lineKey] = true;
						matches.push({ cells: line, direction: directions[d] });
					}
				}
			}
		}
	}

	return matches;
}

function checkLine(grid, startRow, startCol, dRow, dCol, minLength, matchFn) {
	var rows = grid.length;
	var cells, i, r, c, cell;
	cells = [{ row: startRow, col: startCol }];

	for (i = 1; i < minLength; i++) {
		r = startRow + dRow * i;
		c = startCol + dCol * i;
		if (!isValidCell(grid, r, c)) return null;
		cell = grid[r][c];
		if (cell === undefined || !matchFn(cell)) return null;
		cells.push({ row: r, col: c });
	}

	r = startRow + dRow * minLength;
	c = startCol + dCol * minLength;
	while (isValidCell(grid, r, c)) {
		cell = grid[r][c];
		if (cell === undefined || !matchFn(cell)) break;
		cells.push({ row: r, col: c });
		r = r + dRow;
		c = c + dCol;
	}

	return cells;
}

module.exports = {
	worldToGrid: worldToGrid,
	gridToWorld: gridToWorld,
	neighbors: neighbors,
	cellKey: cellKey,
	isValidCell: isValidCell,
	floodFill: floodFill,
	findConnectedGroups: findConnectedGroups,
	findLineMatches: findLineMatches,
};
