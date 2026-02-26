import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTheme } from "@/lib/theme";
import { useEditor } from "../EditorProvider";
import { useSharedWorkspaceFiles } from "../useWorkspaceFiles";
import { DesignCanvasRenderer } from "./DesignCanvasRenderer";

export function DesignCanvasPanel() {
	const { editorColors: c } = useTheme();
	const { width, height } = useWindowDimensions();
	const {
		selectedDesignFrameId,
		selectedDesignElementId,
		selectDesignFrame,
		selectDesignElement,
	} = useEditor();
	const { designDocument, isLoadingDesign } = useSharedWorkspaceFiles();

	// Default camera for now (T7 will add real camera controls)
	const camera = { translateX: 0, translateY: 0, scale: 1 };

	const handleElementTap = (frameId: string, elementId: string | null) => {
		if (elementId) {
			selectDesignElement(elementId, frameId);
		} else if (frameId) {
			selectDesignFrame(frameId);
		} else {
			selectDesignFrame(null);
		}
	};

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }]}
			accessibilityLabel="Design Canvas Panel"
			testID="editor-design-canvas-panel"
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>DESIGN CANVAS</Text>
			</View>

			<View style={styles.content}>
				{isLoadingDesign ? (
					<Text style={[styles.message, { color: c.textSecondary }]}>
						Loading design...
					</Text>
				) : designDocument ? (
					<DesignCanvasRenderer
						document={designDocument}
						camera={camera}
						selectedFrameId={selectedDesignFrameId}
						selectedElementId={selectedDesignElementId}
						onElementTap={handleElementTap}
						width={width}
						height={height - 48} // Subtract header height
					/>
				) : (
					<Text style={[styles.message, { color: c.textSecondary }]}>
						No design document found.
					</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 12,
		borderBottomWidth: 1,
		height: 48,
	},
	title: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	content: {
		flex: 1,
		padding: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	spinner: {
		marginBottom: 16,
	},
	message: {
		fontSize: 14,
		fontWeight: "500",
		textAlign: "center",
	},
});
