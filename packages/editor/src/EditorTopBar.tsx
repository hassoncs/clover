import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@slopcade/theme";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEditor } from "./EditorProvider";
import { useEditorTRPC } from "./editor-context";

export interface EditorTopBarProps {
	onResetPreview?: () => void;
	setPreviewMode?: (mode: "author" | "live") => Promise<void>;
}

export function EditorTopBar({
	onResetPreview,
	setPreviewMode,
}: EditorTopBarProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const trpc = useEditorTRPC();
	const createGame = trpc.games.create.useMutation();
	const updateGame = trpc.games.update.useMutation();
	const { editorColors, toggleTheme, colorScheme } = useTheme();
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
		livePreviewEnabled,
	} = useEditor();

	const handleBack = () => {
		router.back();
	};

	const handleToggleMode = async () => {
		toggleMode();
		if (setPreviewMode) {
			const newMode = mode === "author" ? "live" : "author";
			await setPreviewMode(newMode);
		}
	};

	const handleReset = () => {
		if (isResetting || !onResetPreview) return;
		setIsResetting(true);
		try {
			onResetPreview();
		} finally {
			setIsResetting(false);
		}
	};

	const handleSave = async () => {
		if (isSaving) return;
		setIsSaving(true);

		try {
			if (isEphemeral) {
				const result = await createGame.mutateAsync({
					title: document?.metadata?.title ?? "Untitled",
					description: document?.metadata?.description,
					definition: JSON.stringify(document),
					isPublic: false,
				});
				router.replace(`/editor/${result.id}`);
			} else if (gameId !== "preview") {
				await updateGame.mutateAsync({
					id: gameId,
					title: document?.metadata?.title ?? "Untitled",
					description: document?.metadata?.description,
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

	const c = editorColors;

	return (
		<View
			style={[
				styles.container,
				{
					paddingTop: insets.top,
					height: 40 + insets.top,
					backgroundColor: c.titleBarBg,
					borderBottomColor: c.border,
				},
			]}
		>
			<View style={styles.leftSection}>
				<Pressable
					testID="editor-back-button"
					style={styles.iconBtn}
					onPress={handleBack}
					accessibilityRole="button"
					accessibilityLabel="Go back"
				>
					<Ionicons name="chevron-back" size={18} color={c.textSecondary} />
				</Pressable>

				<View style={styles.undoRedoGroup}>
					<Pressable
						style={[styles.iconBtn, !canUndo && styles.iconBtnDisabled]}
						onPress={undo}
						disabled={!canUndo}
						accessibilityRole="button"
						accessibilityLabel="Undo"
					>
						<Ionicons
							name="arrow-undo"
							size={16}
							color={canUndo ? c.textSecondary : c.textMuted}
						/>
					</Pressable>
					<Pressable
						style={[styles.iconBtn, !canRedo && styles.iconBtnDisabled]}
						onPress={redo}
						disabled={!canRedo}
						accessibilityRole="button"
						accessibilityLabel="Redo"
					>
						<Ionicons
							name="arrow-redo"
							size={16}
							color={canRedo ? c.textSecondary : c.textMuted}
						/>
					</Pressable>
				</View>
			</View>

			<View style={styles.centerSection}>
				<Text
					style={[styles.title, { color: c.textSecondary }]}
					numberOfLines={1}
				>
					{document?.metadata?.title ?? "Untitled"}
					{isDirty ? <Text style={{ color: c.warning }}> ●</Text> : null}
				</Text>
			</View>

			<View style={styles.rightSection}>
				{(isEphemeral || isDirty) && (
					<Pressable
						style={[styles.textBtn, { backgroundColor: c.surfaceHover }]}
						onPress={handleSave}
						disabled={isSaving}
						accessibilityRole="button"
						accessibilityLabel="Save game"
					>
						{isSaving ? (
							<ActivityIndicator size="small" color={c.text} />
						) : (
							<>
								<Ionicons name="save-outline" size={14} color={c.text} />
								<Text style={[styles.btnLabel, { color: c.text }]}>Save</Text>
							</>
						)}
					</Pressable>
				)}

				{livePreviewEnabled && (
					<Pressable
						style={[styles.textBtn, { backgroundColor: c.surfaceHover }]}
						onPress={handleReset}
						disabled={isResetting}
						accessibilityRole="button"
						accessibilityLabel="Reset preview"
					>
						{isResetting ? (
							<ActivityIndicator size="small" color={c.text} />
						) : (
							<Ionicons name="refresh" size={14} color={c.textSecondary} />
						)}
					</Pressable>
				)}

				<Pressable
					style={styles.iconBtn}
					onPress={toggleTheme}
					accessibilityRole="button"
					accessibilityLabel="Toggle theme"
				>
					<Ionicons
						name={colorScheme === "dark" ? "sunny-outline" : "moon-outline"}
						size={16}
						color={c.textSecondary}
					/>
				</Pressable>

				<Pressable
					testID="editor-play-button"
					style={[
						styles.playBtn,
						{
							backgroundColor: mode === "live" ? c.success : c.accent,
						},
					]}
					onPress={handleToggleMode}
					accessibilityRole="button"
					accessibilityLabel={
						mode === "live" ? "Switch to author mode" : "Switch to live mode"
					}
				>
					<Ionicons
						name={mode === "live" ? "pencil" : "play"}
						size={14}
						color="#ffffff"
					/>
					<Text style={styles.playBtnLabel}>
						{mode === "live" ? "Author" : "Live"}
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 8,
		borderBottomWidth: 1,
	},
	leftSection: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
	},
	centerSection: {
		flex: 1,
		marginHorizontal: 12,
	},
	rightSection: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	undoRedoGroup: {
		flexDirection: "row",
		alignItems: "center",
	},
	iconBtn: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 6,
	},
	iconBtnDisabled: {
		opacity: 0.35,
	},
	textBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 10,
		height: 28,
		borderRadius: 6,
	},
	btnLabel: {
		fontSize: 12,
		fontWeight: "500",
	},
	title: {
		fontSize: 13,
		fontWeight: "500",
		textAlign: "center",
	},
	playBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 12,
		height: 28,
		borderRadius: 6,
	},
	playBtnLabel: {
		color: "#ffffff",
		fontSize: 12,
		fontWeight: "600",
	},
});
