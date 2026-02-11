import type { AssetPlacement, EntityPrefab } from "@slopcade/shared";
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
import { AssetAlignmentEditor } from "../AssetAlignment/AssetAlignmentEditor";
import { type ResolvedPackEntry, useEditor } from "../EditorProvider";
import { AssetPackSelector } from "./AssetPackSelector";
import { PrefabGrid } from "./PrefabGrid";
import { QuickGenerationForm } from "./QuickGenerationForm";
import {
	useAssetGeneration,
	useAssetPacks,
	useAssetPackWithEntries,
	useCreateAssetPack,
	useDeleteAssetPack,
	useUpdatePlacement,
} from "./useAssetGeneration";

interface AssetGalleryPanelProps {
	onPrefabPress?: (prefabId: string) => void;
}

interface AlignmentEditorState {
	visible: boolean;
	prefabId: string;
	prefab: EntityPrefab | null;
	imageUrl?: string;
	placement?: AssetPlacement;
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
	const { gameId, document, setActiveAssetPack } = useEditor();
	const isPreviewMode = gameId === "preview";

	const [selectedPackId, setSelectedPackId] = useState<string | undefined>(
		document.assetSystem?.activePackId,
	);
	const [packSelectorVisible, setPackSelectorVisible] = useState(false);
	const [alignmentEditor, setAlignmentEditor] = useState<AlignmentEditorState>({
		visible: false,
		prefabId: "",
		prefab: null,
	});

	const [quickCreateTheme, setQuickCreateTheme] = useState("");
	const [quickCreateStyle, setQuickCreateStyle] = useState<string>("pixel");
	const [removeBackground, setRemoveBackground] = useState(true);
	const [isQuickCreating, setIsQuickCreating] = useState(false);

