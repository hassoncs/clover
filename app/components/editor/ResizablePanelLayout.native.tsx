import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
	Panel,
	PanelGroup,
	PanelResizeHandle,
} from "react-native-resizable-panels";
import { InspectOverlay } from "./inspector/InspectOverlay";
import { PanelTabBar } from "./PanelTabBar";
import { getPanelById, PANEL_REGISTRY } from "./panels/registry";
import { StageArea } from "./StageArea";

export function ResizablePanelLayout() {
	const [activeRightPanel, setActiveRightPanel] = useState("explorer");

	const tabs = useMemo(
		() =>
			PANEL_REGISTRY.filter((p) => p.id !== "diagnostics").map((p) => ({
				id: p.id,
				title: p.title,
			})),
		[],
	);

	const ActivePanel = getPanelById(activeRightPanel)?.component;

	return (
		<View style={styles.container}>
			<PanelGroup direction="horizontal" style={styles.panelGroup}>
				<Panel defaultSize={65} minSize={40} style={styles.leftPanel}>
					<StageArea />
					<InspectOverlay />
				</Panel>

				<PanelResizeHandle style={styles.resizeHandle}>
					<View style={styles.grabber} />
				</PanelResizeHandle>

				<Panel
					defaultSize={35}
					minSize={20}
					maxSize={50}
					style={styles.rightPanel}
				>
					<PanelTabBar
						tabs={tabs}
						activeTab={activeRightPanel}
						onTabPress={setActiveRightPanel}
					/>
					<View style={styles.panelContent}>
						{ActivePanel ? <ActivePanel /> : null}
					</View>
				</Panel>
			</PanelGroup>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1F2937",
	},
	panelGroup: {
		flex: 1,
	},
	leftPanel: {
		flex: 1,
	},
	resizeHandle: {
		width: 6,
		backgroundColor: "#374151",
		justifyContent: "center",
		alignItems: "center",
	},
	grabber: {
		width: 2,
		height: 32,
		borderRadius: 1,
		backgroundColor: "#6B7280",
	},
	rightPanel: {
		flex: 1,
		backgroundColor: "#1F2937",
	},
	panelContent: {
		flex: 1,
	},
});
