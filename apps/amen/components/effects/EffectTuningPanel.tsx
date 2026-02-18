import type {
	EffectGraphSpec,
	EffectNode,
	EffectParamSchema,
	ParamValue,
} from "@slopcade/shared/effects";
import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { EffectParamControl } from "./EffectParamControl";

interface EffectTuningPanelProps {
	spec: EffectGraphSpec;
	onParamChange: (nodeId: string, key: string, value: ParamValue) => void;
}

interface NodeParamsProps {
	node: EffectNode;
	onParamChange: (nodeId: string, key: string, value: ParamValue) => void;
}

function NodeParams({ node, onParamChange }: NodeParamsProps) {
	const { id, type, params, paramsSchema } = node;

	const groupedParams = useMemo(() => {
		const groups: Record<string, EffectParamSchema[]> = {};

		paramsSchema?.forEach((schema) => {
			const category = schema.ui?.category || "General";
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(schema);
		});

		const sortedGroups: Record<string, EffectParamSchema[]> = {};
		if (groups["General"]) {
			sortedGroups["General"] = groups["General"];
			delete groups["General"];
		}
		Object.assign(sortedGroups, groups);

		return sortedGroups;
	}, [paramsSchema]);

	if (!paramsSchema || paramsSchema.length === 0) return null;

	return (
		<View className="mb-6 border-b border-gray-800 pb-4">
			<View className="flex-row items-center justify-between mb-2">
				<Text className="text-purple-400 font-bold text-lg">{type}</Text>
				<Text className="text-gray-600 text-xs font-mono">{id}</Text>
			</View>

			{Object.entries(groupedParams).map(([category, schemas]) => (
				<View key={category} className="mb-2">
					{category !== "General" && (
						<Text className="text-gray-500 font-semibold mb-3 uppercase text-xs tracking-wider mt-2">
							{category}
						</Text>
					)}

					{schemas.map((schema) => (
						<EffectParamControl
							key={schema.key}
							schema={schema}
							value={params[schema.key] ?? schema.defaultValue}
							onChange={(newValue) => onParamChange(id, schema.key, newValue)}
						/>
					))}
				</View>
			))}
		</View>
	);
}

export function EffectTuningPanel({
	spec,
	onParamChange,
}: EffectTuningPanelProps) {
	const nodesWithParams = useMemo(() => {
		return spec.nodes.filter(
			(node) => node.paramsSchema && node.paramsSchema.length > 0,
		);
	}, [spec.nodes]);

	if (nodesWithParams.length === 0) {
		return (
			<View className="p-4 items-center justify-center flex-1">
				<Text className="text-gray-500 text-center">
					No tunable parameters found in this effect graph.
				</Text>
			</View>
		);
	}

	return (
		<ScrollView className="flex-1 bg-gray-900 p-4">
			{nodesWithParams.map((node) => (
				<NodeParams key={node.id} node={node} onParamChange={onParamChange} />
			))}
			<View className="h-20" />
		</ScrollView>
	);
}
