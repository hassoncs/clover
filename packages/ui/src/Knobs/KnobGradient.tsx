import { clsx } from "clsx";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KnobColor } from "./KnobColor";
import type { GradientStop, KnobGradientProps } from "./types";

const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: { r: 0, g: 0, b: 0 };
};

const componentToHex = (c: number) => {
	const hex = Math.round(c).toString(16);
	return hex.length === 1 ? "0" + hex : hex;
};

const rgbToHex = (r: number, g: number, b: number) => {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const interpolateColor = (color1: string, color2: string, factor: number) => {
	const c1 = hexToRgb(color1);
	const c2 = hexToRgb(color2);
	const r = c1.r + factor * (c2.r - c1.r);
	const g = c1.g + factor * (c2.g - c1.g);
	const b = c1.b + factor * (c2.b - c1.b);
	return rgbToHex(r, g, b);
};

const getGradientColor = (position: number, stops: GradientStop[]) => {
	if (stops.length === 0) return "#000000";
	const sortedStops = [...stops].sort((a, b) => a.position - b.position);
	if (position <= sortedStops[0].position) return sortedStops[0].color;
	if (position >= sortedStops[sortedStops.length - 1].position)
		return sortedStops[sortedStops.length - 1].color;

	for (let i = 0; i < sortedStops.length - 1; i++) {
		const s1 = sortedStops[i];
		const s2 = sortedStops[i + 1];
		if (position >= s1.position && position <= s2.position) {
			const factor = (position - s1.position) / (s2.position - s1.position);
			return interpolateColor(s1.color, s2.color, factor);
		}
	}
	return sortedStops[0].color;
};

export function KnobGradient({
	label,
	description,
	value,
	onChange,
	minStops = 2,
	maxStops = 5,
	disabled,
}: KnobGradientProps) {
	const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(
		null,
	);

	const segments = useMemo(() => {
		const count = 40;
		return Array.from({ length: count }).map((_, i) => {
			const pos = i / (count - 1);
			return getGradientColor(pos, value);
		});
	}, [value]);

	const handleStopPress = (index: number) => {
		if (disabled) return;
		setSelectedStopIndex(index === selectedStopIndex ? null : index);
	};

	const handleColorChange = (color: string) => {
		if (selectedStopIndex === null) return;
		const newStops = [...value];
		newStops[selectedStopIndex] = { ...newStops[selectedStopIndex], color };
		onChange(newStops);
	};

	const handleAddStop = () => {
		if (value.length >= maxStops) return;

		const sortedStops = [...value].sort((a, b) => a.position - b.position);
		let maxGap = 0;
		let insertPos = 0.5;

		if (sortedStops.length < 2) {
			insertPos =
				sortedStops.length === 0
					? 0.5
					: sortedStops[0].position > 0.5
						? 0.25
						: 0.75;
		} else {
			for (let i = 0; i < sortedStops.length - 1; i++) {
				const gap = sortedStops[i + 1].position - sortedStops[i].position;
				if (gap > maxGap) {
					maxGap = gap;
					insertPos = sortedStops[i].position + gap / 2;
				}
			}
		}

		const newColor = getGradientColor(insertPos, value);
		const newStops = [...value, { position: insertPos, color: newColor }];
		newStops.sort((a, b) => a.position - b.position);

		onChange(newStops);
		const newIndex = newStops.findIndex((s) => s.position === insertPos);
		setSelectedStopIndex(newIndex);
	};

	const handleDeleteStop = () => {
		if (selectedStopIndex === null || value.length <= minStops) return;
		const newStops = value.filter((_, i) => i !== selectedStopIndex);
		onChange(newStops);
		setSelectedStopIndex(null);
	};

	return (
		<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
			<View className="flex-row justify-between mb-2 items-center">
				<Text className="text-white font-medium">{label}</Text>
			</View>
			{description && (
				<Text className="text-gray-400 text-xs mb-3">{description}</Text>
			)}

			<View className="h-12 w-full rounded-md overflow-hidden flex-row mb-6 relative border border-gray-700">
				{segments.map((color, i) => (
					// eslint-disable-next-line react/no-array-index-key
					<View
						key={`segment-${i}`}
						style={{ backgroundColor: color, flex: 1 }}
					/>
				))}
			</View>

			<View className="h-0 w-full relative -mt-9 mb-6">
				{value.map((stop, index) => (
					<Pressable
						key={`${stop.position}-${stop.color}-${index}`}
						onPress={() => handleStopPress(index)}
						className={clsx(
							"absolute w-5 h-5 -ml-2.5 rounded-full border-2 shadow-sm items-center justify-center",
							selectedStopIndex === index
								? "border-white z-10 bg-gray-800"
								: "border-gray-500 z-0 bg-gray-800",
						)}
						style={{
							left: `${stop.position * 100}%`,
							top: 12,
						}}
					>
						<View
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: stop.color }}
						/>
					</Pressable>
				))}
			</View>

			{selectedStopIndex !== null && (
				<View className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
					<View className="flex-row justify-between items-center mb-2">
						<Text className="text-gray-300 text-sm">
							Stop {selectedStopIndex + 1} (
							{Math.round(value[selectedStopIndex].position * 100)}%)
						</Text>
						{value.length > minStops && (
							<Pressable onPress={handleDeleteStop}>
								<Text className="text-red-400 text-xs">Delete</Text>
							</Pressable>
						)}
					</View>
					<KnobColor
						label="Color"
						value={value[selectedStopIndex].color}
						onChange={handleColorChange}
					/>
				</View>
			)}

			{value.length < maxStops && (
				<Pressable
					onPress={handleAddStop}
					className="mt-2 py-2 items-center border border-gray-700 rounded border-dashed active:bg-gray-800"
				>
					<Text className="text-gray-400 text-xs">+ Add Stop</Text>
				</Pressable>
			)}
		</View>
	);
}
