import type { GraphDocument } from "@slopcade/shared/graph-core";
import {
	addEdge,
	Background,
	type Connection,
	Controls,
	type EdgeChange,
	type NodeChange,
	type OnConnect,
	type OnEdgesChange,
	type OnNodesChange,
	type OnSelectionChangeParams,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";

import { View } from "react-native";
import { type GraphEdge, GraphEdgeComponent } from "./GraphEdge";
import { type GraphNode, GraphNodeComponent } from "./GraphNode";

interface GraphCanvasProps {
	document: GraphDocument;
	onDocumentChange: (doc: GraphDocument) => void;
	onSelectionChange?: (nodeId: string | null) => void;
	readOnly?: boolean;
}

const nodeTypes = {
	custom: GraphNodeComponent,
};

const edgeTypes = {
	custom: GraphEdgeComponent,
};

export function GraphCanvas({
	document,
	onDocumentChange,
	onSelectionChange,
	readOnly = false,
}: GraphCanvasProps) {
	const initialNodes = useMemo(
		() =>
			Object.values(document.nodes).map((node) => ({
				id: node.id,
				type: "custom",
				position: node.position,
				data: { ...node, label: node.label },
			})),
		[document.nodes],
	);

	const initialEdges = useMemo(
		() =>
			Object.values(document.edges).map((edge) => ({
				id: edge.id,
				source: edge.from.nodeId,
				sourceHandle: edge.from.portId,
				target: edge.to.nodeId,
				targetHandle: edge.to.portId,
				type: "custom",
				data: {
					onDelete: () => {},
				},
			})),
		[document.edges],
	);

	const [nodes, setNodes, onNodesChange] =
		useNodesState<GraphNode>(initialNodes);
	const [edges, setEdges, onEdgesChange] =
		useEdgesState<GraphEdge>(initialEdges);

	useEffect(() => {
		setNodes(
			Object.values(document.nodes).map((node) => ({
				id: node.id,
				type: "custom",
				position: node.position,
				data: { ...node, label: node.label },
			})),
		);
		setEdges(
			Object.values(document.edges).map((edge) => ({
				id: edge.id,
				source: edge.from.nodeId,
				sourceHandle: edge.from.portId,
				target: edge.to.nodeId,
				targetHandle: edge.to.portId,
				type: "custom",
				data: {
					onDelete: () => {},
				},
			})),
		);
	}, [document, setNodes, setEdges]);

	const handleNodesChange: OnNodesChange<GraphNode> = useCallback(
		(changes: NodeChange<GraphNode>[]) => {
			onNodesChange(changes);
		},
		[onNodesChange],
	);

	const handleEdgesChange: OnEdgesChange<GraphEdge> = useCallback(
		(changes: EdgeChange<GraphEdge>[]) => {
			onEdgesChange(changes);
		},
		[onEdgesChange],
	);

	const onConnect: OnConnect = useCallback(
		(params: Connection) => {
			setEdges((eds) => addEdge(params, eds));
		},
		[setEdges],
	);

	const handleSelectionChange = useCallback(
		({ nodes }: OnSelectionChangeParams) => {
			if (nodes.length === 1) {
				onSelectionChange?.(nodes[0].id);
			} else {
				onSelectionChange?.(null);
			}
		},
		[onSelectionChange],
	);

	return (
		<View className="flex-1 bg-gray-50">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={handleNodesChange}
				onEdgesChange={handleEdgesChange}
				onConnect={onConnect}
				onSelectionChange={handleSelectionChange}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				fitView
				attributionPosition="bottom-right"
				nodesDraggable={!readOnly}
				nodesConnectable={!readOnly}
				elementsSelectable={!readOnly}
			>
				<Background />
				<Controls />
			</ReactFlow>
		</View>
	);
}
