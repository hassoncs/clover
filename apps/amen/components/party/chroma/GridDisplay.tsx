import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { type GridCoordinate, getColorForCell } from "./colorGrid";

interface ColorGridProps {
	onCellSelect?: (row: number, col: number) => void;
	disabled?: boolean;
	selectedCell?: GridCoordinate;
}

export function ColorGrid({
	onCellSelect,
	disabled,
	selectedCell,
}: ColorGridProps) {
	const cells = useMemo(() => {
		const grid: { row: number; col: number; color: string }[] = [];
		for (let row = 0; row < 20; row++) {
			for (let col = 0; col < 20; col++) {
				grid.push({ row, col, color: getColorForCell(row, col) });
			}
		}
		return grid;
	}, []);

	return (
		<View className="flex-row flex-wrap w-full aspect-square bg-black overflow-hidden rounded-lg">
			{cells.map(({ row, col, color }) => {
				const isSelected =
					selectedCell?.row === row && selectedCell?.col === col;
				return (
					<Pressable
						key={`${row}-${col}`}
						className={`w-[5%] h-[5%] border-[0.5px] border-black/10 ${isSelected ? "border-2 border-white z-10" : ""}`}
						style={{ backgroundColor: color }}
						onPress={() => !disabled && onCellSelect?.(row, col)}
						disabled={disabled}
					/>
				);
			})}
		</View>
	);
}
