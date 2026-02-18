import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/lib/theme";
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
	contextId?: string;
}

export function StageArea({
	onToggleExplorer,
	isExplorerOpen = false,
	contextId: propContextId,
}: StageAreaProps) {
	const { editorColors: c } = useTheme();
	const {
		gameId,
		hotSwapShader,
		readiness,
		previewContexts,
		activeContextId,
		setActiveContext,
	} = useEditor();

	// If contextId is provided via props (split view), use it.
	// Otherwise use the globally active context (mobile/tabs).
	const effectiveContextId = propContextId || activeContextId;
	const showContextTabs = !propContextId && previewContexts.length > 1;

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
		<View
			style={[styles.container, { backgroundColor: c.bg }]}
			testID="stage-area"
			accessibilityLabel="Stage"
		>
			<View
				style={[
					styles.tabRow,
					{ backgroundColor: c.bg, borderBottomColor: c.border },
				]}
			>
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
						{ borderLeftColor: c.border },
						activeView.type === "preview" && {
							borderBottomColor: c.accent,
						},
						readiness.errors.length > 0 && { borderBottomColor: c.error },
					]}
					onPress={handlePreviewTabPress}
					accessibilityRole="tab"
					accessibilityLabel="Preview"
					accessibilityState={{ selected: activeView.type === "preview" }}
				>
					<Text
						style={[
							styles.tabText,
							{ color: c.tabText },
							activeView.type === "preview" && { color: c.tabActiveText },
							readiness.errors.length > 0 && { color: c.error },
						]}
					>
						▶ Preview{" "}
						{readiness.errors.length > 0 && `(${readiness.errors.length})`}
					</Text>
				</TouchableOpacity>
			</View>

			<View
				style={[styles.content, { backgroundColor: c.surface }]}
				testID="stage-content"
			>
				<View
					style={[
						styles.stageWrapper,
						{ display: activeView.type === "preview" ? "flex" : "none" },
					]}
				>
					{activeView.type === "preview" && showContextTabs && (
						<View style={[styles.contextTabs, { borderBottomColor: c.border }]}>
							{previewContexts.map((ctx) => (
								<TouchableOpacity
									key={ctx.id}
									style={[
										styles.contextTab,
										activeContextId === ctx.id && {
											borderBottomColor: c.accent,
										},
									]}
									onPress={() => setActiveContext(ctx.id)}
								>
									<Text
										style={[
											styles.tabText,
											{ color: c.tabText },
											activeContextId === ctx.id && {
												color: c.tabActiveText,
											},
										]}
									>
										{ctx.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}
					{activeView.type === "preview" && <PreviewControls />}
					<PreviewGate>
						<StageContainer contextId={effectiveContextId} />
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
	},
	tabRow: {
		flexDirection: "row",
		height: 32,
		borderBottomWidth: 1,
	},
	previewTab: {
		paddingHorizontal: 16,
		justifyContent: "center",
		height: 32,
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
		borderLeftWidth: 1,
	},
	tabText: {
		fontSize: 13,
		fontWeight: "500",
	},
	content: {
		flex: 1,
	},
	stageWrapper: {
		flex: 1,
	},
	contextTabs: {
		flexDirection: "row",
		height: 32,
		borderBottomWidth: 1,
	},
	contextTab: {
		paddingHorizontal: 16,
		justifyContent: "center",
		height: 32,
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
	},
});
