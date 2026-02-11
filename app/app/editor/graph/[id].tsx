import type {
	GraphDomainAdapter,
	NodeCatalogEntry,
} from "@slopcade/shared/graph-adapters";
import { createEmptyDocument } from "@slopcade/shared/graph-core";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { GraphEditor } from "@/components/editor/graph";

const mockAdapter: GraphDomainAdapter = {
	id: "mock-adapter",
	name: "Mock Adapter",
	toGeneric: (domainGraph: any) => createEmptyDocument("mock"),
	fromGeneric: (graph) => graph,
	validateDomain: () => ({ valid: true, errors: [] }),
	getNodeCatalog: (): NodeCatalogEntry[] => [
		{
			type: "start",
			label: "Start",
			category: "Logic",
			defaultPorts: [{ id: "out", direction: "output", dataType: "signal" }],
			description: "Entry point",
		},
		{
			type: "process",
			label: "Process",
			category: "Logic",
			defaultPorts: [
				{ id: "in", direction: "input", dataType: "signal" },
				{ id: "out", direction: "output", dataType: "signal" },
			],
			description: "Process data",
		},
		{
			type: "end",
			label: "End",
			category: "Logic",
			defaultPorts: [{ id: "in", direction: "input", dataType: "signal" }],
			description: "Exit point",
		},
	],
	getInspectorConfig: (nodeType) => {
		switch (nodeType) {
			case "process":
				return {
					nodeType: "process",
					sections: [
						{
							label: "Settings",
							fields: [
								{
									key: "name",
									label: "Name",
									type: "string",
								},
								{
									key: "delay",
									label: "Delay (ms)",
									type: "number",
								},
							],
						},
					],
				};
			default:
				return null;
		}
	},
};

export default function GraphEditorRoute() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const documentId = id || "default";

	const initialDocument = useMemo(
		() => createEmptyDocument(documentId),
		[documentId],
	);

	return (
		<View className="flex-1">
			<GraphEditor
				adapter={mockAdapter}
				initialDocument={initialDocument}
				documentId={documentId}
			/>
		</View>
	);
}
