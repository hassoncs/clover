import type { GraphDomainAdapter } from "@slopcade/shared/graph-adapters";
import { memo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface NodePaletteProps {
	adapter: GraphDomainAdapter;
	onAddNode: (type: string) => void;
}

export const NodePalette = memo(({ adapter, onAddNode }: NodePaletteProps) => {
	const catalog = adapter.getNodeCatalog();

	const categories = catalog.reduce(
		(acc, entry) => {
			if (!acc[entry.category]) {
				acc[entry.category] = [];
			}
			acc[entry.category].push(entry);
			return acc;
		},
		{} as Record<string, typeof catalog>,
	);

	return (
		<View className="h-full w-64 border-r border-gray-200 bg-white">
			<View className="border-b border-gray-200 p-4">
				<Text className="font-bold text-lg">Nodes</Text>
			</View>
			<ScrollView className="flex-1">
				{Object.entries(categories).map(([category, entries]) => (
					<View key={category} className="mb-4">
						<View className="bg-gray-50 px-4 py-2">
							<Text className="font-semibold text-gray-500 text-xs uppercase tracking-wider">
								{category}
							</Text>
						</View>
						<View className="p-2">
							{entries.map((entry) => (
								<TouchableOpacity
									key={entry.type}
									className="mb-2 rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:bg-gray-50"
									onPress={() => onAddNode(entry.type)}
								>
									<Text className="font-medium text-gray-900 text-sm">
										{entry.label}
									</Text>
									{entry.description && (
										<Text className="mt-1 text-gray-500 text-xs">
											{entry.description}
										</Text>
									)}
								</TouchableOpacity>
							))}
						</View>
					</View>
				))}
			</ScrollView>
		</View>
	);
});

NodePalette.displayName = "NodePalette";
