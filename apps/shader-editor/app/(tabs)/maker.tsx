import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EditorConfigProvider, EditorProvider, StageArea, GraphEditor } from "@slopcade/editor";
import { EffectsGraphAdapter } from "@slopcade/shared/graph-adapters";
import { useMemo } from "react";

const dummyConfig = {
	trpc: {},
	chat: {
		useChatMessages: () => ({ messages: [] }),
		useSendMessage: () => ({
			sendMessage: async () => null,
			submitAnswer: async () => {},
			submitUserAnswer: async () => {},
			isSending: false,
			error: null,
		}),
		useStreamState: () => ({ currentThreadId: "" }),
		useThreadManagement: () => ({ switchThread: () => {} }),
		useChatEventSubscription: () => {},
		useChatEventNotify: () => () => {},
		ChatStreamProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	},
	getStorageItem: async () => null,
	setStorageItem: async () => {},
};

const dummyDefinition = {
	id: "shader-editor",
	name: "Shader Editor",
	version: "1.0.0",
	engineApiVersion: "1.0.0",
	prefabs: {},
	entities: [],
	rules: [],
	scripts: [],
	effects: [],
	camera: { zoom: 1 },
	world: {
		gravity: { x: 0, y: 9.8 },
		bounds: { width: 1000, height: 1000 },
		pixelsPerMeter: 100,
	},
};

export default function MakerScreen() {
	const adapter = useMemo(() => new EffectsGraphAdapter(), []);

	return (
		<SafeAreaView className="flex-1 bg-theme-background">
			<EditorConfigProvider config={dummyConfig as any}>
				<EditorProvider gameId="shader-editor" initialDefinition={dummyDefinition as any}>
					<View className="flex-1 flex-row">
						<View className="flex-1 border-r border-theme-border">
							<GraphEditor adapter={adapter} documentId="shader-graph" />
						</View>
						<View className="flex-1">
							<StageArea />
						</View>
					</View>
				</EditorProvider>
			</EditorConfigProvider>
		</SafeAreaView>
	);
}
