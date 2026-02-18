import type { GraphDomainAdapter } from "@slopcade/shared/graph-adapters";
import type { GraphDocument } from "@slopcade/shared/graph-core";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { GraphCanvas } from "./GraphCanvas";
import { useGraphCommands } from "./hooks/useGraphCommands";
import { InspectorPanel } from "./InspectorPanel";
import { NodePalette } from "./NodePalette";

interface GraphEditorProps {
	adapter: GraphDomainAdapter;
	initialDocument?: GraphDocument;
	documentId: string;
}

export function GraphEditor({
	adapter,
	initialDocument,
	documentId,
}: GraphEditorProps) {
	const { state, execute, undo, redo, canUndo, canRedo } =
		useGraphCommands(documentId);
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

	const handleAddNode = useCallback(
		(type: string) => {
			const catalog = adapter.getNodeCatalog();
			const entry = catalog.find((e) => e.type === type);
			if (!entry) return;

			const newNode = {
				id: crypto.randomUUID(),
				type: entry.type,
				label: entry.label,
				position: { x: 100, y: 100 },
				ports: entry.defaultPorts.map((p) => ({ ...p })),
				data: {},
			};

			execute({
				type: "addNode",
				node: newNode,
			});
		},
		[adapter, execute],
	);

	const handleUpdateNode = useCallback(
		(nodeId: string, data: Record<string, unknown>) => {
			execute({
				type: "updateNodeData",
				nodeId,
				data,
			});
		},
		[execute],
	);

	const selectedNode = selectedNodeId
		? state.document.nodes[selectedNodeId]
		: null;

	return (
		<View className="flex-1 flex-row bg-gray-100">
			<NodePalette adapter={adapter} onAddNode={handleAddNode} />
			<View className="flex-1">
				<GraphCanvas document={state.document} onDocumentChange={() => {}} />
			</View>
			<InspectorPanel
				adapter={adapter}
				selectedNode={selectedNode || null}
				onUpdateNode={handleUpdateNode}
			/>
		</View>
	);
}
