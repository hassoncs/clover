import { Platform, StyleSheet, View } from "react-native";
import { useDeviceType } from "@/lib/hooks/useDeviceType";
import { BottomSheetHost } from "./BottomSheetHost";
import { DockviewLayout } from "./DockviewLayout";
import { InspectorProvider } from "./inspector/InspectorProvider";
import { ResizablePanelLayout } from "./ResizablePanelLayout";
import { StageArea } from "./StageArea";

export function ResponsiveEditorLayout() {
	const deviceType = useDeviceType();
	const isMobile = deviceType === "mobile";

	return (
		<InspectorProvider>
			<View style={styles.container}>
				{isMobile ? (
					<View style={styles.mobileLayout}>
						<StageArea />
						<BottomSheetHost />
					</View>
				) : Platform.OS === "web" ? (
					<DockviewLayout />
				) : (
					<ResizablePanelLayout />
				)}
			</View>
		</InspectorProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	mobileLayout: {
		flex: 1,
	},
});
