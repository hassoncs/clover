import { Tabs, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AppFrameHeader } from "@/components/navigation/AppFrameHeader";
import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";
import { SidebarPlaceholder } from "@/components/navigation/SidebarPlaceholder";
import { useAuth } from "@/hooks/useAuth";
import { activeBrand, brandCssClass } from "@/lib/brand";
import { trpc } from "@/lib/trpc/client";

const TAB_HEADER_CONFIG: Record<
	string,
	{
		title?: string;
		showHeader: boolean;
		leftIcons: ("menu" | "search" | "swap-vertical-outline")[];
		rightIcons: ("notifications-outline" | "person-add-outline")[];
	}
> = {
	feed: {
		showHeader: false,
		leftIcons: [],
		rightIcons: [],
	},
	browse: {
		title: activeBrand.displayName,
		showHeader: true,
		leftIcons: ["menu", "search"],
		rightIcons: ["notifications-outline", "person-add-outline"],
	},
	profile: {
		showHeader: false,
		leftIcons: [],
		rightIcons: [],
	},
};

export default function TabLayout() {
	const router = useRouter();
	const { isAuthenticated } = useAuth();
	const [sidebarVisible, setSidebarVisible] = useState(false);
	const [isCreating, setIsCreating] = useState(false);

	const openSidebar = useCallback(() => {
		setSidebarVisible(true);
	}, []);

	const closeSidebar = useCallback(() => {
		setSidebarVisible(false);
	}, []);

	const goToCreateGame = useCallback(async () => {
		if (!isAuthenticated) {
			router.push("/(tabs)/profile");
			return;
		}
		if (isCreating) return;
		setIsCreating(true);
		try {
			const game = await trpc.games.create.mutate({
				title: "New Game",
				definition: JSON.stringify({
					metadata: { title: "New Game", description: "Work in progress" },
					world: {
						gravity: { x: 0, y: 9.8 },
						bounds: { width: 20, height: 12 },
						pixelsPerMeter: 50,
					},
					entities: {},
					templates: {},
					scenes: { main: { entities: [] } },
					globalVariables: {},
					rules: [],
				}),
				isPublic: false,
			});
			router.push(`/editor/${game.id}`);
		} catch (error) {
			console.error("Failed to create game:", error);
		} finally {
			setIsCreating(false);
		}
	}, [router, isAuthenticated, isCreating]);

	const goToDiscover = useCallback(() => {
		router.push("/discover");
	}, [router]);

	const goToImageSearch = useCallback(() => {
		router.push("/(dev)/image-search");
	}, [router]);

	const goToNotifications = useCallback(() => {
		router.push("/notifications");
	}, [router]);

	return (
		<View
			style={{ flex: 1 }}
			className={`bg-theme-background ${brandCssClass}`}
		>
			<Tabs
				tabBar={(props) => (
					<FloatingTabBar
						{...props}
						onPrimaryPress={
							activeBrand.features.gameEditor ? goToCreateGame : undefined
						}
						isAuthenticated={isAuthenticated}
						isCreating={isCreating}
					/>
				)}
				screenOptions={({ route }) => ({
					headerShown: TAB_HEADER_CONFIG[route.name]?.showHeader ?? true,
					header: () => {
						const config =
							TAB_HEADER_CONFIG[route.name] ?? TAB_HEADER_CONFIG.browse;
						return (
							<AppFrameHeader
								title={config.title}
								leftActions={config.leftIcons.map((icon) => ({
									icon,
									onPress:
										icon === "menu"
											? openSidebar
											: icon === "search"
												? goToImageSearch
												: () => {},
								}))}
								rightActions={config.rightIcons.map((icon) => ({
									icon,
									onPress:
										icon === "notifications-outline"
											? goToNotifications
											: icon === "person-add-outline"
												? goToDiscover
												: () => {},
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
				<Tabs.Screen
					name="feed"
					options={{
						title: "Feed",
						href: activeBrand.features.socialFeed ? undefined : null,
					}}
				/>
				<Tabs.Screen name="browse" options={{ title: "Browse" }} />
				<Tabs.Screen name="chat" options={{ title: "Chat", href: null }} />
				<Tabs.Screen name="maker" options={{ title: "Maker", href: null }} />
				<Tabs.Screen name="profile" options={{ title: "Profile" }} />
			</Tabs>

			<SidebarPlaceholder visible={sidebarVisible} onClose={closeSidebar} />
		</View>
	);
}
