import { StyleSheet, View, type ViewStyle } from "react-native";
import { DebugPanel } from "./DebugPanel";
import { ExplorerPanel } from "./ExplorerPanel";
import { HierarchyPanel } from "./HierarchyPanel";
import { PropertiesPanel } from "./PropertiesPanel";

interface SidebarProps {
	style?: ViewStyle;
}

export function Sidebar({ style }: SidebarProps) {
	return (
		<View style={[styles.container, style]}>
			<View style={styles.panelExplorer}>
				<ExplorerPanel />
			</View>
			<View style={styles.divider} />
			<View style={styles.panelHierarchy}>
				<HierarchyPanel />
			</View>
			<View style={styles.divider} />
			<View style={styles.panelProperties}>
				<PropertiesPanel />
			</View>
			<View style={styles.divider} />
			<View style={styles.panelDebug}>
				<DebugPanel />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1F2937",
	},
	panelExplorer: {
		flex: 3,
	},
	panelHierarchy: {
		flex: 2,
	},
	panelProperties: {
		flex: 2,
	},
	panelDebug: {
		flex: 1,
	},
	divider: {
		height: 4,
		backgroundColor: "#374151",
	},
});
