import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@slopcade/theme";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatTextArea } from "@/components/create-game/ChatTextArea";
import type { EditorTab } from "./EditorProvider";

const TOOL_TABS: {
	id: EditorTab;
	icon: string;
	ionicon: keyof typeof Ionicons.glyphMap;
	label: string;
}[] = [
	{ id: "files", icon: "📁", ionicon: "folder-outline", label: "Files" },
	{ id: "gallery", icon: "🖼", ionicon: "images-outline", label: "Images" },
	{
		id: "assets",
		icon: "🎵",
		ionicon: "musical-notes-outline",
		label: "Sounds",
	},
	{
		id: "properties",
		icon: "⚙️",
		ionicon: "color-palette-outline",
		label: "Colors",
	},
	{ id: "layers", icon: "🔧", ionicon: "options-outline", label: "Tweaks" },
	{ id: "debug", icon: "🐛", ionicon: "bug-outline", label: "Debug" },
];

interface EditorToolbarProps {
	onSendMessage: (text: string) => void;
	onTabPress: (tabId: EditorTab) => void;
	isSending: boolean;
}

export function EditorToolbar({
	onSendMessage,
	onTabPress,
	isSending,
}: EditorToolbarProps) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="bg-theme-background border-t border-theme-border pt-3 px-4"
			style={{ paddingBottom: Math.max(insets.bottom, 16) }}
		>
			<ChatTextArea
				onSend={onSendMessage}
				isSubmitting={isSending}
				variant="toolbar"
				enableSpeechToText
			/>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerClassName="flex-row gap-6 px-1 pb-1"
				className="grow-0"
			>
				{TOOL_TABS.map((tab) => (
					<Pressable
						key={tab.id}
						className="items-center justify-center gap-1 min-w-[56px] active:opacity-70"
						onPress={() => onTabPress(tab.id)}
						accessibilityRole="button"
						accessibilityLabel={tab.label}
					>
						<View className="w-10 h-10 rounded-full bg-theme-surface items-center justify-center border border-theme-border">
							<Ionicons
								name={tab.ionicon}
								size={24}
								color={tokens.semantic.colors.text.secondary}
							/>
						</View>
						<Text className="text-[11px] text-theme-text-muted text-center font-medium">
							{tab.label}
						</Text>
					</Pressable>
				))}
			</ScrollView>
		</View>
	);
}
