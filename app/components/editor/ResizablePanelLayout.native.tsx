import { Suspense, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { InspectOverlay } from "./inspector/InspectOverlay";
import { PanelTabBar } from "./PanelTabBar";
import { getPanelById, PANEL_REGISTRY } from "./panels/registry";
import { StageArea } from "./StageArea";

const PanelLoadingFallback = () => (
	<View style={styles.loadingFallback}>
		<ActivityIndicator size="large" color="#6366F1" />
	</View>
);

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
			<View style={styles.leftPanel}>
				<StageArea />
				<InspectOverlay />
			</View>

			<View style={styles.resizeHandle}>
				<View style={styles.grabber} />
			</View>

			<View style={styles.rightPanel}>
				<PanelTabBar
					tabs={tabs}
					activeTab={activeRightPanel}
					onTabPress={setActiveRightPanel}
				/>
				<View style={styles.panelContent}>
					{ActivePanel ? (
						<Suspense fallback={<PanelLoadingFallback />}>
							<ActivePanel />
						</Suspense>
					) : null}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		backgroundColor: "#1F2937",
	},
	leftPanel: {
		flex: 65,
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
		flex: 35,
		backgroundColor: "#1F2937",
	},
	panelContent: {
		flex: 1,
	},
	loadingFallback: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
