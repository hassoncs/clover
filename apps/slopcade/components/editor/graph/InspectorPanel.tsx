import type {
	GraphDomainAdapter,
	InspectorFieldConfig,
} from "@slopcade/shared/graph-adapters";
import type { GraphNode } from "@slopcade/shared/graph-core";
import { memo, useCallback } from "react";
import { Switch, Text, TextInput, View } from "react-native";

interface InspectorPanelProps {
	adapter: GraphDomainAdapter;
	selectedNode: GraphNode | null;
	onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
}

const InspectorField = memo(
	({
		config,
		value,
		onChange,
	}: {
		config: InspectorFieldConfig;
		value: unknown;
		onChange: (value: unknown) => void;
	}) => {
		switch (config.type) {
			case "string":
				return (
					<View className="mb-4">
						<Text className="mb-1 font-medium text-gray-700 text-sm">
							{config.label}
						</Text>
						<TextInput
							className="rounded-md border border-gray-300 px-3 py-2 text-sm"
							value={String(value || "")}
							onChangeText={onChange}
						/>
					</View>
				);
			case "number":
				return (
					<View className="mb-4">
						<Text className="mb-1 font-medium text-gray-700 text-sm">
							{config.label}
						</Text>
						<TextInput
							className="rounded-md border border-gray-300 px-3 py-2 text-sm"
							value={String(value || 0)}
							onChangeText={(text) => onChange(Number(text))}
							keyboardType="numeric"
						/>
					</View>
				);
			case "boolean":
				return (
					<View className="mb-4 flex-row items-center justify-between">
						<Text className="font-medium text-gray-700 text-sm">
							{config.label}
						</Text>
						<Switch value={Boolean(value)} onValueChange={onChange} />
					</View>
				);
			default:
				return null;
		}
	},
);

InspectorField.displayName = "InspectorField";

export const InspectorPanel = memo(
	({ adapter, selectedNode, onUpdateNode }: InspectorPanelProps) => {
		const handleUpdate = useCallback(
			(key: string, value: unknown) => {
				if (selectedNode) {
					onUpdateNode(selectedNode.id, { [key]: value });
				}
			},
			[selectedNode, onUpdateNode],
		);

		if (!selectedNode) {
			return (
				<View className="h-full w-64 border-l border-gray-200 bg-white p-4">
					<Text className="text-gray-500 text-sm">No node selected</Text>
				</View>
			);
		}

		const config = adapter.getInspectorConfig(selectedNode.type);

		if (!config) {
			return (
				<View className="h-full w-64 border-l border-gray-200 bg-white p-4">
					<Text className="font-bold text-lg">{selectedNode.label}</Text>
					<Text className="mt-2 text-gray-500 text-sm">
						No configuration available
					</Text>
				</View>
			);
		}

		return (
			<View className="h-full w-64 border-l border-gray-200 bg-white">
				<View className="border-b border-gray-200 p-4">
					<Text className="font-bold text-lg">{selectedNode.label}</Text>
					<Text className="text-gray-500 text-xs">{selectedNode.type}</Text>
				</View>
				<View className="p-4">
					{config.sections.map((section) => (
						<View key={section.label} className="mb-6">
							<Text className="mb-3 font-semibold text-gray-900 text-xs uppercase tracking-wider">
								{section.label}
							</Text>
							{section.fields.map((field) => (
								<InspectorField
									key={field.key}
									config={field}
									value={selectedNode.data[field.key]}
									onChange={(val) => handleUpdate(field.key, val)}
								/>
							))}
						</View>
					))}
				</View>
			</View>
		);
	},
);

InspectorPanel.displayName = "InspectorPanel";
