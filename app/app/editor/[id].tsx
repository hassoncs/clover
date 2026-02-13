import type { GameDefinition } from "@slopcade/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { EditorProvider } from "@/components/editor/EditorProvider";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { ResponsiveEditorLayout } from "@/components/editor/ResponsiveEditorLayout";
import { WorkspaceFilesProvider } from "@/components/editor/WorkspaceFilesProvider";
import { useAuth } from "@/hooks/useAuth";
import { ChatStreamProvider } from "@/lib/chat/ChatStreamProvider";
import { useGameWebSocket } from "@/lib/editor/hooks/useGameWebSocket";
import { useWorkspaceSnapshot } from "@/lib/editor/hooks/useWorkspaceSnapshot";
import { LivePreviewController } from "@/lib/game-engine/live/LivePreviewController";
import { trpc } from "@/lib/trpc/client";

function EditorWebSocket({ gameId }: { gameId: string }) {
	useGameWebSocket(gameId);
	return null;
}

export default function EditorScreen() {
	const router = useRouter();
	const auth = useAuth();
	const {
		id,
		definition: definitionParam,
		sourceType,
		sourceId,
	} = useLocalSearchParams<{
		id: string;
		definition?: string;
		sourceType?: string;
		sourceId?: string;
	}>();

	const resolvedGameId = id === "ephemeral" ? "preview" : (id ?? "preview");
	const { setMode: setPreviewMode } = useWorkspaceSnapshot(
		resolvedGameId,
		null,
	);

	const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const handleResetPreview = useCallback(async () => {
		await LivePreviewController.getInstance().reset();
	}, []);

	useEffect(() => {
		if (auth.isLoading) return;

		if (!auth.isAuthenticated) {
			router.replace("/(tabs)/profile");
			return;
		}

		const loadGame = async () => {
			setIsLoading(true);
			setError(null);

			try {
				if (definitionParam) {
					const parsed = JSON.parse(definitionParam) as GameDefinition;
					setGameDefinition(parsed);
				} else if (id && id !== "preview") {
					const game = await trpc.games.get.query({ id });
					const parsed = JSON.parse(game.definition) as GameDefinition;
					setGameDefinition(parsed);
				} else {
					throw new Error("No game definition provided");
				}
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to load game";
				setError(message);
			} finally {
				setIsLoading(false);
			}
		};

		loadGame();
	}, [id, definitionParam, auth.isLoading, auth.isAuthenticated, router]);

	const handleBack = () => {
		router.back();
	};

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
				<ActivityIndicator size="large" color="#4CAF50" />
				<Text className="text-white mt-4">Loading editor...</Text>
			</SafeAreaView>
		);
	}

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
		<GestureHandlerRootView style={{ flex: 1 }}>
			<View className="flex-1 bg-gray-900">
				<ChatStreamProvider>
					<EditorWebSocket gameId={resolvedGameId} />
					<EditorProvider
						gameId={resolvedGameId}
						initialDefinition={gameDefinition}
						isEphemeral={id === "ephemeral"}
						ephemeralSource={
							id === "ephemeral" && sourceType && sourceId
								? {
										type: sourceType as "database" | "offline",
										id: sourceId,
									}
								: undefined
						}
					>
						<WorkspaceFilesProvider gameId={resolvedGameId}>
							<EditorTopBar
								onResetPreview={handleResetPreview}
								setPreviewMode={setPreviewMode}
							/>
							<ResponsiveEditorLayout />
						</WorkspaceFilesProvider>
					</EditorProvider>
				</ChatStreamProvider>
			</View>
		</GestureHandlerRootView>
	);
}
