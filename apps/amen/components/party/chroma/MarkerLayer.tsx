import React from "react";
import { View } from "react-native";
import type { GridCoordinate } from "./colorGrid";

export interface PlayerMarker {
	id: string;
	row: number;
	col: number;
	color: string;
	score?: number;
}

interface MarkerLayerProps {
	markers: PlayerMarker[];
	targetColor?: GridCoordinate;
	showScoringFrame?: boolean;
}

const SCORE_COLORS = {
	3: "#22c55e",
	2: "#3b82f6",
	1: "#eab308",
	0: "#6b7280",
};

export function MarkerLayer({
	markers,
	targetColor,
	showScoringFrame,
}: MarkerLayerProps) {
	return (
		<View className="absolute inset-0 w-full h-full" pointerEvents="none">
			{showScoringFrame && targetColor && (
				<View
					className="absolute border-2 border-white/80 rounded-sm z-10"
					style={{
						left: `${Math.max(0, targetColor.col - 1) * 5}%`,
						top: `${Math.max(0, targetColor.row - 1) * 5}%`,
						width: `${(Math.min(19, targetColor.col + 1) - Math.max(0, targetColor.col - 1) + 1) * 5}%`,
						height: `${(Math.min(19, targetColor.row + 1) - Math.max(0, targetColor.row - 1) + 1) * 5}%`,
					}}
				/>
			)}

			{markers.map((marker) => {
				let backgroundColor = marker.color;
				const borderColor = "white";

				if (marker.score !== undefined && marker.score in SCORE_COLORS) {
					backgroundColor =
						SCORE_COLORS[marker.score as keyof typeof SCORE_COLORS];
				}

				return (
					<View
						key={marker.id}
						className="absolute w-[5%] h-[5%] items-center justify-center z-20"
						style={{
							left: `${marker.col * 5}%`,
							top: `${marker.row * 5}%`,
						}}
					>
						<View
							className="w-3 h-3 rounded-full border shadow-sm"
							style={{ backgroundColor, borderColor }}
						/>
					</View>
				);
			})}
		</View>
	);
}
