import { Tabs, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AppFrameHeader } from "@/components/navigation/AppFrameHeader";
import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";
import { SidebarPlaceholder } from "@/components/navigation/SidebarPlaceholder";
import { useAuth } from "@/hooks/useAuth";

const TAB_HEADER_CONFIG: Record<
  string,
  {
    title?: string;
    showHeader: boolean;
    leftIcons: ("menu" | "search" | "swap-vertical-outline")[];
    rightIcons: ("notifications-outline" | "person-add-outline")[];
  }
> = {
  browse: {
    title: "Slopcade",
    showHeader: true,
    leftIcons: ["menu", "search"],
    rightIcons: ["notifications-outline", "person-add-outline"],
  },
  // chat: {
  //   title: "Chat",
  //   showHeader: true,
  //   leftIcons: [],
  //   rightIcons: [],
  // },
  lab: {
    title: "Lab",
    showHeader: true,
    leftIcons: [],
    rightIcons: [],
  },
  maker: {
    showHeader: true,
    leftIcons: ["swap-vertical-outline"],
    rightIcons: ["person-add-outline"],
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

  const openSidebar = useCallback(() => {
    setSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarVisible(false);
  }, []);

  const goToCreateGame = useCallback(() => {
    router.push("/create-game");
  }, [router]);

  const goToDiscover = useCallback(() => {
    router.push("/discover");
  }, [router]);

  const goToImageSearch = useCallback(() => {
    router.push("/image-search");
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#050608" }}>
      <Tabs
        tabBar={(props) => (
          <FloatingTabBar
            {...props}
            onPrimaryPress={goToCreateGame}
            isAuthenticated={isAuthenticated}
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
                    icon === "person-add-outline" ? goToDiscover : () => {},
                }))}
              />
            );
          },
          sceneStyle: {
            backgroundColor: "#050608",
          },
          tabBarShowLabel: false,
        })}
      >
        <Tabs.Screen name="browse" options={{ title: "Browse" }} />
        <Tabs.Screen name="chat" options={{ title: "Chat", href: null }} />
        <Tabs.Screen name="lab" options={{ title: "Lab" }} />
        <Tabs.Screen
          name="maker"
          options={{ title: "Maker", href: isAuthenticated ? "/maker" : null }}
        />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>

      <SidebarPlaceholder visible={sidebarVisible} onClose={closeSidebar} />
    </View>
  );
}
