import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { useEditor } from "./EditorProvider";
import { FileTabBar } from "./FileTabBar";
import { FileViewer } from "./FileViewer";
import { PreviewControls } from "./PreviewControls";
import { PreviewGate } from "./PreviewGate";
import { StageContainer } from "./StageContainer";
import { useSharedWorkspaceFiles } from "./useWorkspaceFiles";

function shaderIdFromFilename(filename: string): string {
	return filename.replace(/\.gdshader$/, "");
}

type ActiveView = { type: "file"; filename: string } | { type: "preview" };

interface StageAreaProps {
	onToggleExplorer?: () => void;
	isExplorerOpen?: boolean;
}

export function StageArea({
	onToggleExplorer,
	isExplorerOpen = false,
}: StageAreaProps) {
	const { gameId, hotSwapShader, readiness } = useEditor();
	const {
		openTabs,
		activeFile,
		activeFileContent,
		isLoadingContent,
		setActiveFile,
		closeTab,
		saveFile,
		isSaving,
	} = useSharedWorkspaceFiles();

	const handleSave = useCallback(
		(content: string) => {
			if (gameId && activeFile) {
				saveFile(activeFile, content);
				readiness.triggerCompile();

				if (activeFile.endsWith(".gdshader")) {
					hotSwapShader(shaderIdFromFilename(activeFile), content);
				}
			}
		},
		[gameId, activeFile, saveFile, hotSwapShader, readiness],
	);

	const [activeView, setActiveView] = useState<ActiveView>({
		type: "file",
		filename: "document.md",
	});

	useEffect(() => {
		if (activeFile) {
			setActiveView({ type: "file", filename: activeFile });
		}
	}, [activeFile]);

	const handleSelectTab = useCallback(
		(filename: string) => {
			setActiveFile(filename);
			setActiveView({ type: "file", filename });
		},
		[setActiveFile],
	);

	const handleCloseTab = useCallback(
		(filename: string) => {
			closeTab(filename);
		},
		[closeTab],
	);

	const handlePreviewTabPress = useCallback(() => {
		setActiveView({ type: "preview" });
	}, []);

	const handleToggleSidebar = useCallback(() => {
		onToggleExplorer?.();
	}, [onToggleExplorer]);

	const fileTabs = openTabs.map((filename) => ({
		filename,
		isActive: activeView.type === "file" && activeView.filename === filename,
	}));

	return (
		<View style={styles.container} testID="stage-area">
			<View style={styles.tabRow}>
				<FileTabBar
					tabs={fileTabs}
					onSelectTab={handleSelectTab}
					onCloseTab={handleCloseTab}
					onToggleSidebar={handleToggleSidebar}
					isSidebarOpen={isExplorerOpen}
				/>
				<TouchableOpacity
					testID="preview-tab"
					style={[
						styles.previewTab,
						activeView.type === "preview" && styles.activeTab,
						readiness.errors.length > 0 && styles.errorTab,
					]}
					onPress={handlePreviewTabPress}
					accessibilityRole="tab"
					accessibilityLabel="Preview"
					accessibilityState={{ selected: activeView.type === "preview" }}
				>
					<Text
						style={[
							styles.tabText,
							activeView.type === "preview" && styles.activeTabText,
							readiness.errors.length > 0 && styles.errorTabText,
						]}
					>
						▶ Preview{" "}
						{readiness.errors.length > 0 && `(${readiness.errors.length})`}
					</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.content} testID="stage-content">
				<View
					style={[
						styles.stageWrapper,
						{ display: activeView.type === "preview" ? "flex" : "none" },
					]}
				>
					{activeView.type === "preview" && <PreviewControls />}
					<PreviewGate>
						<StageContainer />
					</PreviewGate>
				</View>

				{activeView.type === "file" && (
					<FileViewer
						filename={activeFile}
						content={activeFileContent}
						isLoading={isLoadingContent}
						onSave={handleSave}
						isSaving={isSaving}
					/>
				)}

				<DiagnosticsPanel />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#111827",
	},
	tabRow: {
		flexDirection: "row",
		height: 32,
		backgroundColor: "#111827",
		borderBottomWidth: 1,
		borderBottomColor: "#1F2937",
	},
	activeTab: {
		borderBottomColor: "#6366F1",
	},
	previewTab: {
		paddingHorizontal: 16,
		justifyContent: "center",
		height: 32,
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
		borderLeftWidth: 1,
		borderLeftColor: "#1F2937",
	},
	tabText: {
		fontSize: 13,
		color: "#9CA3AF",
		fontWeight: "500",
	},
	activeTabText: {
		color: "#FFFFFF",
	},
	errorTab: {
		borderBottomColor: "#EF4444",
	},
	errorTabText: {
		color: "#EF4444",
	},
	content: {
		flex: 1,
		backgroundColor: "#1F2937",
	},
	stageWrapper: {
		flex: 1,
	},
});
