export interface GridCoordinate {
	row: number;
	col: number;
}

export function getColorForCell(row: number, col: number): string {
	const r = Math.max(0, Math.min(19, row));
	const c = Math.max(0, Math.min(19, col));

	const hue = r * 18;
	const saturation = 100 - c * 4;
	const lightness = 50;

	return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function getColorForCoordinate(coord: GridCoordinate): string {
	return getColorForCell(coord.row, coord.col);
}
