import { Tabs, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AppFrameHeader } from "@/components/navigation/AppFrameHeader";
import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";
import { SidebarPlaceholder } from "@/components/navigation/SidebarPlaceholder";

const TAB_TITLES: Record<string, string> = {
  browse: "Slopcade",
  lab: "Slopcade",
  maker: "Slopcade",
  themes: "Slopcade",
};

export default function TabLayout() {
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const openSidebar = useCallback(() => {
    setSidebarVisible(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarVisible(false);
  }, []);

  const goToMaker = useCallback(() => {
    router.push("/maker");
  }, [router]);

  const goToDiscover = useCallback(() => {
    router.push("/discover");
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#050608" }}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} onPrimaryPress={goToMaker} />}
        screenOptions={({ route }) => ({
          header: () => (
            <AppFrameHeader
              title={TAB_TITLES[route.name] ?? "Slopcade"}
              onMenuPress={openSidebar}
              onSearchPress={goToDiscover}
              onNotificationsPress={() => {}}
              onInvitePress={() => {}}
            />
          ),
          sceneStyle: {
            backgroundColor: "#050608",
          },
          tabBarShowLabel: false,
        })}
      >
        <Tabs.Screen name="browse" options={{ title: "Browse" }} />
        <Tabs.Screen name="lab" options={{ title: "Lab" }} />
        <Tabs.Screen name="maker" options={{ title: "Maker" }} />
        <Tabs.Screen name="themes" options={{ title: "Themes" }} />
      </Tabs>

      <SidebarPlaceholder visible={sidebarVisible} onClose={closeSidebar} />
    </View>
  );
}
