import { microsToSparks } from "@slopcade/shared";
import { tokens } from "@slopcade/theme";
import { ActivityIndicator, Text, View } from "react-native";
import { trpcReact } from "@/lib/trpc/react";

interface CostPreviewProps {
	gameId: string;
	regenerateAll?: boolean;
	specificPrefabs?: string[];
}

export function CostPreview({
	gameId,
	regenerateAll,
	specificPrefabs,
}: CostPreviewProps) {
	const { data, isLoading, error } = trpcReact.economy.estimateCost.useQuery({
		gameId,
		regenerateAll,
		specificPrefabs,
	});

	if (isLoading) {
		return (
			<View className="bg-theme-surface-elevated p-6 rounded-lg items-center justify-center">
				<ActivityIndicator size="small" color="#A89B7D" />
				<Text className="text-theme-text-secondary mt-2 text-sm">
					Estimating cost...
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View className="bg-theme-error/10 p-4 rounded-lg border border-theme-error/20">
				<Text className="text-theme-error text-center">
					Failed to load cost estimate
				</Text>
			</View>
		);
	}

	if (!data) return null;

	return (
		<View className="bg-theme-surface-elevated p-4 rounded-lg shadow-sm">
			<Text className="text-lg font-bold mb-3 text-theme-text">
				Cost: {data.totalSparks} ⚡
			</Text>

			<View className="mb-3">
				{data.breakdown.map((item) => (
					<View
						key={item.description}
						className="flex-row justify-between mb-1"
					>
						<Text className="text-theme-text-secondary text-sm flex-1">
							{item.description} {item.count > 1 && `(x${item.count})`}
						</Text>
						<Text
							className={`text-sm font-medium ${item.totalMicros < 0 ? "text-theme-success" : "text-theme-text"}`}
						>
							{item.totalMicros < 0 ? "-" : ""}
							{microsToSparks(Math.abs(item.totalMicros))} ⚡
						</Text>
					</View>
				))}
			</View>

			<View className="h-[1px] bg-theme-border my-2" />

			<View className="flex-row justify-between items-center">
				<Text className="text-theme-text font-medium">Your Balance:</Text>
				<Text
					className={`font-bold ${data.canAfford ? "text-theme-success" : "text-theme-error"}`}
				>
					{data.currentBalanceSparks} ⚡
				</Text>
			</View>

			{!data.canAfford && (
				<View className="mt-3 bg-theme-error/10 p-2 rounded border border-theme-error/20">
					<Text className="text-theme-error text-center text-sm font-medium">
						Need {data.shortfallSparks} more Sparks
					</Text>
				</View>
			)}
		</View>
	);
}