	// UI Component mode state
	const [selectedUIPackId, setSelectedUIPackId] = useState<
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
		return Object.entries(document.prefabs).map(([id, prefab]) => ({
			id,
			prefab,
		}));
	}, [document.prefabs]);

	const { data: assetPacks, isLoading: isLoadingPacks } = useAssetPacks(gameId);
	const { data: activePack, isLoading: isLoadingActivePack } =
		useAssetPackWithEntries(selectedPackId);

	// UI Component packs query
	const { data: uiPacks, isLoading: isLoadingUIPacks } =
		trpcReact.uiComponents.listUIComponentPacks.useQuery(
			{ gameId },
			{ enabled: false },
		);

	// Generate UI component mutation
	const generateUIComponent =
		trpcReact.uiComponents.generateUIComponent.useMutation();

	// Asset system job mutations
	const createJobMutation =
		trpcReact.assetSystem.createGenerationJob.useMutation();
	const processJobMutation =
		trpcReact.assetSystem.processGenerationJob.useMutation();

	const entriesByPrefabId = useMemo(() => {
		if (!activePack?.entries)
			return new Map<
				string,
				{ imageUrl?: string; placement?: AssetPlacement }
			>();
		const map = new Map<
			string,
			{ imageUrl?: string; placement?: AssetPlacement }
		>();
		for (const entry of activePack.entries) {
			map.set(entry.prefabId, {
				imageUrl: entry.imageUrl ?? undefined,
				placement: entry.placement,
			});
		}
		return map;
	}, [activePack?.entries]);

	useEffect(() => {
		console.log("[AssetGalleryPanel] Pack selection effect triggered", {
			selectedPackId,
			isLoadingActivePack,
			hasEntries: !!activePack?.entries,
			entryCount: activePack?.entries?.length ?? 0,
		});

		if (!selectedPackId) {
			console.log("[AssetGalleryPanel] No pack selected, clearing active pack");
			setActiveAssetPack(undefined, {});
			return;
		}

		if (isLoadingActivePack) {
			console.log("[AssetGalleryPanel] Still loading pack entries, waiting...");
			return;
		}

		if (!activePack?.entries) {
			console.log("[AssetGalleryPanel] No entries in active pack");
			return;
		}

		const resolvedEntries: Record<string, ResolvedPackEntry> = {};
		for (const entry of activePack.entries) {
			if (entry.imageUrl) {
				resolvedEntries[entry.prefabId] = {
					imageUrl: entry.imageUrl,
					placement: entry.placement ?? undefined,
				};
			}
		}

		console.log("[AssetGalleryPanel] Calling setActiveAssetPack", {
			packId: selectedPackId,
			resolvedEntriesCount: Object.keys(resolvedEntries).length,
		});

		setActiveAssetPack(selectedPackId, resolvedEntries);
	}, [
		selectedPackId,
		isLoadingActivePack,
		activePack?.entries,
		setActiveAssetPack,
	]);

	const packList = useMemo(() => {
		if (!assetPacks) return [];
		return assetPacks.map((pack) => ({
			id: pack.id,
			name: pack.name,
			assetCount: 0,
			totalPrefabs: prefabs.length,
		}));
	}, [assetPacks, prefabs.length]);

	const coverage = useMemo(() => {
		const covered = prefabs.filter(
			(t) =>
				entriesByPrefabId.has(t.id) && entriesByPrefabId.get(t.id)?.imageUrl,
		).length;
		return { covered, total: prefabs.length };
	}, [entriesByPrefabId, prefabs]);

	const { createPack, isCreating: isCreatingPack } = useCreateAssetPack(gameId);
	const { deletePack, isDeleting: isDeletingPack } = useDeleteAssetPack(gameId);

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

	const handleCreatePack = useCallback(
		async (params: { name: string; style?: string; themePrompt?: string }) => {
			try {
				const result = await createPack(params);
				setSelectedPackId(result.id);
				setPackSelectorVisible(false);
				return result;
			} catch (error) {
				Alert.alert(
					"Error",
					error instanceof Error
						? error.message
						: "Failed to create asset pack",
				);
				throw error;
			}
		},
		[createPack],
	);

	const handleDeletePack = useCallback(
		async (packId: string) => {
			try {
				await deletePack(packId);
				if (selectedPackId === packId) {
					setSelectedPackId(undefined);
				}
			} catch (error) {
				Alert.alert(
					"Error",
					error instanceof Error
						? error.message
						: "Failed to delete asset pack",
				);
			}
		},
		[deletePack, selectedPackId],
	);

	const handleQuickGenerate = useCallback(async () => {
		console.log("[AssetGallery] handleQuickGenerate called");
		console.log("[AssetGallery] isPreviewMode:", isPreviewMode);
		console.log("[AssetGallery] gameId:", gameId);
		console.log("[AssetGallery] prefabs.length:", prefabs.length);

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
			const packName = quickCreateTheme.trim()
				? `${quickCreateTheme.trim().slice(0, 20)} (${styleName})`
				: `${styleName} Style`;

			console.log("[AssetGallery] Creating pack:", {
				packName,
				style: quickCreateStyle,
				gameId,
			});
			const pack = await createPack({
				name: packName,
				style: quickCreateStyle,
				themePrompt: quickCreateTheme.trim() || undefined,
			});
			console.log("[AssetGallery] Pack created:", pack);

			setSelectedPackId(pack.id);

			console.log("[AssetGallery] Starting generateAll with packId:", pack.id);
			generateAll({
				packId: pack.id,
				prefabIds: prefabs.map((p) => p.id),
				themePrompt: quickCreateTheme.trim() || document.metadata?.description,
				style: quickCreateStyle,
				removeBackground,
			});
		} catch (error) {
			console.error("[AssetGallery] Quick generate failed:", error);
			Alert.alert(
				"Error",
				error instanceof Error ? error.message : "Failed to create asset pack",
			);
			setIsQuickCreating(false);
		}
	}, [
		isPreviewMode,
		gameId,
		prefabs,
		quickCreateTheme,
		quickCreateStyle,
		removeBackground,
		createPack,
		generateAll,
		document.metadata?.description,
	]);

	const handleGenerateAll = useCallback(() => {
		if (!selectedPackId) {
			Alert.alert(
				"No Pack Selected",
				"Please select or create an asset pack first",
			);
			return;
		}

		const prefabIds = prefabs.map((t) => t.id);

		generateAll({
			packId: selectedPackId,
			prefabIds,
			themePrompt: document.metadata?.description,
		});
	}, [selectedPackId, prefabs, document.metadata?.description, generateAll]);

	const updatePlacementMutation = useUpdatePlacement();

	const handlePrefabPress = useCallback(
		(prefabId: string) => {
			const prefab = document.prefabs[prefabId];
			const entryData = entriesByPrefabId.get(prefabId);

			if (entryData?.imageUrl) {
				setAlignmentEditor({
					visible: true,
					prefabId,
					prefab,
					imageUrl: entryData.imageUrl,
					placement: entryData.placement ?? {
						scale: 1,
						offsetX: 0,
						offsetY: 0,
					},
				});
			} else {
				onPrefabPress?.(prefabId);
			}
		},
		[document.prefabs, entriesByPrefabId, onPrefabPress],
	);

	const handleSavePlacement = useCallback(
		async (placement: AssetPlacement) => {
			if (!selectedPackId || !alignmentEditor.prefabId) return;

			try {
				await updatePlacementMutation.mutateAsync({
					packId: selectedPackId,
					prefabId: alignmentEditor.prefabId,
					placement,
				});
			} catch {
				Alert.alert("Error", "Failed to save alignment");
			}
		},
		[selectedPackId, alignmentEditor.prefabId, updatePlacementMutation],
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
			// Create UI component pack
			const componentTypeLabel =
				COMPONENT_TYPES.find((c) => c.id === uiComponentType)?.label ??
				"Component";

			const packResult = await generateUIComponent.mutateAsync({
				gameId,
				componentType: uiComponentType,
				theme: uiTheme.trim(),
				states: selectedStates,
			});

			// Create generation job for the pack
			const jobResult = await createJobMutation.mutateAsync({
				gameId,
				packId: packResult.packId,
				prefabIds: [],
				promptDefaults: {
					componentType: uiComponentType,
					states: selectedStates,
					themePrompt: uiTheme.trim(),
				},
			});

			// Process the job
			await processJobMutation.mutateAsync({ jobId: jobResult.jobId });

			Alert.alert(
				"Generation Complete",
				`Generated ${selectedStates.length} state${selectedStates.length > 1 ? "s" : ""} for ${componentTypeLabel.toLowerCase()}.`,
			);

			// Refresh UI packs
			setSelectedUIPackId(packResult.packId);
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

	const isLoading = isLoadingPacks || isLoadingActivePack;
	const hasNoPacks = !isLoadingPacks && packList.length === 0;
	const showQuickCreate = hasNoPacks && !isPreviewMode;

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
						us to store and manage your asset packs.
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
					isGenerating={isGenerating}
					isQuickCreating={isQuickCreating}
					progress={progress}
					onGenerate={handleQuickGenerate}
				/>
			) : (
				<>
					<View className="mb-4">
						<View className="flex-row justify-between items-center mb-2">
							<Text className="text-theme-text-muted text-[11px] font-semibold tracking-widest mb-2">
								ASSET PACKS
							</Text>
							<Pressable
								className="px-3 py-1 bg-theme-surface-elevated rounded-xl"
								onPress={() => setPackSelectorVisible(true)}
								accessibilityRole="button"
								accessibilityLabel={
									packList.length > 0
										? "Manage asset packs"
										: "Create asset pack"
								}
							>
								<Text className="text-theme-text-muted text-xs font-medium">
									{packList.length > 0 ? "Manage" : "+ Create Pack"}
								</Text>
							</Pressable>
						</View>
						{isLoadingPacks ? (
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
								{packList.map((pack) => (
									<Pressable
										key={pack.id}
										className={`bg-theme-surface-elevated px-3 py-2 rounded-full mr-2 flex-row items-center ${selectedPackId === pack.id ? "bg-theme-primary" : ""}`}
										onPress={() => setSelectedPackId(pack.id)}
										accessibilityRole="button"
										accessibilityLabel={`Select pack ${pack.name}`}
										accessibilityState={{
											selected: selectedPackId === pack.id,
										}}
									>
										<Text
											className={`text-sm ${selectedPackId === pack.id ? "text-theme-text-inverse" : "text-theme-text-secondary"}`}
										>
											{pack.name}
										</Text>
									</Pressable>
								))}
							</ScrollView>
						)}
					</View>

					<View className="mb-4">
						<Pressable
							className={`bg-theme-primary py-3 px-4 rounded-lg items-center ${isGenerating || !selectedPackId ? "opacity-70" : ""}`}
							onPress={handleGenerateAll}
							disabled={isGenerating || !selectedPackId}
							accessibilityRole="button"
							accessibilityLabel={
								selectedPackId ? "Regenerate all assets" : "Select a pack first"
							}
							accessibilityState={{ disabled: isGenerating || !selectedPackId }}
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
									{selectedPackId
										? "Regenerate All Assets"
										: "Select a Pack First"}
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

			<AssetPackSelector
				visible={packSelectorVisible}
				onClose={() => setPackSelectorVisible(false)}
				packs={assetPacks ?? []}
				selectedPackId={selectedPackId}
				totalTemplates={prefabs.length}
				onSelectPack={setSelectedPackId}
				onCreatePack={handleCreatePack}
				onDeletePack={handleDeletePack}
				isCreating={isCreatingPack}
				isDeleting={isDeletingPack}
			/>

			<AssetAlignmentEditor
				visible={alignmentEditor.visible}
				onClose={() =>
					setAlignmentEditor((prev) => ({ ...prev, visible: false }))
				}
				prefabId={alignmentEditor.prefabId}
				physics={alignmentEditor.prefab?.physics}
				imageUrl={alignmentEditor.imageUrl}
				initialPlacement={alignmentEditor.placement}
				onSave={handleSavePlacement}
			/>
		</ScrollView>
	);
}
