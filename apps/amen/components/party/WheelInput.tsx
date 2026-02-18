import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
	Easing,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";

interface WheelSlice {
	id: string;
	label: string;
	color: string;
}

interface WheelInputProps {
	slices: WheelSlice[];
	seed?: number;
	onSpinComplete: (result: { sliceId: string; sliceIndex: number }) => void;
	disabled?: boolean;
	autoSpin?: boolean;
}

const WHEEL_SIZE = 300;
const RADIUS = WHEEL_SIZE / 2;
const CENTER = WHEEL_SIZE / 2;

export function WheelInput({
	slices,
	seed,
	onSpinComplete,
	disabled,
	autoSpin,
}: WheelInputProps) {
	const [spinning, setSpinning] = useState(false);
	const [completed, setCompleted] = useState(false);
	const rotation = useSharedValue(0);

	const sliceAngle = 360 / slices.length;

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ rotate: `${rotation.value}deg` }],
		};
	});

	const handleSpinEnd = (winningIndex: number) => {
		setSpinning(false);
		setCompleted(true);
		onSpinComplete({
			sliceId: slices[winningIndex].id,
			sliceIndex: winningIndex,
		});
	};

	const spin = () => {
		if (spinning || disabled || completed) return;

		setSpinning(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		const currentSeed = seed !== undefined ? seed : Math.random() * 10000;

		const randomValue = Math.abs(Math.sin(currentSeed) * 10000) % 1;
		const winningIndex = Math.floor(randomValue * slices.length);

		const sliceCenter = (winningIndex + 0.5) * sliceAngle;
		let targetRotation = 270 - sliceCenter;

		const currentRotationMod = rotation.value % 360;

		while (targetRotation <= currentRotationMod) {
			targetRotation += 360;
		}

		const extraSpins = 5 * 360;
		const finalRotation =
			rotation.value + (targetRotation - currentRotationMod) + extraSpins;

		rotation.value = withTiming(
			finalRotation,
			{
				duration: 4000,
				easing: Easing.out(Easing.cubic),
			},
			(finished) => {
				if (finished) {
					runOnJS(handleSpinEnd)(winningIndex);
				}
			},
		);
	};

	useEffect(() => {
		if (autoSpin && !completed && !spinning) {
			spin();
		}
	}, [autoSpin]);

	const createSlicePath = (index: number, total: number) => {
		const startAngle = (index * 360) / total;
		const endAngle = ((index + 1) * 360) / total;

		const startRad = (startAngle * Math.PI) / 180;
		const endRad = (endAngle * Math.PI) / 180;

		const x1 = CENTER + RADIUS * Math.cos(startRad);
		const y1 = CENTER + RADIUS * Math.sin(startRad);
		const x2 = CENTER + RADIUS * Math.cos(endRad);
		const y2 = CENTER + RADIUS * Math.sin(endRad);

		const largeArcFlag = sliceAngle > 180 ? 1 : 0;

		return `M${CENTER},${CENTER} L${x1},${y1} A${RADIUS},${RADIUS} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
	};

	return (
		<View className="items-center justify-center gap-8">
			<View className="relative items-center justify-center">
				<View className="absolute -top-6 z-10 shadow-sm">
					<View className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-slate-800" />
				</View>

				<Animated.View
					style={[{ width: WHEEL_SIZE, height: WHEEL_SIZE }, animatedStyle]}
				>
					<Svg
						width={WHEEL_SIZE}
						height={WHEEL_SIZE}
						viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
					>
						<G>
							{slices.map((slice, index) => {
								const path = createSlicePath(index, slices.length);
								const angle = (index + 0.5) * sliceAngle;
								const textRad = (angle * Math.PI) / 180;
								const textX = CENTER + RADIUS * 0.75 * Math.cos(textRad);
								const textY = CENTER + RADIUS * 0.75 * Math.sin(textRad);

								return (
									<G key={slice.id}>
										<Path
											d={path}
											fill={slice.color}
											stroke="white"
											strokeWidth="2"
										/>
										<SvgText
											x={textX}
											y={textY}
											fill="white"
											fontSize="16"
											fontWeight="bold"
											textAnchor="middle"
											alignmentBaseline="middle"
											transform={`rotate(${angle + 90}, ${textX}, ${textY})`}
										>
											{slice.label}
										</SvgText>
									</G>
								);
							})}
						</G>
					</Svg>
				</Animated.View>

				<View className="absolute w-12 h-12 bg-white rounded-full shadow-md border-4 border-gray-200 z-20" />
			</View>

			{!autoSpin && !completed && (
				<Pressable
					onPress={spin}
					disabled={disabled || spinning}
					className={`px-10 py-4 rounded-full shadow-lg active:scale-95 transition-transform ${
						disabled || spinning ? "bg-gray-400 opacity-50" : "bg-blue-600"
					}`}
				>
					<Text className="text-white font-bold text-xl tracking-wider">
						{spinning ? "SPINNING..." : "SPIN!"}
					</Text>
				</Pressable>
			)}

			{completed && (
				<View className="px-6 py-3 bg-green-100 rounded-xl border border-green-200">
					<Text className="text-green-800 font-bold text-lg">
						Result Locked!
					</Text>
				</View>
			)}
		</View>
	);
}
