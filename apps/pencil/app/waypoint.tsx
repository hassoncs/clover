import {
	PenCanvasPanel,
	PenRuntimeProvider,
	usePenRuntime,
} from "@slopcade/design-canvas";
import {
	PenToolFacade,
	type SceneGraph,
	sceneGraphToPenDocument,
} from "@slopcade/design-canvas/pen/runtime";
import { useMemo, useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadPenFile } from "../lib/file-io";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const WAYPOINT_PEN = require("../assets/waypoint.json");

function loadWaypointGraph(): SceneGraph {
	try {
		return loadPenFile(JSON.stringify(WAYPOINT_PEN));
	} catch (error) {
		console.error("Failed to load waypoint.json", error);
		return loadPenFile(JSON.stringify({ version: 1, children: [] }));
	}
}

function PenCanvasPanelConnector() {
	const { graph, revision } = usePenRuntime();
	const document = useMemo(
		() => sceneGraphToPenDocument(graph),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[graph, revision],
	);

	return <PenCanvasPanel document={document} />;
}

export default function WaypointScreen() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);
	if (!mounted) return null;
	return <WaypointScreenInner />;
}

function WaypointScreenInner() {
	const graph = useMemo(loadWaypointGraph, []);
	const facade = useMemo(() => new PenToolFacade(graph), [graph]);

	return (
		<SafeAreaView style={styles.root} edges={["top", "bottom"]}>
			<View style={styles.container}>
				<View style={styles.badge}>
					<Text style={styles.badgeText}>
						waypoint.json • 31 screens • 58 vars
					</Text>
				</View>
				<PenRuntimeProvider graph={graph} facade={facade}>
					<PenCanvasPanelConnector />
				</PenRuntimeProvider>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#050310",
	},
	container: {
		flex: 1,
	},
	badge: {
		position: "absolute",
		top: 8,
		left: 8,
		zIndex: 100,
		backgroundColor: "rgba(129, 140, 248, 0.15)",
		borderWidth: 1,
		borderColor: "#818cf8",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
	},
	badgeText: {
		color: "#818cf8",
		fontSize: 11,
		fontWeight: "600",
	},
});
