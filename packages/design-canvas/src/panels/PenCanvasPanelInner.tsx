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
import { PenRuntimeProvider } from "./PenRuntimeContext";
import { ToolbarShell } from "./toolbar/ToolbarShell";

export default function PenCanvasPanelInner(props: PenCanvasPanelProps) {
	return (
		<PenRuntimeProvider
			document={props.document}
			onChange={props.onChange}








		>
			<View style={styles.container}>
				<LayersPanel />
				<View style={styles.canvasArea}>
					<ToolbarShell />
					<CanvasImpl {...props} />
				</View>
				<VariablesPanel />
				<ComponentsPanel />
				<InspectorPanel />
			</View>
		</PenRuntimeProvider>
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
