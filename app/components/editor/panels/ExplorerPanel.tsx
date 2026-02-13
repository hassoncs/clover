import { FileTree } from "@slopcade/ui";
import { useState } from "react";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useTheme } from "@/lib/theme";
import { useEditorFileTree } from "../useEditorFileTree";
import { useSharedWorkspaceFiles } from "../useWorkspaceFiles";

const isWeb = Platform.OS === "web";

export function ExplorerPanel() {
	const { editorColors: c } = useTheme();
	const workspaceFiles = useSharedWorkspaceFiles();
	const {
		treeState,
		treeData,
		roots,
		isLoading,
		onSelectFile,
		onRenameFile,
		onMoveFile,
	} = useEditorFileTree(workspaceFiles);
	const [isExpanded, setIsExpanded] = useState(true);

	const activeFile = workspaceFiles.activeFile;
	const selectedIds = activeFile ? [activeFile] : [];

	const [searchQuery, setSearchQuery] = useState("");

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }]}
			accessibilityLabel="File Explorer"
			testID="editor-explorer-panel"
		>
			{!isWeb && (
				<View style={[styles.header, { borderBottomColor: c.border }]}>
					<Pressable
						onPress={() => setIsExpanded(!isExpanded)}
						style={styles.headerButton}
						accessibilityRole="button"
						accessibilityLabel={
							isExpanded ? "Collapse Explorer" : "Expand Explorer"
						}
					>
						<Text style={[styles.title, { color: c.text }]}>EXPLORER</Text>
						<Text style={{ color: c.textSecondary, fontSize: 14 }}>
							{isExpanded ? "▾" : "▸"}
						</Text>
					</Pressable>
				</View>
			)}

			{isExpanded && (
				<>
					<TextInput
						style={[
							styles.searchInput,
							{
								backgroundColor: c.inputBg,
								color: c.inputText,
								borderColor: c.inputBorder,
								borderWidth: 1,
							},
						]}
						placeholder="Search files..."
						placeholderTextColor={c.inputPlaceholder}
						value={searchQuery}
						onChangeText={setSearchQuery}
						accessibilityLabel="Search files"
					/>

					<View style={styles.content}>
						{isLoading ? (
							<ActivityIndicator color={c.accent} />
						) : (
							<FileTree
								data={treeData}
								roots={roots}
								onSelectFile={onSelectFile}
								onRenameFile={onRenameFile}
								onMoveFile={onMoveFile}
								{...treeState}
								selectedIds={selectedIds}
								searchQuery={searchQuery}
							/>
						)}
					</View>
				</>
			)}
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
	},
	headerButton: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	title: {
		fontSize: 14,
		fontWeight: "600",
		marginRight: 8,
	},
	searchInput: {
		margin: 8,
		padding: 8,
		borderRadius: 6,
		fontSize: 13,
	},
	content: {
		flex: 1,
	},
});
