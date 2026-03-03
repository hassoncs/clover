import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { TRPCProvider } from "../lib/trpc/client";

export default function RootLayout() {
	const { setColorScheme } = useColorScheme();

	useEffect(() => {
		setColorScheme("dark");
	}, [setColorScheme]);

	return (
		<TRPCProvider>
			<GestureHandlerRootView
				style={{ flex: 1 }}
				className={Platform.OS === "web" ? "no-select" : undefined}
			>
				<SafeAreaProvider>
					<Stack screenOptions={{ headerShown: false }}>
						<Stack.Screen name="index" />
					</Stack>
				</SafeAreaProvider>
			</GestureHandlerRootView>
		</TRPCProvider>
	);
}
