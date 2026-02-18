import type { EntityPrefab } from "@slopcade/shared";
import { STYLE_PRESET_OPTIONS } from "@slopcade/shared/types/style-presets";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { trpcReact } from "@/lib/trpc/react";
import { useEditor } from "../EditorProvider";
import { PrefabGrid } from "./PrefabGrid";
import { QuickGenerationForm } from "./QuickGenerationForm";
import { useAssetGeneration } from "./useAssetGeneration";

interface AssetGalleryPanelProps {
	onPrefabPress?: (prefabId: string) => void;
}

export function AssetGalleryPanel({ onPrefabPress }: AssetGalleryPanelProps) {
	const { gameId, document } = useEditor();
	const isPreviewMode = gameId === "preview";

	const [quickCreateTheme, setQuickCreateTheme] = useState("");
	const [quickCreateStyle, setQuickCreateStyle] = useState<string>("pixel");
	const [removeBackground, setRemoveBackground] = useState(true);
	const [isQuickCreating, setIsQuickCreating] = useState(false);

	const prefabs = useMemo(() => {
		return Object.entries(document.prefabs ?? {}).map(([id, prefab]) => ({
			id,
			prefab: prefab as EntityPrefab,
		}));
	}, [document.prefabs]);

	const applyThemeMutation =
		trpcReact.assetSystem.applyThemeToGame.useMutation();

	const entriesByPrefabId = useMemo(
		() => new Map<string, { imageUrl?: string }>(),
		[],
	);

	const coverage = useMemo(() => {
		const covered = prefabs.filter(
			(t) =>
				entriesByPrefabId.has(t.id) && entriesByPrefabId.get(t.id)?.imageUrl,
		).length;
		return { covered, total: prefabs.length };
	}, [entriesByPrefabId, prefabs]);

	const { isGenerating, generatingTemplates, progress, generateAll } =
		useAssetGeneration({
			gameId,
			onComplete: (result) => {
				setIsQuickCreating(false);
				Alert.alert(
					"Generation Complete",
					`Generated ${result.successCount} assets${result.failCount > 0 ? `, ${result.failCount} failed` : ""}`,
				);
			},
			onError: (error) => {
				setIsQuickCreating(false);
				Alert.alert("Generation Failed", error);
			},
		});

	const handleQuickGenerate = useCallback(async () => {
		if (isPreviewMode) {
			Alert.alert(
				"Save Game First",
				"Please save your game before generating assets.",
			);
			return;
		}

		if (prefabs.length === 0) {
			Alert.alert("No Prefabs", "Add some entities to your game first.");
			return;
		}

		setIsQuickCreating(true);

		try {
			const styleName =
				STYLE_PRESET_OPTIONS.find((s) => s.id === quickCreateStyle)?.label ??
				"Custom";
			const themeName = quickCreateTheme.trim()
				? `${quickCreateTheme.trim().slice(0, 20)} (${styleName})`
				: `${styleName} Style`;

			await applyThemeMutation.mutateAsync({
				gameId,
				newTheme: {
					name: themeName,
					promptModifier:
						quickCreateTheme.trim() ||
						document.metadata?.description ||
						themeName,
				},
				styleOverride: quickCreateStyle,
				setAsActive: true,
			});

			Alert.alert(
				"Generation Started",
				"Theme applied and generation is running.",
			);
		} catch (error) {
			console.error("[AssetGallery] Quick generate failed:", error);
			Alert.alert(
				"Error",
				error instanceof Error ? error.message : "Failed to generate assets",
			);
		} finally {
			setIsQuickCreating(false);
		}
	}, [
		isPreviewMode,
		prefabs,
		quickCreateStyle,
		quickCreateTheme,
		applyThemeMutation,
		gameId,
		document.metadata?.description,
	]);

	const handleGenerateAll = useCallback(() => {
		const prefabIds = prefabs.map((t) => t.id);
		generateAll({
			prefabIds,
			themePrompt: document.metadata?.description,
		});
	}, [prefabs, document.metadata?.description, generateAll]);

	const handlePrefabPress = useCallback(
		(prefabId: string) => {
			onPrefabPress?.(prefabId);
		},
		[onPrefabPress],
	);

	if (isPreviewMode) {
		return (
			<ScrollView
				className="flex-1 bg-theme-surface"
				contentContainerClassName="p-4"
			>
				<View className="items-center py-16 px-6">
					<Text className="text-5xl mb-4">💾</Text>
					<Text className="text-theme-text text-xl font-bold mb-3 text-center">
						Save Your Game First
					</Text>
					<Text className="text-theme-text-muted text-base text-center leading-6">
						To generate AI assets, you need to save your game first.
					</Text>
				</View>
			</ScrollView>
		);
	}

	return (
		<ScrollView
			className="flex-1 bg-theme-surface"
			contentContainerClassName="p-4"
		>
			<View className="mb-4">
				<Text className="text-theme-text text-xl font-bold">Asset Gallery</Text>
				<Text className="text-theme-text-muted text-sm mt-1">
					{coverage.covered}/{coverage.total} prefabs have assets
				</Text>
			</View>

			<QuickGenerationForm
				gameId={gameId}
				theme={quickCreateTheme}
				onThemeChange={setQuickCreateTheme}
				style={quickCreateStyle}
				onStyleChange={setQuickCreateStyle}
				removeBackground={removeBackground}
				onRemoveBackgroundToggle={() => setRemoveBackground((prev) => !prev)}
				templateCount={prefabs.length}
				isGenerating={isGenerating || isQuickCreating}
				isQuickCreating={isQuickCreating}
				progress={progress}
				onGenerate={handleQuickGenerate}
			/>

			<View className="mb-4">
				<Pressable
					className={`bg-theme-primary py-3 px-4 rounded-lg items-center ${isGenerating ? "opacity-70" : ""}`}
					onPress={handleGenerateAll}
					disabled={isGenerating}
					accessibilityRole="button"
					accessibilityLabel="Generate all assets"
					accessibilityState={{ disabled: isGenerating }}
				>
					{isGenerating ? (
						<View className="flex-row items-center gap-2">
							<Text className="text-theme-text-inverse text-sm font-semibold">
								{progress.completed}/{progress.total} Generating...
							</Text>
						</View>
					) : (
						<Text className="text-theme-text-inverse text-sm font-semibold">
							Generate All Assets
						</Text>
					)}
				</Pressable>
			</View>

			<View className="mb-3">
				<Text className="text-theme-text-muted text-[11px] font-semibold tracking-widest mb-2">
					PREFABS ({prefabs.length})
				</Text>
			</View>

			<PrefabGrid
				prefabs={prefabs}
				entriesByPrefabId={entriesByPrefabId}
				generatingPrefabs={generatingTemplates}
				isLoading={false}
				onPrefabPress={handlePrefabPress}
			/>
		</ScrollView>
	);
}
