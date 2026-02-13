import { View, type ViewStyle } from "react-native";
import { DebugPanel } from "../panels/DebugPanel";
import { ExplorerPanel } from "../panels/ExplorerPanel";
import { HierarchyPanel } from "../panels/HierarchyPanel";
import { PropertiesPanel } from "../panels/PropertiesPanel";

interface SidebarProps {
	style?: ViewStyle;
}

export function Sidebar({ style }: SidebarProps) {
	return (
		<View style={style} className="flex-1 bg-secondary-800">
			<View className="flex-3">
				<ExplorerPanel />
			</View>
			<View className="h-1 bg-secondary-700" />
			<View className="flex-2">
				<HierarchyPanel />
			</View>
			<View className="h-1 bg-secondary-700" />
			<View className="flex-2">
				<PropertiesPanel />
			</View>
			<View className="h-1 bg-secondary-700" />
			<View className="flex-1">
				<DebugPanel />
			</View>
		</View>
	);
}
