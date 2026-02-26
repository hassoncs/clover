import { useCallback, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useDeviceType } from "./hooks/useDeviceType";
import { BottomSheetHost, type BottomSheetHostHandle } from "./BottomSheetHost";
import { DockviewLayout } from "./DockviewLayout";
import { InspectorProvider } from "./inspector/InspectorProvider";
import { ResizablePanelLayout } from "./ResizablePanelLayout";
import { StageArea } from "./StageArea";

export function ResponsiveEditorLayout() {
	const deviceType = useDeviceType();
	const isMobile = deviceType === "mobile";
	const sheetHostRef = useRef<BottomSheetHostHandle>(null);

	const handleToggleExplorer = useCallback(() => {
		sheetHostRef.current?.openTab("files");
	}, []);

	return (
		<InspectorProvider>
			<View style={styles.container}>
				{isMobile ? (
					<View style={styles.mobileLayout}>
						<StageArea
							onToggleExplorer={handleToggleExplorer}
							isExplorerOpen={false}
						/>
						<BottomSheetHost ref={sheetHostRef} />
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
