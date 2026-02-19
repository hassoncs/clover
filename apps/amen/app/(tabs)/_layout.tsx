import { Tabs, useRouter } from "expo-router";
import { View } from "react-native";
import { AppFrameHeader } from "@/components/navigation/AppFrameHeader";
import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";

const TAB_HEADER_CONFIG: Record<
	string,
	{
		title?: string;
		showHeader: boolean;
		rightIcons: ("notifications-outline" | "person-add-outline")[];
	}
> = {
	browse: {
		title: "Amen",
		showHeader: true,
		rightIcons: [],
	},
	profile: {
		showHeader: false,
		rightIcons: [],
	},
};

export default function TabLayout() {
	const router = useRouter();

	return (
		<View style={{ flex: 1 }} className="bg-theme-background">
			<Tabs
				tabBar={(props) => <FloatingTabBar {...props} />}
				screenOptions={({ route }) => ({
					headerShown: TAB_HEADER_CONFIG[route.name]?.showHeader ?? true,
					header: () => {
						const config =
							TAB_HEADER_CONFIG[route.name] ?? TAB_HEADER_CONFIG.browse;
						return (
							<AppFrameHeader
								title={config.title}
								rightActions={config.rightIcons.map((icon) => ({
									icon,
									onPress: () => {},
								}))}
							/>
						);
					},
					sceneStyle: {
						backgroundColor: "transparent",
					},
					tabBarShowLabel: false,
				})}
			>
				<Tabs.Screen name="browse" options={{ title: "Browse" }} />
				<Tabs.Screen name="chat" options={{ title: "Chat", href: null }} />
				<Tabs.Screen name="profile" options={{ title: "Profile" }} />
			</Tabs>
		</View>
	);
}
