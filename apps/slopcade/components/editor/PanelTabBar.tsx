import { Pressable, ScrollView, Text, View } from "react-native";

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
		<View className="bg-secondary-800 border-b border-secondary-700">
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className="flex-row px-1"
			>
				{tabs.map((tab) => {
					const isActive = tab.id === activeTab;
					return (
						<Pressable
							key={tab.id}
							className={`px-3.5 py-2.5 border-b-2 ${isActive ? "border-theme-primary bg-secondary-700" : "border-transparent"}`}
							onPress={() => onTabPress(tab.id)}
							accessibilityRole="tab"
							accessibilityLabel={tab.title}
							accessibilityState={{ selected: isActive }}
						>
							<Text
								className={`text-sm font-medium ${isActive ? "text-white" : "text-secondary-400"}`}
							>
								{tab.title}
							</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}
