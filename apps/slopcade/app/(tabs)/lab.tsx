import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EXAMPLES: { id: string; title: string; description: string }[] = [
	{
		id: "camera_feed",
		title: "Camera Feed",
		description: "Live camera feed on a Godot entity",
	},
	{
		id: "draggable_cubes",
		title: "Draggable Cubes",
		description: "Drag physics cubes around the screen",
	},
	{
		id: "dynamic_images",
		title: "Dynamic Images",
		description: "Load images onto entities at runtime",
	},
	{
		id: "dynamic_shader",
		title: "Dynamic Shader",
		description: "Runtime shader effect experiments",
	},
	{
		id: "glb_viewer",
		title: "GLB Viewer",
		description: "Load and display 3D GLB models",
	},
	{
		id: "overlay_demo",
		title: "Overlay Demo",
		description: "React Native overlay on Godot scene",
	},
	{
		id: "overlay_test",
		title: "Overlay Test",
		description: "Test overlay positioning and interaction",
	},
	{
		id: "paint",
		title: "Paint",
		description: "Freeform painting on the Godot canvas",
	},
	{
		id: "scripted_game",
		title: "Scripted Game",
		description: "Game driven by script modules",
	},
	{
		id: "text_effects_lab",
		title: "Text Effects Lab",
		description: "Animated text effect experiments",
	},
	{
		id: "text_grid",
		title: "Text Grid",
		description: "Grid-based text rendering",
	},
	{
		id: "texture_button",
		title: "Texture Button",
		description: "Buttons with texture sprites",
	},
	{
		id: "themed_ui_gallery",
		title: "Themed UI Gallery",
		description: "Gallery of themed UI components",
	},
	{
		id: "three_d_scene",
		title: "3D Scene",
		description: "Basic 3D scene rendering",
	},
	{
		id: "ui_components",
		title: "UI Components",
		description: "Godot UI component showcase",
	},
	{
		id: "vfx_showcase",
		title: "VFX Showcase",
		description: "Visual effects showcase",
	},
];

export default function DemosScreen() {
	return (
		<SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
			<FlatList
				data={EXAMPLES}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.container}
				ListHeaderComponent={
					<Text className="text-gray-600 mb-4">
						Godot physics experiments for development testing.
					</Text>
				}
				renderItem={({ item }) => (
					<Link href={`/(dev)/examples/${item.id}`} asChild>
						<Pressable className="bg-white p-4 rounded-xl border border-gray-200 mb-3 active:bg-gray-100">
							<Text className="text-lg font-semibold text-gray-800">
								{item.title}
							</Text>
							<Text className="text-gray-500 mt-1">{item.description}</Text>
						</Pressable>
					</Link>
				)}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
	},
});
