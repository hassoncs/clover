import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { FileTree } from "./index";
import { type FileTreeData, pathsToTree } from "./types";

const meta: Meta<typeof FileTree> = {
	title: "UI/FileTree",
	component: FileTree,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<View
				style={{
					flex: 1,
					padding: 20,
					minHeight: 400,
					backgroundColor: "#f3f4f6",
				}}
			>
				<Story />
			</View>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

// --- Mock Data Generators ---

const DEFAULT_FILES = [
	"src/game.ts",
	"src/entities/player.ts",
	"src/entities/enemy.ts",
	"src/entities/bullet.ts",
	"src/behaviors/movement.ts",
	"src/behaviors/collision.ts",
	"src/utils/math.ts",
	"src/utils/physics.ts",
	"assets/sprites/player.png",
	"assets/sprites/enemy.png",
	"assets/sounds/jump.wav",
	"assets/sounds/hit.wav",
	"README.md",
	"game.json",
];

const generateFiles = (paths: string[]) => {
	return paths.map((p) => ({ filename: p, size: 1000 }));
};

const generateLargeProject = () => {
	const paths: string[] = [];
	for (let i = 0; i < 5; i++) {
		paths.push(`root_file_${i}.txt`);
		for (let j = 0; j < 5; j++) {
			for (let k = 0; k < 5; k++) {
				paths.push(`level${i}/sub${j}/deep${k}/file_${i}_${j}_${k}.ts`);
			}
		}
	}
	return generateFiles(paths);
};

const getRoots = (data: FileTreeData) => {
	return Object.values(data)
		.filter((node) => node.parentId === null)
		.map((node) => node.id)
		.sort((a, b) => {
			const nodeA = data[a];
			const nodeB = data[b];
			if (nodeA.type !== nodeB.type) {
				return nodeA.type === "folder" ? -1 : 1;
			}
			return nodeA.name.localeCompare(nodeB.name);
		});
};

// --- Wrapper Components ---

interface WrapperProps {
	files?: { filename: string; size: number }[];
	initialSearch?: string;
	style?: any;
}

const FileTreeWrapper = ({
	files = generateFiles(DEFAULT_FILES),
	initialSearch = "",
	style,
}: WrapperProps) => {
	const [expandedIds, setExpandedIds] = useState<string[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState(initialSearch);

	const { data, roots } = useMemo(() => {
		const treeData = pathsToTree(files);
		const treeRoots = getRoots(treeData);
		return { data: treeData, roots: treeRoots };
	}, [files]);

	return (
		<View style={[styles.wrapper, style]}>
			{/* Simple search input for testing interaction */}
			<View style={styles.simpleSearch}>
				<Text style={styles.label}>Search: </Text>
				<TextInput
					style={styles.simpleInput}
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Filter files..."
				/>
			</View>

			<View style={styles.treeContainer}>
				<FileTree
					data={data}
					roots={roots}
					onSelectFile={(id) => setSelectedIds([id])}
					selectedIds={selectedIds}
					expandedIds={expandedIds}
					onExpandedChange={setExpandedIds}
					searchQuery={searchQuery}
				/>
			</View>
		</View>
	);
};

const EditorSidebarWrapper = () => {
	const [expandedIds, setExpandedIds] = useState<string[]>([
		"src",
		"src/entities",
	]);
	const [selectedIds, setSelectedIds] = useState<string[]>(["src/game.ts"]);
	const [searchQuery, setSearchQuery] = useState("");
	const [explorerCollapsed, setExplorerCollapsed] = useState(false);

	const { data, roots } = useMemo(() => {
		const treeData = pathsToTree(generateFiles(DEFAULT_FILES));
		const treeRoots = getRoots(treeData);
		return { data: treeData, roots: treeRoots };
	}, []);

	return (
		<View style={styles.sidebarContainer}>
			{/* Search Header */}
			<View style={styles.sidebarHeader}>
				<TextInput
					style={styles.sidebarSearch}
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Search..."
					placeholderTextColor="#6B7280"
				/>
			</View>

			{/* Explorer Section */}
			<TouchableOpacity
				style={styles.sectionHeader}
				onPress={() => setExplorerCollapsed(!explorerCollapsed)}
				activeOpacity={0.8}
			>
				<Text style={styles.sectionIcon}>{explorerCollapsed ? "▸" : "▾"}</Text>
				<Text style={styles.sectionTitle}>EXPLORER</Text>
			</TouchableOpacity>

			{!explorerCollapsed && (
				<View style={styles.treeSection}>
					<FileTree
						data={data}
						roots={roots}
						onSelectFile={(id) => setSelectedIds([id])}
						selectedIds={selectedIds}
						expandedIds={expandedIds}
						onExpandedChange={setExpandedIds}
						searchQuery={searchQuery}
					/>
				</View>
			)}

			{/* Hierarchy Section Placeholder */}
			<TouchableOpacity style={styles.sectionHeader} activeOpacity={0.8}>
				<Text style={styles.sectionIcon}>▸</Text>
				<Text style={styles.sectionTitle}>HIERARCHY</Text>
			</TouchableOpacity>

			<View style={styles.placeholderContent}>
				<Text style={styles.placeholderText}>3 entities</Text>
			</View>
		</View>
	);
};

// --- Stories ---

export const Default: Story = {
	render: () => <FileTreeWrapper />,
};

export const EditorSidebar: Story = {
	render: () => <EditorSidebarWrapper />,
	decorators: [
		(Story) => (
			<View
				style={{
					flex: 1,
					backgroundColor: "#1e1e1e",
					padding: 20,
					alignItems: "flex-start",
				}}
			>
				<Story />
			</View>
		),
	],
};

export const LargeProject: Story = {
	render: () => (
		<FileTreeWrapper files={generateLargeProject()} style={{ height: 600 }} />
	),
};

export const Empty: Story = {
	render: () => <FileTreeWrapper files={[]} />,
};

export const SearchActive: Story = {
	render: () => <FileTreeWrapper initialSearch="ent" />,
};

// --- Styles ---

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: "#fff",
		borderRadius: 8,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#e5e7eb",
		maxWidth: 400,
	},
	simpleSearch: {
		flexDirection: "row",
		alignItems: "center",
		padding: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
		backgroundColor: "#f9fafb",
	},
	label: {
		fontSize: 14,
		color: "#374151",
	},
	simpleInput: {
		flex: 1,
		height: 32,
		borderWidth: 1,
		borderColor: "#d1d5db",
		borderRadius: 4,
		paddingHorizontal: 8,
		marginLeft: 8,
		fontSize: 14,
	},
	treeContainer: {
		flex: 1,
		minHeight: 300,
	},

	// Editor Sidebar Styles
	sidebarContainer: {
		width: 320,
		backgroundColor: "#111827",
		height: 600,
		borderRightWidth: 1,
		borderRightColor: "#374151",
	},
	sidebarHeader: {
		padding: 10,
	},
	sidebarSearch: {
		backgroundColor: "#1F2937",
		color: "#D1D5DB",
		borderRadius: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		fontSize: 13,
		borderWidth: 1,
		borderColor: "#374151",
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 4,
		paddingVertical: 4,
		backgroundColor: "#111827",
	},
	sectionIcon: {
		color: "#9CA3AF",
		fontSize: 12,
		width: 20,
		textAlign: "center",
	},
	sectionTitle: {
		color: "#E5E7EB",
		fontSize: 11,
		fontWeight: "bold",
		letterSpacing: 0.5,
	},
	treeSection: {
		flex: 1,
		minHeight: 200,
	},
	placeholderContent: {
		padding: 12,
	},
	placeholderText: {
		color: "#6B7280",
		fontSize: 13,
		fontStyle: "italic",
	},
	darkContainer: {
		backgroundColor: "#111827",
	},
	header: {
		padding: 8,
		backgroundColor: "#111827",
	},
	headerTitle: {
		color: "#E5E7EB",
		fontSize: 11,
		fontWeight: "bold",
	},
});
