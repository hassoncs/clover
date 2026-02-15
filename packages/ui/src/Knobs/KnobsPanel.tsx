import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
	type GameVariable,
	getLabel,
	inferKnob,
	isVariableWithTuning,
	type KnobConfig,
	type VariableWithTuning,
} from "@slopcade/shared";
import clsx from "clsx";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { CATEGORY_ORDER, KnobCategoryGroup } from "./KnobCategoryGroup";
import { KnobControl } from "./KnobControl";

export interface KnobsPanelProps {
	variables: Record<string, GameVariable>;
	currentValues: Record<string, unknown>;
	onVariableChange: (key: string, value: unknown) => void;
}

export interface KnobsPanelHandle {
	open: () => void;
	close: () => void;
}

export const KnobsPanel = forwardRef<KnobsPanelHandle, KnobsPanelProps>(
	function KnobsPanel({ variables, currentValues, onVariableChange }, ref) {
		const sheetRef = useRef<BottomSheet>(null);
		const snapPoints = useMemo(() => ["40%", "85%"], []);

		useImperativeHandle(ref, () => ({
			open: () => {
				sheetRef.current?.snapToIndex(0);
			},
			close: () => {
				sheetRef.current?.close();
			},
		}));

		const groupedVariables = useMemo(() => {
			const groups: Record<
				string,
				Array<{ key: string; config: KnobConfig; variable: VariableWithTuning }>
			> = {};

			Object.entries(variables).forEach(([key, variable]) => {
				if (!isVariableWithTuning(variable)) return;

				const config = variable.knob || inferKnob(variable);
				if (!config) return;

				const category = variable.category || "other";
				if (!groups[category]) {
					groups[category] = [];
				}

				groups[category].push({ key, config, variable });
			});

			return groups;
		}, [variables]);

		return (
			<BottomSheet
				ref={sheetRef}
				index={-1}
				snapPoints={snapPoints}
				enablePanDownToClose
				backgroundStyle={{
					backgroundColor: "#111827",
					borderTopLeftRadius: 20,
					borderTopRightRadius: 20,
				}}
				handleIndicatorStyle={{ backgroundColor: "#6B7280", width: 40 }}
			>
				<View className="items-center py-3 border-b border-gray-800">
					<Text className="text-white text-base font-bold">🎛️ Knobs</Text>
				</View>

				<BottomSheetScrollView className="flex-1 bg-gray-900">
					<View className="p-4 pb-20">
						{CATEGORY_ORDER.map((category) => {
							const items = groupedVariables[category];
							if (!items || items.length === 0) return null;

							return (
								<KnobCategoryGroup
									key={category}
									category={category}
									itemCount={items.length}
								>
									{items.map(({ key, config, variable }) => (
										<KnobControl
											key={key}
											config={config}
											value={currentValues[key]}
											onChange={(v) => onVariableChange(key, v)}
											label={getLabel(key, variable)}
											description={variable.description}
										/>
									))}
								</KnobCategoryGroup>
							);
						})}
					</View>
				</BottomSheetScrollView>
			</BottomSheet>
		);
	},
);

export interface KnobsFloatingButtonProps {
	onPress: () => void;
}

export function KnobsFloatingButton({ onPress }: KnobsFloatingButtonProps) {
	const scale = useSharedValue(1);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const handlePressIn = () => {
		scale.value = withSpring(0.9);
	};

	const handlePressOut = () => {
		scale.value = withSpring(1);
	};

	return (
		<Animated.View
			style={[animatedStyle]}
			className="absolute bottom-6 right-6 z-50"
		>
			<Pressable
				onPress={onPress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				className={clsx(
					"w-14 h-14 rounded-full bg-purple-600 items-center justify-center shadow-lg shadow-black/50",
					"active:bg-purple-700",
				)}
			>
				<Text className="text-2xl">🎛️</Text>
			</Pressable>
		</Animated.View>
	);
}
