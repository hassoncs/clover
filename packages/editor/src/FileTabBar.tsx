import { Ionicons } from "@expo/vector-icons";
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useTheme } from "@slopcade/theme";

interface FileTab {
	filename: string;
	isActive: boolean;
}

interface FileTabBarProps {
	tabs: FileTab[];
	onSelectTab: (filename: string) => void;
	onCloseTab: (filename: string) => void;
	onToggleSidebar: () => void;
	isSidebarOpen: boolean;
}

export function FileTabBar({
	tabs,
	onSelectTab,
	onCloseTab,
	onToggleSidebar,
	isSidebarOpen,
}: FileTabBarProps) {
	const { editorColors: c } = useTheme();

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: c.bg, borderBottomColor: c.border },
			]}
			accessibilityRole="tablist"
		>
			<TouchableOpacity
				style={[
					styles.sidebarToggle,
					{ borderRightColor: c.border },
					isSidebarOpen && { backgroundColor: c.surfaceHover },
				]}
				onPress={onToggleSidebar}
				accessibilityRole="button"
				accessibilityLabel="Toggle sidebar"
			>
				<Ionicons name="folder-outline" size={14} color={c.textSecondary} />
			</TouchableOpacity>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.tabsContainer}
				contentContainerStyle={styles.tabsContent}
			>
				{tabs.map((tab) => (
					<TouchableOpacity
						key={tab.filename}
						style={[
							styles.tab,
							{ borderRightColor: c.border },
							tab.isActive && {
								backgroundColor: c.tabActiveBg,
								borderBottomWidth: 2,
								borderBottomColor: c.accent,
							},
						]}
						onPress={() => onSelectTab(tab.filename)}
						accessibilityRole="tab"
						accessibilityLabel={tab.filename}
						accessibilityState={{ selected: tab.isActive }}
					>
						<Text
							style={[
								styles.tabText,
								{ color: c.tabText },
								tab.isActive && { color: c.tabActiveText },
							]}
						>
							{tab.filename}
						</Text>
						<TouchableOpacity
							style={styles.closeButton}
							onPress={(e) => {
								e.stopPropagation();
								onCloseTab(tab.filename);
							}}
							accessibilityRole="button"
							accessibilityLabel={`Close ${tab.filename}`}
						>
							<Ionicons name="close" size={12} color={c.textMuted} />
						</TouchableOpacity>
					</TouchableOpacity>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		height: 32,
		borderBottomWidth: 1,
	},
	sidebarToggle: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
		borderRightWidth: 1,
	},
	tabsContainer: {
		flex: 1,
	},
	tabsContent: {
		flexDirection: "row",
	},
	tab: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		height: 32,
		borderRightWidth: 1,
		minWidth: 100,
		maxWidth: 200,
	},
	tabText: {
		fontSize: 12,
		marginRight: 8,
		flex: 1,
	},
	closeButton: {
		width: 16,
		height: 16,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 2,
	},
});
