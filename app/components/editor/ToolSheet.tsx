import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
	BottomSheetScrollView,
	BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { AssetGalleryPanel } from "./AssetGallery/AssetGalleryPanel";
import type { EditorTab } from "./EditorProvider";
import { AssetsPanel } from "./panels/AssetsPanel";
import { DebugPanel } from "./panels/DebugPanel";
import { ExplorerPanel } from "./panels/ExplorerPanel";
import { LayersPanel } from "./panels/LayersPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";

const TAB_TITLES: Record<string, string> = {
	gallery: "Images",
	assets: "Add",
	properties: "Properties",
	layers: "Layers",
	debug: "Debug",
	files: "Files",
};

interface ToolSheetProps {
	activeTab: EditorTab | null;
	onDismiss: () => void;
}

export function ToolSheet({ activeTab, onDismiss }: ToolSheetProps) {
	const sheetRef = useRef<BottomSheet>(null);
	const snapPoints = useMemo(() => ["50%", "90%"], []);

	const renderHandle = useCallback(
		() => (
			<View className="items-center pt-2 pb-1 bg-secondary-800 rounded-t-4">
				<View className="w-10 h-1 rounded bg-secondary-500 mb-2" />
				<View className="flex-row items-center justify-between px-4 pb-2 w-full">
					<Pressable
						onPress={onDismiss}
						className="w-10 h-10 justify-center items-center"
						accessibilityRole="button"
						accessibilityLabel="Close tool sheet"
					>
						<Ionicons name="close" size={24} color="#FFFFFF" />
					</Pressable>
					<Text className="text-white text-base font-semibold">
						{TAB_TITLES[activeTab ?? ""] ?? ""}
					</Text>
					<View className="w-10 h-10 justify-center items-center" />
				</View>
			</View>
		),
		[onDismiss, activeTab],
	);

	const isFilesTab = activeTab === "files";

	const renderContent = useCallback(() => {
		switch (activeTab) {
			case "gallery":
				return <AssetGalleryPanel onPrefabPress={() => {}} />;
			case "assets":
				return <AssetsPanel />;
			case "properties":
				return <PropertiesPanel />;
			case "layers":
				return <LayersPanel />;
			case "debug":
				return <DebugPanel />;
			case "files":
				return <ExplorerPanel />;
			default:
				return null;
		}
	}, [activeTab]);

	if (!activeTab) return null;

	return (
		<BottomSheet
			ref={sheetRef}
			index={0}
			snapPoints={snapPoints}
			backgroundStyle={{ backgroundColor: "#1F2937" }}
			handleComponent={renderHandle}
			style={{
				elevation: 10,
				shadowColor: "#000",
				shadowOffset: { width: 0, height: -3 },
				shadowOpacity: 0.125,
				shadowRadius: 12,
			}}
			enablePanDownToClose
			onClose={onDismiss}
			enableDynamicSizing={false}
		>
			{isFilesTab ? (
				<BottomSheetView className="flex-grow">
					{renderContent()}
				</BottomSheetView>
			) : (
				<BottomSheetScrollView contentContainerClassName="flex-grow">
					{renderContent()}
				</BottomSheetScrollView>
			)}
		</BottomSheet>
	);
}
