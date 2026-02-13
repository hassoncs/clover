import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface Tab {
	id: string;
	title: string;
}

interface PanelTabBarProps {
	tabs: Tab[];
	activeTab: string;
	onTabPress: (id: string) => void;
}

export function PanelTabBar({ tabs, activeTab, onTabPress }: PanelTabBarProps) {
	return (
		<View style={styles.container}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{tabs.map((tab) => {
					const isActive = tab.id === activeTab;
					return (
						<Pressable
							key={tab.id}
							style={[styles.tab, isActive && styles.activeTab]}
							onPress={() => onTabPress(tab.id)}
							accessibilityRole="tab"
							accessibilityLabel={tab.title}
							accessibilityState={{ selected: isActive }}
						>
							<Text style={[styles.tabText, isActive && styles.activeTabText]}>
								{tab.title}
							</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: "#1F2937",
		borderBottomWidth: 1,
		borderBottomColor: "#374151",
	},
	scrollContent: {
		flexDirection: "row",
		paddingHorizontal: 4,
	},
	tab: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
	},
	activeTab: {
		borderBottomColor: "#6366F1",
		backgroundColor: "#374151",
	},
	tabText: {
		fontSize: 13,
		fontWeight: "500",
		color: "#9CA3AF",
	},
	activeTabText: {
		color: "#FFFFFF",
	},
});
