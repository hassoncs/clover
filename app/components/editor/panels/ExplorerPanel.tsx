import { FileTree } from "@slopcade/ui";
import { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useEditorFileTree } from "../useEditorFileTree";
import { useSharedWorkspaceFiles } from "../useWorkspaceFiles";

export function ExplorerPanel() {
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
		<View style={styles.container}>
			<View style={styles.header}>
				<Pressable
					onPress={() => setIsExpanded(!isExpanded)}
					style={styles.headerButton}
					accessibilityRole="button"
					accessibilityLabel={
						isExpanded ? "Collapse Explorer" : "Expand Explorer"
					}
				>
					<Text style={styles.title}>EXPLORER</Text>
					<Text style={styles.chevron}>{isExpanded ? "▾" : "▸"}</Text>
				</Pressable>
			</View>

			{isExpanded && (
				<>
					<TextInput
						style={styles.searchInput}
						placeholder="Search files..."
						placeholderTextColor="#6B7280"
						value={searchQuery}
						onChangeText={setSearchQuery}
						accessibilityLabel="Search files"
					/>

					<View style={styles.content}>
						{isLoading ? (
							<ActivityIndicator color="#6366F1" />
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
		backgroundColor: "#1F2937",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#374151",
	},
	headerButton: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	title: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600",
		marginRight: 8,
	},
	chevron: {
		color: "#9CA3AF",
		fontSize: 14,
	},
	searchInput: {
		margin: 12,
		padding: 8,
		backgroundColor: "#374151",
		borderRadius: 6,
		color: "#FFFFFF",
		fontSize: 14,
	},
	content: {
		flex: 1,
	},
});
