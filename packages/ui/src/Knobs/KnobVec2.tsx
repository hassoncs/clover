import React, { useRef } from "react";
import { PanResponder, Text, View } from "react-native";
import type { KnobVec2Props } from "./types";

export function KnobVec2({
	label,
	description,
	value,
	min = { x: -1, y: -1 },
	max = { x: 1, y: 1 },
	onChange,
	disabled,
}: KnobVec2Props) {
	const size = 120;

	const getPosition = (val: { x: number; y: number }) => {
		const rangeX = max.x - min.x;
		const rangeY = max.y - min.y;

		const x = ((val.x - min.x) / rangeX) * size;
		// Y is inverted in screen coordinates (0 is top)
		const y = size - ((val.y - min.y) / rangeY) * size;

		return { x, y };
	};

	const getValue = (x: number, y: number) => {
		const rangeX = max.x - min.x;
		const rangeY = max.y - min.y;

		const valueX = (x / size) * rangeX + min.x;
		// Invert Y back
		const valueY = ((size - y) / size) * rangeY + min.y;

		return {
			x: Math.max(min.x, Math.min(max.x, valueX)),
			y: Math.max(min.y, Math.min(max.y, valueY)),
		};
	};

	const handleTouch = (evt: any) => {
		if (disabled) return;
		const { locationX, locationY } = evt.nativeEvent;
		const clampedX = Math.max(0, Math.min(size, locationX));
		const clampedY = Math.max(0, Math.min(size, locationY));
		onChange(getValue(clampedX, clampedY));
	};

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderGrant: (evt) => handleTouch(evt),
			onPanResponderMove: (evt) => handleTouch(evt),
		}),
	).current;

	const pos = getPosition(value);

	return (
		<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
			<View className="flex-row justify-between mb-2">
				<Text className="text-white font-medium">{label}</Text>
			</View>

			{description && (
				<Text className="text-gray-400 text-xs mb-3">{description}</Text>
			)}

			<View className="flex-row gap-4">
				<View
					className="bg-gray-800 rounded border border-gray-700 overflow-hidden relative"
					style={{ width: size, height: size }}
					{...panResponder.panHandlers}
				>
					<View className="absolute inset-0 justify-center items-center opacity-20">
						<View className="w-full h-[1px] bg-gray-500" />
						<View className="h-full w-[1px] bg-gray-500 absolute" />
					</View>

					<View
						className="absolute w-4 h-4 bg-purple-500 rounded-full border border-white shadow-sm"
						style={{
							left: pos.x - 8,
							top: pos.y - 8,
						}}
					/>
				</View>

				<View className="justify-center gap-2">
					<View className="bg-gray-800/50 px-3 py-2 rounded border border-gray-700/50 min-w-[80px]">
						<Text className="text-gray-400 text-xs font-mono mb-0.5">X</Text>
						<Text className="text-white font-mono font-medium">
							{value.x.toFixed(2)}
						</Text>
					</View>
					<View className="bg-gray-800/50 px-3 py-2 rounded border border-gray-700/50 min-w-[80px]">
						<Text className="text-gray-400 text-xs font-mono mb-0.5">Y</Text>
						<Text className="text-white font-mono font-medium">
							{value.y.toFixed(2)}
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
