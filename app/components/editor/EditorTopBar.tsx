import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc/client";
import { useEditor } from "./EditorProvider";

export interface EditorTopBarProps {
	livePreviewEnabled?: boolean;
	onResetPreview?: () => void;
	setPreviewMode?: (mode: "edit" | "play") => Promise<void>;
}

export function EditorTopBar({
	livePreviewEnabled,
	onResetPreview,
	setPreviewMode,
}: EditorTopBarProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [isSaving, setIsSaving] = useState(false);
	const [isResetting, setIsResetting] = useState(false);
	const {
		gameId,
		mode,
		toggleMode,
		document,
		canUndo,
		canRedo,
		undo,
		redo,
		isDirty,
		isEphemeral,
		ephemeralSource,
	} = useEditor();

	const handleBack = () => {
		router.back();
	};

	const handleToggleMode = async () => {
		toggleMode();
		if (setPreviewMode) {
			const newMode = mode === "edit" ? "play" : "edit";
			await setPreviewMode(newMode);
		}
	};

	const handleReset = async () => {
		if (isResetting || !onResetPreview) return;
		setIsResetting(true);
		try {
			await onResetPreview();
		} finally {
			setIsResetting(false);
		}
	};

	const handleSave = async () => {
		if (isSaving) return;
		setIsSaving(true);

		try {
			if (isEphemeral) {
				const result = await trpc.games.create.mutate({
					title: document.metadata.title,
					description: document.metadata.description,
					definition: JSON.stringify(document),
					isPublic: false,
				});
				router.replace(`/editor/${result.id}`);
			} else if (gameId !== "preview") {
				await trpc.games.update.mutate({
					id: gameId,
					title: document.metadata.title,
					description: document.metadata.description,
					definition: JSON.stringify(document),
				});
			}
		} catch (err) {
			console.error("Failed to save game:", err);
			Alert.alert(
				"Save Failed",
				err instanceof Error ? err.message : "An error occurred while saving",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<View
			className="flex-row items-center justify-between px-4 bg-gray-900 border-b border-gray-800"
			style={{ paddingTop: insets.top, height: 56 + insets.top }}
		>
			<Pressable
				testID="editor-back-button"
				className="w-10 h-10 items-center justify-center rounded-lg active:bg-gray-700"
				onPress={handleBack}
				accessibilityRole="button"
				accessibilityLabel="Go back"
			>
				<Text className="text-white text-xl">←</Text>
			</Pressable>

			<View className="flex-row gap-1">
				<Pressable
					className={`w-10 h-10 items-center justify-center rounded-lg ${
						canUndo
							? "bg-gray-700 active:bg-gray-600"
							: "bg-gray-800 opacity-40"
					}`}
					onPress={undo}
					disabled={!canUndo}
					accessibilityRole="button"
					accessibilityLabel="Undo"
					accessibilityState={{ disabled: !canUndo }}
				>
					<Text className="text-white text-lg">↶</Text>
				</Pressable>
				<Pressable
					className={`w-10 h-10 items-center justify-center rounded-lg ${
						canRedo
							? "bg-gray-700 active:bg-gray-600"
							: "bg-gray-800 opacity-40"
					}`}
					onPress={redo}
					disabled={!canRedo}
					accessibilityRole="button"
					accessibilityLabel="Redo"
					accessibilityState={{ disabled: !canRedo }}
				>
					<Text className="text-white text-lg">↷</Text>
				</Pressable>
			</View>

			<View className="flex-1 mx-4">
				<Text
					className="text-white font-semibold text-base text-center"
					numberOfLines={1}
				>
					{document.metadata.title}
					{isDirty && <Text className="text-yellow-500"> •</Text>}
				</Text>
			</View>

			<View className="flex-row gap-2">
				{(isEphemeral || isDirty) && (
					<Pressable
						className={`px-4 py-2 rounded-lg active:opacity-80 ${
							isSaving ? "bg-gray-600" : "bg-green-600"
						}`}
						onPress={handleSave}
						disabled={isSaving}
						accessibilityRole="button"
						accessibilityLabel="Save game"
					>
						{isSaving ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text className="text-white font-bold text-sm">
								{isEphemeral ? "💾 SAVE" : "💾 SAVE"}
							</Text>
						)}
					</Pressable>
				)}

				{livePreviewEnabled && (
					<Pressable
						className={`px-4 py-2 rounded-lg active:opacity-80 ${
							isResetting ? "bg-gray-600" : "bg-yellow-600"
						}`}
						onPress={handleReset}
						disabled={isResetting}
						accessibilityRole="button"
						accessibilityLabel="Reset preview"
					>
						{isResetting ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text className="text-white font-bold text-sm">↺ RESET</Text>
						)}
					</Pressable>
				)}

				<Pressable
					testID="editor-play-button"
					className={`px-4 py-2 rounded-lg active:opacity-80 ${
						mode === "playtest" ? "bg-green-600" : "bg-indigo-600"
					}`}
					onPress={handleToggleMode}
					accessibilityRole="button"
					accessibilityLabel={
						mode === "playtest" ? "Switch to edit mode" : "Switch to play mode"
					}
				>
					<Text className="text-white font-bold text-sm">
						{mode === "playtest" ? "✏️ EDIT" : "▶ PLAY"}
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
