import type { AssetPlacement } from "@slopcade/shared";
import { STYLE_PRESET_OPTIONS } from "@slopcade/shared/types/style-presets";
import { tokens } from "@slopcade/theme";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { trpcReact } from "@/lib/trpc/react";
import { type ResolvedAssetEntry, useEditor } from "../EditorProvider";
import { PrefabGrid } from "./PrefabGrid";
import { QuickGenerationForm } from "./QuickGenerationForm";
import { useAssetGeneration } from "./useAssetGeneration";

interface AssetGalleryPanelProps {
	onPrefabPress?: (prefabId: string) => void;
}

type Mode = "entities" | "ui-components";

type ComponentType =
	| "button"
	| "checkbox"
	| "radio"
	| "slider"
	| "panel"
	| "progress_bar"
	| "scroll_bar_h"
	| "scroll_bar_v"
	| "tab_bar"
	| "list_item"
	| "dropdown"
	| "toggle_switch";

type UIState =
	| "normal"
	| "hover"
	| "pressed"
	| "disabled"
	| "focus"
	| "selected"
	| "unselected";

const COMPONENT_TYPES: { id: ComponentType; label: string }[] = [
	{ id: "button", label: "Button" },
	{ id: "checkbox", label: "Checkbox" },
	{ id: "radio", label: "Radio" },
	{ id: "slider", label: "Slider" },
	{ id: "panel", label: "Panel" },
	{ id: "progress_bar", label: "Progress Bar" },
	{ id: "scroll_bar_h", label: "Scroll Bar (H)" },
	{ id: "scroll_bar_v", label: "Scroll Bar (V)" },
	{ id: "tab_bar", label: "Tab Bar" },
	{ id: "list_item", label: "List Item" },
	{ id: "dropdown", label: "Dropdown" },
	{ id: "toggle_switch", label: "Toggle Switch" },
];

const UI_STATES: { id: UIState; label: string }[] = [
	{ id: "normal", label: "Normal" },
	{ id: "hover", label: "Hover" },
	{ id: "pressed", label: "Pressed" },
	{ id: "disabled", label: "Disabled" },
	{ id: "focus", label: "Focus" },
	{ id: "selected", label: "Selected" },
	{ id: "unselected", label: "Unselected" },
];

