import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { useEditor } from "./EditorProvider";
import { FileViewer } from "./FileViewer";
import { PreviewControls } from "./PreviewControls";
import { PreviewGate } from "./PreviewGate";
import { StageContainer } from "./StageContainer";
import { useWorkspaceFiles } from "./useWorkspaceFiles";

function shaderIdFromFilename(filename: string): string {
	return filename.replace(/\.gdshader$/, "");
}

type ActiveView = { type: "file"; filename: string } | { type: "preview" };

interface StageAreaProps {
	onLivePreviewChange?: (enabled: boolean) => void;
}

export function StageArea({ onLivePreviewChange }: StageAreaProps) {
	const { gameId, hotSwapShader, readiness } = useEditor();
	const {
		openTabs,
		activeFile,
		activeFileContent,
		isLoadingContent,
		setActiveFile,
		saveFile,
		isSaving,
	} = useWorkspaceFiles(gameId);

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

	// Sync view when activeFile changes (e.g. from sidebar or initial load)
	useEffect(() => {
		if (activeFile) {
			setActiveView({ type: "file", filename: activeFile });
		}
	}, [activeFile]);

	const handleFileTabPress = (filename: string) => {
		setActiveFile(filename);
		setActiveView({ type: "file", filename });
	};

	const handlePreviewTabPress = () => {
		setActiveView({ type: "preview" });
	};

	return (
		<View style={styles.container} testID="stage-area">
			<View
				style={styles.tabBar}
				testID="stage-tab-bar"
				accessibilityRole="tablist"
			>
				<View style={styles.fileTabs}>
					{openTabs.map((filename) => (
						<TouchableOpacity
							key={filename}
							testID={`file-tab-${filename}`}
							style={[
								styles.tab,
								activeView.type === "file" &&
									activeView.filename === filename &&
									styles.activeTab,
							]}
							onPress={() => handleFileTabPress(filename)}
							accessibilityRole="tab"
							accessibilityLabel={filename}
							accessibilityState={{
								selected:
									activeView.type === "file" &&
									activeView.filename === filename,
							}}
						>
							<Text
								style={[
									styles.tabText,
									activeView.type === "file" &&
										activeView.filename === filename &&
										styles.activeTabText,
								]}
							>
								{filename}
							</Text>
						</TouchableOpacity>
					))}
				</View>

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
						<StageContainer onLivePreviewChange={onLivePreviewChange} />
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
		backgroundColor: "#111827", // bg-gray-900
	},
	tabBar: {
		flexDirection: "row",
		height: 36,
		backgroundColor: "#111827",
		borderBottomWidth: 1,
		borderBottomColor: "#1F2937", // border-gray-800
		alignItems: "flex-end",
	},
	fileTabs: {
		flex: 1,
		flexDirection: "row",
	},
	tab: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
	},
	activeTab: {
		borderBottomColor: "#6366F1", // indigo-500
	},
	previewTab: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
		borderLeftWidth: 1,
		borderLeftColor: "#1F2937",
	},
	tabText: {
		fontSize: 13,
		color: "#9CA3AF", // text-gray-400
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
		backgroundColor: "#1F2937", // bg-gray-800
	},
	stageWrapper: {
		flex: 1,
	},
});
