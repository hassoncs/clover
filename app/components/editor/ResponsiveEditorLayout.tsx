import { StyleSheet, View } from "react-native";
import { useShouldShowSidebar } from "@/lib/hooks/useDeviceType";
import { BottomSheetHost } from "./BottomSheetHost";
import { ChatSidebar } from "./ChatSidebar";
import { InspectOverlay } from "./inspector/InspectOverlay";
import { InspectorProvider } from "./inspector/InspectorProvider";
import { StageArea } from "./StageArea";
import { Sidebar } from "./sidebar/Sidebar";

interface ResponsiveEditorLayoutProps {
	onLivePreviewChange?: (enabled: boolean) => void;
}

export function ResponsiveEditorLayout({
	onLivePreviewChange,
}: ResponsiveEditorLayoutProps) {
	const showSidebar = useShouldShowSidebar();

	return (
		<InspectorProvider>
			<View style={styles.container}>
				{showSidebar ? (
					<View style={styles.desktopLayout}>
						<Sidebar style={styles.sidebar} />
						<View style={styles.viewport}>
							<StageArea onLivePreviewChange={onLivePreviewChange} />
							<InspectOverlay />
						</View>
						<ChatSidebar style={styles.chatSidebar} />
					</View>
				) : (
					<View style={styles.mobileLayout}>
						<StageArea onLivePreviewChange={onLivePreviewChange} />
						<BottomSheetHost />
					</View>
				)}
			</View>
		</InspectorProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	desktopLayout: {
		flex: 1,
		flexDirection: "row",
	},
	mobileLayout: {
		flex: 1,
	},
	sidebar: {
		width: 320,
		borderRightWidth: 1,
		borderRightColor: "#374151",
	},
	viewport: {
		flex: 1,
	},
	chatSidebar: {
		width: 360,
		borderLeftWidth: 1,
		borderLeftColor: "#374151",
	},
});
