import type { GameDefinition } from "@slopcade/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FullScreenHeader } from "../../components/FullScreenHeader";
import { WithGodot } from "../../components/WithGodot";

const loadGameRuntimeModule = () =>
	import("@slopcade/game-runtime/GameRuntime.godot") as Promise<
		Record<string, unknown>
	>;

export default function PreviewScreen() {
	const router = useRouter();
	const { definition: definitionParam } = useLocalSearchParams<{
		definition: string;
	}>();

	const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [runtimeKey, setRuntimeKey] = useState(0);

	useEffect(() => {
		if (definitionParam) {
			try {
				const parsed = JSON.parse(definitionParam) as GameDefinition;
				setGameDefinition(parsed);
			} catch {
				setError("Invalid game definition");
			}
		} else {
			setError("No game definition provided");
		}
	}, [definitionParam]);

	const handleGameEnd = useCallback((state: "won" | "lost") => {
		console.log(`Game ended: ${state}`);
	}, []);

	const handleRequestRestart = useCallback(() => {
		setRuntimeKey((k) => k + 1);
	}, []);

	const handleBack = useCallback(() => {
		router.back();
	}, [router]);

	if (error || !gameDefinition) {
		return (
			<SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
				<Text className="text-red-400 text-center text-lg">
					{error ?? "No game found"}
				</Text>
				<Pressable
					className="mt-6 py-3 px-6 bg-gray-700 rounded-lg"
					onPress={handleBack}
				>
					<Text className="text-white font-semibold">← Go Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	return (
		<View className="flex-1 bg-gray-900">
			<FullScreenHeader
				onBack={handleBack}
				centerContent={
					<View className="bg-yellow-500/80 px-3 py-1 rounded-full">
						<Text className="text-yellow-900 font-semibold text-sm">
							PREVIEW
						</Text>
					</View>
				}
			/>

			<WithGodot
				key={runtimeKey}
				loadModule={loadGameRuntimeModule}
				render={(mod) => {
					const Comp = (
						mod as {
							GameRuntimeGodotWithDevTools: React.ComponentType<
								Record<string, unknown>
							>;
						}
					).GameRuntimeGodotWithDevTools;
					return (
						<Comp
							definition={gameDefinition}
							onGameEnd={handleGameEnd}
							onRequestRestart={handleRequestRestart}
							showHUD
						/>
					);
				}}
				fallback={
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator size="large" color="#4CAF50" />
					</View>
				}
			/>
		</View>
	);
}
