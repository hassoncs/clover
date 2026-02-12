import { Ionicons } from "@expo/vector-icons";
import {
	createTree,
	type ItemInstance,
	renamingFeature,
	searchFeature,
	selectionFeature,
	syncDataLoaderFeature,
	type TreeState,
} from "@headless-tree/core";
import { FlashList } from "@shopify/flash-list";
import { clsx } from "clsx";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	UIManager,
	View,
} from "react-native";
import Animated, {
	FadeInDown,
	FadeOutUp,
	LinearTransition,
} from "react-native-reanimated";
import { twMerge } from "tailwind-merge";
import type { FileTreeNode, FileTreeProps } from "./types";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

function cn(...inputs: (string | undefined | null | false)[]) {
	return twMerge(clsx(inputs));
}

const VIRTUAL_ROOT_ID = "__virtual_root__";
const FlashListAny = FlashList as any;

interface FileTreeItemProps {
	item: ItemInstance<FileTreeNode>;
	depth: number;
	expanded: boolean;
	selected: boolean;
	onPress: () => void;
	onLongPress: () => void;
	onRename: (newName: string) => void;
	isRenaming: boolean;
	searchMatch?: boolean;
}

const FileTreeItem = React.memo(
	({
		item,
		depth,
		expanded,
		selected,
		onPress,
		onLongPress,
		onRename,
		isRenaming,
		searchMatch,
	}: FileTreeItemProps) => {
		const [renameValue, setRenameValue] = useState(item.getItemData().name);
		const inputRef = useRef<TextInput>(null);

		useEffect(() => {
			if (isRenaming) {
				inputRef.current?.focus();
			}
		}, [isRenaming]);

		const handleSubmit = () => {
			onRename(renameValue);
		};

		const getIcon = () => {
			const data = item.getItemData();
			if (data.type === "folder") {
				return expanded ? "folder-open" : "folder";
			}
			const ext = data.name.split(".").pop()?.toLowerCase();
			switch (ext) {
				case "ts":
				case "tsx":
					return "logo-react";
				case "js":
				case "jsx":
					return "logo-javascript";
				case "json":
					return "code-slash";
				case "md":
					return "document-text";
				case "png":
				case "jpg":
				case "jpeg":
				case "gif":
					return "image";
				default:
					return "document";
			}
		};

		const data = item.getItemData();

		return (
			<Animated.View
				layout={LinearTransition}
				entering={FadeInDown}
				exiting={FadeOutUp}
				style={{ paddingLeft: Math.max(0, (depth - 1) * 20) }}
			>
				<TouchableOpacity
					onPress={onPress}
					onLongPress={onLongPress}
					style={[
						styles.itemContainer,
						selected && styles.itemSelected,
						searchMatch && styles.itemSearchMatch,
					]}
					activeOpacity={0.7}
				>
					<Ionicons
						name={getIcon() as any}
						size={20}
						color={
							selected
								? "#FFFFFF"
								: data.type === "folder"
									? "#6366F1"
									: "#9CA3AF"
						}
						style={styles.icon}
					/>

					{isRenaming ? (
						<TextInput
							ref={inputRef}
							style={styles.renameInput}
							value={renameValue}
							onChangeText={setRenameValue}
							onBlur={handleSubmit}
							onSubmitEditing={handleSubmit}
							returnKeyType="done"
							autoCorrect={false}
							autoCapitalize="none"
						/>
					) : (
						<Text
							style={[
								styles.itemText,
								selected && styles.itemTextSelected,
								data.type === "folder" && styles.folderText,
							]}
							numberOfLines={1}
						>
							{data.name}
						</Text>
					)}
				</TouchableOpacity>
			</Animated.View>
		);
	},
);

