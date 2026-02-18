import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface InvestmentInputProps {
	options: Array<{ id: string; label: string }>;
	totalBudget: number;
	onSubmit: (allocations: Record<string, number>) => void;
	timeLimit?: number;
	disabled?: boolean;
}

export function InvestmentInput({
	options,
	totalBudget,
	onSubmit,
	timeLimit,
	disabled,
}: InvestmentInputProps) {
	const [allocations, setAllocations] = useState<Record<string, number>>(
		Object.fromEntries(options.map((o) => [o.id, 0])),
	);
	const [submitted, setSubmitted] = useState(false);

	const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
	const remainingBudget = totalBudget - totalAllocated;

	// Auto-submit on time limit
	useEffect(() => {
		if (timeLimit && timeLimit > 0) {
			const timer = setTimeout(() => {
				if (!submitted) {
					handleSubmit();
				}
			}, timeLimit * 1000);
			return () => clearTimeout(timer);
		}
	}, [timeLimit, submitted, allocations]);

	const handleChange = (id: string, value: number) => {
		if (disabled || submitted) return;

		const newValue = Math.floor(value);
		const oldValue = allocations[id] || 0;
		const diff = newValue - oldValue;

		if (diff > remainingBudget) {
			return;
		}

		setAllocations((prev) => ({
			...prev,
			[id]: newValue,
		}));
	};

	const handleAllIn = (id: string) => {
		if (disabled || submitted) return;
		if (remainingBudget <= 0) return;

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setAllocations((prev) => ({
			...prev,
			[id]: (prev[id] || 0) + remainingBudget,
		}));
	};

	const handleSubmit = () => {
		if (submitted) return;
		setSubmitted(true);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		onSubmit(allocations);
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const isFullyAllocated = remainingBudget === 0;

	return (
		<View className="flex-1 w-full bg-gray-50">
			<View className="bg-white p-4 shadow-sm border-b border-gray-200 items-center z-10">
				<Text className="text-sm font-medium text-gray-500 uppercase tracking-wider">
					Remaining Budget
				</Text>
				<Text
					className={`text-4xl font-black ${
						remainingBudget === 0 ? "text-green-600" : "text-gray-900"
					}`}
				>
					{formatCurrency(remainingBudget)}
				</Text>
				<Text className="text-xs text-gray-400 mt-1">
					Total: {formatCurrency(totalBudget)}
				</Text>
			</View>

			<ScrollView
				className="flex-1 w-full"
				contentContainerStyle={{ padding: 16, gap: 24 }}
			>
				{options.map((option) => {
					const amount = allocations[option.id] || 0;
					const maxAllocatable = amount + remainingBudget;

					return (
						<View
							key={option.id}
							className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
						>
							<View className="flex-row justify-between items-center mb-4">
								<Text className="text-lg font-bold text-gray-800 flex-1 mr-2">
									{option.label}
								</Text>
								<Text className="text-xl font-bold text-blue-600">
									{formatCurrency(amount)}
								</Text>
							</View>

							<View className="flex-row items-center gap-4">
								<Slider
									style={{ flex: 1, height: 40 }}
									minimumValue={0}
									maximumValue={totalBudget}
									step={totalBudget > 1000 ? 100 : 1}
									value={amount}
									onValueChange={(val) => {
										const clamped = Math.min(val, maxAllocatable);
										handleChange(option.id, clamped);
									}}
									onSlidingComplete={() => {
										Haptics.selectionAsync();
									}}
									minimumTrackTintColor="#2563eb"
									maximumTrackTintColor="#e5e7eb"
									thumbTintColor="#2563eb"
									disabled={disabled || submitted}
								/>

								<Pressable
									onPress={() => handleAllIn(option.id)}
									disabled={disabled || submitted || remainingBudget <= 0}
									className={`px-3 py-2 rounded-lg border ${
										disabled || submitted || remainingBudget <= 0
											? "bg-gray-100 border-gray-200"
											: "bg-blue-50 border-blue-200 active:bg-blue-100"
									}`}
								>
									<Text
										className={`text-xs font-bold ${
											disabled || submitted || remainingBudget <= 0
												? "text-gray-400"
												: "text-blue-600"
										}`}
									>
										ALL IN
									</Text>
								</Pressable>
							</View>
						</View>
					);
				})}
			</ScrollView>

			<View className="p-4 pb-8 bg-white border-t border-gray-200">
				<Pressable
					onPress={handleSubmit}
					disabled={disabled || submitted || !isFullyAllocated}
					className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 shadow-sm ${
						submitted
							? "bg-green-500"
							: disabled || !isFullyAllocated
								? "bg-gray-200"
								: "bg-black active:bg-gray-800"
					}`}
				>
					<Text
						className={`text-lg font-bold ${
							submitted || (!disabled && isFullyAllocated)
								? "text-white"
								: "text-gray-400"
						}`}
					>
						{submitted
							? "Investments Locked"
							: isFullyAllocated
								? "Submit Investments"
								: "Allocate Remaining Budget"}
					</Text>
					{!submitted && isFullyAllocated && (
						<Ionicons name="arrow-forward" size={20} color="white" />
					)}
				</Pressable>
			</View>
		</View>
	);
}
