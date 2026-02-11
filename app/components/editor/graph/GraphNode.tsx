import type { GraphNode as GraphNodeType } from "@slopcade/shared/graph-core";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { memo } from "react";
import { Text, View } from "react-native";

export type GraphNodeData = GraphNodeType & {
	label?: string;
	[key: string]: unknown;
};
export type GraphNode = Node<GraphNodeData>;

export const GraphNodeComponent = memo(
	({ data, selected }: NodeProps<GraphNode>) => {
		const { label, type, ports } = data;

		return (
			<View
				className={`min-w-[150px] rounded-md border bg-white shadow-sm ${
					selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
				}`}
			>
				<View className="border-b border-gray-100 bg-gray-50 px-3 py-2">
					<Text className="font-medium text-gray-900 text-sm">
						{label || type}
					</Text>
					<Text className="text-gray-500 text-xs">{type}</Text>
				</View>

				<View className="p-2">
					<View className="mb-2">
						{ports
							.filter((p) => p.direction === "input")
							.map((port) => (
								<View
									key={port.id}
									className="relative flex-row items-center py-1"
								>
									<Handle
										type="target"
										position={Position.Left}
										id={port.id}
										className="!bg-gray-400 !w-3 !h-3 !-left-3.5"
									/>
									<Text className="ml-1 text-gray-700 text-xs">
										{port.label || port.id}
									</Text>
								</View>
							))}
					</View>

					<View>
						{ports
							.filter((p) => p.direction === "output")
							.map((port) => (
								<View
									key={port.id}
									className="relative flex-row items-center justify-end py-1"
								>
									<Text className="mr-1 text-gray-700 text-xs">
										{port.label || port.id}
									</Text>
									<Handle
										type="source"
										position={Position.Right}
										id={port.id}
										className="!bg-gray-400 !w-3 !h-3 !-right-3.5"
									/>
								</View>
							))}
					</View>
				</View>
			</View>
		);
	},
);

GraphNodeComponent.displayName = "GraphNode";
