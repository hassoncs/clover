import type {
	GraphDomainAdapter,
	NodeCatalogEntry,
} from "@slopcade/shared/graph-adapters";
import { createEmptyDocument } from "@slopcade/shared/graph-core";
import { useLocalSearchParams } from "expo-router";
import { Suspense, useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import React from "react";

const GraphEditor = React.lazy(() =>
	import("@/components/editor/graph").then((m) => ({
		default: m.GraphEditor,
	})),
);

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
			<Suspense
				fallback={
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator size="large" color="#6366F1" />
					</View>
				}
			>
				<GraphEditor
					adapter={mockAdapter}
					initialDocument={initialDocument}
					documentId={documentId}
				/>
			</Suspense>
		</View>
	);
}
