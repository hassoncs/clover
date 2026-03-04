import React from "react";
import { StyleSheet, View } from "react-native";
import { ComponentsPanel } from "./components/ComponentsPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { LayersPanel } from "./layers/LayersPanel";
import { VariablesPanel } from "./variables/VariablesPanel";
import {
	PenCanvasPanel as CanvasImpl,
	type PenCanvasPanelProps,
} from "./PenCanvasPanelImpl";
import { PenRuntimeProvider, usePenRuntime } from "./PenRuntimeContext";
import { ToolbarShell } from "./toolbar/ToolbarShell";

export default function PenCanvasPanelInner(props: PenCanvasPanelProps) {
	return (
		<PenRuntimeProvider
			document={props.document}
			onChange={props.onChange}
		>
			<PenCanvasPanelInnerContent {...props} />
		</PenRuntimeProvider>
	);
}

function PenCanvasPanelInnerContent(props: PenCanvasPanelProps) {
	const { activeRightPanel } = usePenRuntime();
	return (
		<View style={styles.container}>
			<LayersPanel />
			<View style={styles.canvasArea}>
				<ToolbarShell />
				<CanvasImpl {...props} />
			</View>
			{activeRightPanel === "variables" && <VariablesPanel />}
			{activeRightPanel === "components" && <ComponentsPanel />}
			{activeRightPanel === "inspector" && <InspectorPanel />}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
	},
	canvasArea: {
		flex: 1,
		position: "relative",
	},
});