export const FileTreeNative = ({
	data,
	roots,
	onSelectFile,
	onRenameFile,
	selectedIds,
	expandedIds,
	onExpandedChange,
	searchQuery,
}: FileTreeProps) => {
	const [state, setState] = useState<Partial<TreeState<FileTreeNode>>>({});

	const tree = useMemo(() => {
		return createTree<FileTreeNode>({
			features: [
				syncDataLoaderFeature,
				selectionFeature,
				searchFeature,
				renamingFeature,
			],
			rootItemId: VIRTUAL_ROOT_ID,
			dataLoader: {
				getItem: (id) =>
					({ id, name: "", type: "file", parentId: null }) as any,
				getChildren: () => [],
			},
			getItemName: (item) => item.getItemData().name,
			isItemFolder: (item) => item.getItemData().type === "folder",
			setState: (updater) => {
				setState((prev) => {
					const next = typeof updater === "function" ? updater(prev) : updater;
					return { ...prev, ...next };
				});
			},
		});
	}, []);

	useEffect(() => {
		tree.setConfig({
			features: [
				syncDataLoaderFeature,
				selectionFeature,
				searchFeature,
				renamingFeature,
			],
			state,
			setState: (updater) => {
				setState((prev) => {
					const next = typeof updater === "function" ? updater(prev) : updater;
					return { ...prev, ...next };
				});
			},

			rootItemId: VIRTUAL_ROOT_ID,
			dataLoader: {
				getItem: (itemId) => {
					if (itemId === VIRTUAL_ROOT_ID) {
						return {
							id: VIRTUAL_ROOT_ID,
							name: "Root",
							type: "folder",
							children: roots,
							parentId: null,
						};
					}
					return data[itemId];
				},
				getChildren: (itemId) => {
					if (itemId === VIRTUAL_ROOT_ID) {
						return roots;
					}
					return data[itemId]?.children ?? [];
				},
			},
			getItemName: (item) => item.getItemData().name,
			isItemFolder: (item) => item.getItemData().type === "folder",

			onRename: (item, newName) => {
				onRenameFile?.(item.getId(), newName);
			},

			isSearchMatchingItem: (query, item) => {
				return item.getItemName().toLowerCase().includes(query.toLowerCase());
			},
		});
	}, [tree, data, roots, onRenameFile, state]);

	useEffect(() => {
		if (selectedIds) {
			setState((prev) => ({ ...prev, selectedItems: selectedIds }));
		}
	}, [selectedIds]);

	useEffect(() => {
		if (expandedIds) {
			setState((prev) => ({ ...prev, expandedItems: expandedIds }));
		}
	}, [expandedIds]);

	useEffect(() => {
		if (searchQuery !== undefined) {
			setState((prev) => ({ ...prev, search: searchQuery }));
		}
	}, [searchQuery]);

	useEffect(() => {
		if (onExpandedChange && state.expandedItems) {
			onExpandedChange(state.expandedItems);
		}
	}, [state.expandedItems, onExpandedChange]);

	useEffect(() => {
		if (onSelectFile && state.selectedItems && state.selectedItems.length > 0) {
			onSelectFile(state.selectedItems[0]);
		}
	}, [state.selectedItems, onSelectFile]);

	const visibleItems = useMemo(() => {
		void data;
		void roots;
		void state.expandedItems;
		void state.search;

		const items: { item: ItemInstance<FileTreeNode>; depth: number }[] = [];

		const traverse = (itemId: string, depth: number) => {
			if (itemId !== VIRTUAL_ROOT_ID) {
				const item = tree.getItemInstance(itemId);
				if (!item) return;
				items.push({ item, depth });

				if (!item.isExpanded()) return;
			}

			const item = tree.getItemInstance(itemId);
			if (item) {
				const children = item.getChildren();
				children.forEach((child) => {
					traverse(child.getId(), depth + 1);
				});
			}
		};

		traverse(VIRTUAL_ROOT_ID, 0);
		return items;
	}, [state.expandedItems, state.search, tree, roots, data]);

	const renderItem = useCallback(
		({
			item,
		}: {
			item: { item: ItemInstance<FileTreeNode>; depth: number };
		}) => {
			const treeItem = item.item;
			const data = treeItem.getItemData();

			return (
				<FileTreeItem
					item={treeItem}
					depth={item.depth}
					expanded={treeItem.isExpanded()}
					selected={treeItem.isSelected()}
					onPress={() => {
						if (treeItem.isFolder()) {
							if (treeItem.isExpanded()) {
								treeItem.collapse();
							} else {
								treeItem.expand();
							}
						} else {
							treeItem.select();
						}
					}}
					onLongPress={() => {
						if (treeItem.canRename()) {
							treeItem.startRenaming();
						}
					}}
					onRename={(newName) => {
						tree.completeRenaming();
					}}
					isRenaming={treeItem.isRenaming()}
					searchMatch={treeItem.isMatchingSearch()}
				/>
			);
		},
		[tree],
	);

	return (
		<View style={styles.container}>
			<FlashListAny
				data={visibleItems}
				renderItem={renderItem}
				estimatedItemSize={44}
				keyExtractor={(item: any) => item.item.getId()}
				extraData={state}
				keyboardShouldPersistTaps="always"
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#111827",
	},
	itemContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 12,
		minHeight: 44,
	},
	itemSelected: {
		backgroundColor: "#374151",
		borderLeftWidth: 2,
		borderLeftColor: "#6366F1",
		paddingLeft: 10,
	},
	itemSearchMatch: {
		backgroundColor: "rgba(99, 102, 241, 0.1)",
	},
	icon: {
		marginRight: 8,
	},
	itemText: {
		color: "#D1D5DB",
		fontSize: 14,
		flex: 1,
	},
	itemTextSelected: {
		color: "#FFFFFF",
		fontWeight: "500",
	},
	folderText: {
		fontWeight: "500",
		color: "#E5E7EB",
	},
	renameInput: {
		flex: 1,
		color: "#FFFFFF",
		backgroundColor: "#1F2937",
		paddingHorizontal: 4,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: "#6366F1",
	},
});
