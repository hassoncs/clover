import { Ionicons } from "@expo/vector-icons";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	type GestureResponderEvent,
	Pressable,
	Text,
	View,
} from "react-native";

interface Point {
	x: number;
	y: number;
}

interface Stroke {
	points: Point[];
	color: string;
	width: number;
}

interface DrawingInputProps {
	onSubmit: (data: { strokes: Stroke[] }) => void;
	colors?: string[];
	strokeWidth?: number;
	initialColor?: string;
	timeLimit?: number;
}

const DEFAULT_COLORS = [
	"#000000", // Black
	"#FF0000", // Red
	"#0000FF", // Blue
	"#008000", // Green
	"#FFA500", // Orange
	"#800080", // Purple
];

function getPoint(e: GestureResponderEvent): Point {
	return { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
}

export default function DrawingInput({
	onSubmit,
	colors = DEFAULT_COLORS,
	strokeWidth = 4,
	initialColor = DEFAULT_COLORS[0],
}: DrawingInputProps) {
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
	const [selectedColor, setSelectedColor] = useState(initialColor);
	const currentPointsRef = useRef<Point[]>([]);

	const onTouchStart = useCallback((e: GestureResponderEvent) => {
		const pt = getPoint(e);
		currentPointsRef.current = [pt];
		setCurrentPoints([pt]);
	}, []);

	const onTouchMove = useCallback((e: GestureResponderEvent) => {
		const pt = getPoint(e);
		currentPointsRef.current = [...currentPointsRef.current, pt];
		setCurrentPoints([...currentPointsRef.current]);
	}, []);

	const onTouchEnd = useCallback(() => {
		const pts = currentPointsRef.current;
		if (pts.length > 0) {
			setStrokes((prev) => [
				...prev,
				{
					points: pts,
					color: selectedColor,
					width: strokeWidth,
				},
			]);
			currentPointsRef.current = [];
			setCurrentPoints([]);
		}
	}, [selectedColor, strokeWidth]);

	const paths = useMemo(() => {
		return strokes.map((stroke) => {
			const path = Skia.Path.Make();
			if (stroke.points.length > 0) {
				path.moveTo(stroke.points[0].x, stroke.points[0].y);
				for (let i = 1; i < stroke.points.length; i++) {
					path.lineTo(stroke.points[i].x, stroke.points[i].y);
				}
			}
			return { path, color: stroke.color, width: stroke.width };
		});
	}, [strokes]);

	const currentPath = useMemo(() => {
		if (currentPoints.length === 0) return null;
		const path = Skia.Path.Make();
		path.moveTo(currentPoints[0].x, currentPoints[0].y);
		for (let i = 1; i < currentPoints.length; i++) {
			path.lineTo(currentPoints[i].x, currentPoints[i].y);
		}
		return path;
	}, [currentPoints]);

	const handleUndo = () => {
		setStrokes((prev) => prev.slice(0, -1));
	};

	const handleClear = () => {
		setStrokes([]);
		setCurrentPoints([]);
	};

	const handleSubmit = () => {
		onSubmit({ strokes });
	};

	return (
		<View className="flex-1 w-full bg-white rounded-xl overflow-hidden shadow-sm">
			{/* Canvas Area */}
			<View
				className="flex-1 bg-gray-50"
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
			>
				<Canvas style={{ flex: 1 }}>
					{paths.map((p, i) => (
						<Path
							key={i}
							path={p.path}
							color={p.color}
							style="stroke"
							strokeWidth={p.width}
							strokeJoin="round"
							strokeCap="round"
						/>
					))}
					{currentPath && (
						<Path
							path={currentPath}
							color={selectedColor}
							style="stroke"
							strokeWidth={strokeWidth}
							strokeJoin="round"
							strokeCap="round"
						/>
					)}
				</Canvas>
			</View>

			{/* Controls */}
			<View className="p-4 bg-white border-t border-gray-100 gap-4">
				{/* Color Palette */}
				<View className="flex-row justify-center gap-3 flex-wrap">
					{colors.map((c) => (
						<Pressable
							key={c}
							onPress={() => setSelectedColor(c)}
							className={`w-10 h-10 rounded-full border-2 ${
								selectedColor === c
									? "border-gray-900 scale-110"
									: "border-transparent"
							}`}
							style={{ backgroundColor: c }}
						/>
					))}
				</View>

				{/* Actions */}
				<View className="flex-row justify-between items-center pt-2">
					<View className="flex-row gap-2">
						<Pressable
							onPress={handleUndo}
							disabled={strokes.length === 0}
							className={`p-3 rounded-lg bg-gray-100 ${
								strokes.length === 0 ? "opacity-50" : "active:bg-gray-200"
							}`}
						>
							<Ionicons name="arrow-undo" size={24} color="#374151" />
						</Pressable>
						<Pressable
							onPress={handleClear}
							disabled={strokes.length === 0}
							className={`p-3 rounded-lg bg-gray-100 ${
								strokes.length === 0 ? "opacity-50" : "active:bg-gray-200"
							}`}
						>
							<Ionicons name="trash-outline" size={24} color="#ef4444" />
						</Pressable>
					</View>

					<Pressable
						onPress={handleSubmit}
						className="bg-black px-8 py-3 rounded-full active:bg-gray-800"
					>
						<Text className="text-white font-bold text-lg">Submit</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}