export function AssetGalleryPanel({ onPrefabPress }: AssetGalleryPanelProps) {
	const { gameId, document, setActiveAssets } = useEditor();
	const isPreviewMode = gameId === "preview";

	const [selectedRemixId, setSelectedRemixId] = useState<string | undefined>(
		undefined,
	);

	const [quickCreateTheme, setQuickCreateTheme] = useState("");
	const [quickCreateStyle, setQuickCreateStyle] = useState<string>("pixel");
	const [removeBackground, setRemoveBackground] = useState(true);
	const [isQuickCreating, setIsQuickCreating] = useState(false);

	const [selectedUIRemixId, setSelectedUIRemixId] = useState<
		string | undefined
	>();
	const [uiComponentType, setUiComponentType] =
		useState<ComponentType>("button");
	const [selectedStates, setSelectedStates] = useState<UIState[]>([
		"normal",
		"pressed",
	]);
	const [uiTheme, setUiTheme] = useState("");
	const [isGeneratingUI, setIsGeneratingUI] = useState(false);

	const prefabs = useMemo(() => {
		return Object.entries(document.prefabs ?? {}).map(([id, prefab]) => ({
			id,
			prefab,
		}));
	}, [document.prefabs]);

	const {
		data: remixes,
		isLoading: isLoadingRemixes,
		refetch: refetchRemixes,
	} = trpcReact.assetSystem.remixes.listRemixes.useQuery({ gameId });

	const { data: activeRemix, isLoading: isLoadingActiveRemix } =
		trpcReact.assetSystem.remixes.getResolvedRemix.useQuery(
			{ gameId, remixId: selectedRemixId! },
			{ enabled: !!selectedRemixId },
		);

	const deleteRemixMutation =
		trpcReact.assetSystem.remixes.deleteRemix.useMutation();

	const applyThemeMutation =
		trpcReact.assetSystem.applyThemeToGame.useMutation();

	const generateUIComponent =
		trpcReact.uiComponents.generateUIComponent.useMutation();

	const createJobMutation =
		trpcReact.assetSystem.createGenerationJob.useMutation();
	const processJobMutation =
		trpcReact.assetSystem.processGenerationJob.useMutation();

	const resolvedEntries = useMemo(() => {
		const remixOverrides = activeRemix?.overrides as
			| {
					assets?: Record<
						string,
						{ assetUrl?: string; placement?: AssetPlacement }
					>;
			  }
			| undefined;

		if (!remixOverrides?.assets) {
			return {};
		}

		const entries: Record<
			string,
			{ imageUrl: string; placement?: AssetPlacement }
		> = {};

		for (const [prefabId, override] of Object.entries(remixOverrides.assets)) {
			if (!override?.assetUrl) {
				continue;
			}

			entries[prefabId] = {
				imageUrl: override.assetUrl,
				placement: override.placement ?? undefined,
			};
		}

		return entries;
	}, [activeRemix?.overrides]);

	const entriesByPrefabId = useMemo(() => {
		const map = new Map<
			string,
			{ imageUrl?: string; placement?: AssetPlacement }
		>();

		for (const [prefabId, entry] of Object.entries(resolvedEntries)) {
			map.set(prefabId, {
				imageUrl: entry.imageUrl,
				placement: entry.placement,
			});
		}

		return map;
	}, [resolvedEntries]);

	useEffect(() => {
		if (!selectedRemixId) {
			setActiveAssets({});
			return;
		}

		if (isLoadingActiveRemix) {
			return;
		}

		setActiveAssets(resolvedEntries);
	}, [selectedRemixId, isLoadingActiveRemix, resolvedEntries, setActiveAssets]);

	const remixList = useMemo(() => {
		if (!remixes) return [];
		return remixes.map((remix) => ({
			id: remix.id,
			name: remix.name,
			assetCount: 0,
			totalPrefabs: prefabs.length,
		}));
	}, [remixes, prefabs.length]);

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

	const handleDeleteRemix = useCallback(() => {
		if (!selectedRemixId) {
			Alert.alert("No Remix Selected", "Please select a remix to delete.");
			return;
		}

		Alert.alert(
			"Delete Remix",
			"This will remove the selected remix and its overrides.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteRemixMutation.mutateAsync({ id: selectedRemixId });
							setSelectedRemixId(undefined);
							setActiveAssets({});
							await refetchRemixes();
						} catch (error) {
							Alert.alert(
								"Delete Failed",
								error instanceof Error
									? error.message
									: "Failed to delete remix",
							);
						}
					},
				},
			],
		);
	}, [selectedRemixId, deleteRemixMutation, setActiveAssets, refetchRemixes]);

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

			const result = await applyThemeMutation.mutateAsync({
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

			setSelectedRemixId(result.remixId);
			await refetchRemixes();

			Alert.alert(
				"Generation Started",
				"Your remix has been created and generation is running.",
			);
		} catch (error) {
			console.error("[AssetGallery] Quick generate failed:", error);
			Alert.alert(
				"Error",
				error instanceof Error ? error.message : "Failed to create remix",
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
		refetchRemixes,
	]);

	const handleGenerateAll = useCallback(() => {
		if (!selectedRemixId) {
			Alert.alert("No Remix Selected", "Please select or create a remix first");
			return;
		}

		const prefabIds = prefabs.map((t) => t.id);

		generateAll({
			remixId: selectedRemixId,
			prefabIds,
			themePrompt: document.metadata?.description,
		});
	}, [selectedRemixId, prefabs, document.metadata?.description, generateAll]);

	const handlePrefabPress = useCallback(
		(prefabId: string) => {
			onPrefabPress?.(prefabId);
		},
		[onPrefabPress],
	);

	const toggleState = useCallback((state: UIState) => {
		setSelectedStates((prev) =>
			prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state],
		);
	}, []);

	const handleGenerateUIComponent = useCallback(async () => {
		if (isPreviewMode) {
			Alert.alert(
				"Save Game First",
				"Please save your game before generating assets.",
			);
			return;
		}

		if (selectedStates.length === 0) {
			Alert.alert(
				"No States Selected",
				"Please select at least one state for the component.",
			);
			return;
		}

		if (!uiTheme.trim()) {
			Alert.alert(
				"Theme Required",
				"Please describe the visual theme for your component.",
			);
			return;
		}

		setIsGeneratingUI(true);

		try {
			const componentTypeLabel =
				COMPONENT_TYPES.find((c) => c.id === uiComponentType)?.label ??
				"Component";

			const remixResult = (await generateUIComponent.mutateAsync({
				gameId,
				componentType: uiComponentType,
				theme: uiTheme.trim(),
				states: selectedStates,
			})) as { remixId?: string };

			const remixId = remixResult.remixId;

			if (!remixId) {
				throw new Error("UI generation did not return a remix ID");
			}

			const jobResult = await createJobMutation.mutateAsync({
				gameId,
				remixId,
				prefabIds: [],
				promptDefaults: {
					componentType: uiComponentType,
					states: selectedStates,
					themePrompt: uiTheme.trim(),
				},
			});

			await processJobMutation.mutateAsync({ jobId: jobResult.jobId });

			Alert.alert(
				"Generation Complete",
				`Generated ${selectedStates.length} state${selectedStates.length > 1 ? "s" : ""} for ${componentTypeLabel.toLowerCase()}.`,
			);

			setSelectedUIRemixId(remixId);
		} catch (error) {
			Alert.alert(
				"Generation Failed",
				error instanceof Error
					? error.message
					: "Failed to generate UI component",
			);
		} finally {
			setIsGeneratingUI(false);
		}
	}, [
		isPreviewMode,
		gameId,
		uiComponentType,
		selectedStates,
		uiTheme,
		generateUIComponent,
		createJobMutation,
		processJobMutation,
	]);

	const isLoading = isLoadingRemixes || isLoadingActiveRemix;
	const hasNoRemixes = !isLoadingRemixes && remixList.length === 0;
	const showQuickCreate = hasNoRemixes && !isPreviewMode;

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
						To generate AI assets, you need to save your game first. This allows
						us to store and manage your remixes.
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

			{showQuickCreate ? (
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
			) : (
				<>
					<View className="mb-4">
						<View className="flex-row justify-between items-center mb-2">
							<Text className="text-theme-text-muted text-[11px] font-semibold tracking-widest mb-2">
								MANAGE REMIXES
							</Text>
							<Pressable
								className={`px-3 py-2 rounded-full ${selectedRemixId ? "bg-theme-surface-elevated" : "bg-theme-surface"}`}
								onPress={handleDeleteRemix}
								disabled={
									!selectedRemixId ||
									deleteRemixMutation.isPending ||
									isQuickCreating
								}
							>
								<Text className="text-theme-text-secondary text-xs font-medium">
									{deleteRemixMutation.isPending
										? "Deleting..."
										: "Delete remix"}
								</Text>
							</Pressable>
						</View>
						{isLoadingRemixes ? (
							<View className="p-5 items-center">
								<ActivityIndicator
									size="small"
									color={tokens.semantic.colors.primary}
								/>
							</View>
						) : (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								className="flex-row"
							>
								{remixList.map((remix) => (
									<Pressable
										key={remix.id}
										className={`bg-theme-surface-elevated px-3 py-2 rounded-full mr-2 flex-row items-center ${selectedRemixId === remix.id ? "bg-theme-primary" : ""}`}
										onPress={() => setSelectedRemixId(remix.id)}
										accessibilityRole="button"
										accessibilityLabel={`Select remix ${remix.name}`}
										accessibilityState={{
											selected: selectedRemixId === remix.id,
										}}
									>
										<Text
											className={`text-sm ${selectedRemixId === remix.id ? "text-theme-text-inverse" : "text-theme-text-secondary"}`}
										>
											{remix.name}
										</Text>
									</Pressable>
								))}
							</ScrollView>
						)}
					</View>

					<View className="mb-4">
						<Pressable
							className={`bg-theme-primary py-3 px-4 rounded-lg items-center ${isGenerating || !selectedRemixId ? "opacity-70" : ""}`}
							onPress={handleGenerateAll}
							disabled={isGenerating || !selectedRemixId}
							accessibilityRole="button"
							accessibilityLabel={
								selectedRemixId
									? "Regenerate all assets"
									: "Select a remix first"
							}
							accessibilityState={{
								disabled: isGenerating || !selectedRemixId,
							}}
						>
							{isGenerating ? (
								<View className="flex-row items-center gap-2">
									<ActivityIndicator size="small" color="#FFFFFF" />
									<Text className="text-theme-text-inverse text-sm font-semibold">
										{progress.completed}/{progress.total} Generating...
									</Text>
								</View>
							) : (
								<Text className="text-theme-text-inverse text-sm font-semibold">
									{selectedRemixId
										? "Regenerate All Assets"
										: "Select a Remix First"}
								</Text>
							)}
						</Pressable>
					</View>
				</>
			)}

			<View className="mb-3">
				<Text className="text-theme-text-muted text-[11px] font-semibold tracking-widest mb-2">
					PREFABS ({prefabs.length})
				</Text>
			</View>

			<PrefabGrid
				prefabs={prefabs}
				entriesByPrefabId={entriesByPrefabId}
				generatingPrefabs={generatingTemplates}
				isLoading={isLoading}
				onPrefabPress={handlePrefabPress}
			/>
		</ScrollView>
	);
}
