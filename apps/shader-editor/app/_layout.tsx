import "react-native-get-random-values";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

function RootLayoutContent() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(tabs)" />
		</Stack>
	);
}

export default function RootLayout() {
	const { setColorScheme } = useColorScheme();

	useEffect(() => {
		setColorScheme("dark");
	}, [setColorScheme]);

	return (
		<GestureHandlerRootView
			style={{ flex: 1 }}
			className={Platform.OS === "web" ? "no-select" : undefined}
		>
			<SafeAreaProvider>
				<RootLayoutContent />
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
