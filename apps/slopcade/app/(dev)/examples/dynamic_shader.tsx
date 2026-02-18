import type { GameDefinition } from "@slopcade/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import type { GodotBridge } from "@slopcade/godot-bridge/types";
import type { ExampleMeta } from "@/lib/registry/types";

export const metadata: ExampleMeta = {
	title: "Shader Authoring",
	description: "Write GLSL shaders with live compilation and error reporting",
};

const WORLD_BOUNDS = { width: 10, height: 10 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
	metadata: {
		id: "dynamic-shader-test",
		title: "Dynamic Shader Test",
		description: "Test dynamic shader generation",
		version: "1.0.0",
	},
	world: {
		gravity: { x: 0, y: 0 },
		pixelsPerMeter: PIXELS_PER_METER,
		bounds: WORLD_BOUNDS,
	},
	camera: { type: "fixed", zoom: 1 },
	prefabs: {
		testBox: {
			id: "testBox",
			visual: { type: "rect", width: 4, height: 4, color: "#4ECDC4" },
			physics: { bodyType: "static" },
			collider: {
				shape: "box",
				width: 4,
				height: 4,
				friction: 0,
				restitution: 0,
			},
		},
	},
	entities: [
		{
			id: "test-entity",
			name: "Test Entity",
			prefab: "testBox",
			transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
		},
	],
};

const VALID_SHADER = `shader_type canvas_item;

uniform vec4 color_shift : source_color = vec4(1.0, 0.5, 0.0, 1.0);
uniform float intensity : hint_range(0.0, 1.0) = 0.5;

void fragment() {
    vec4 tex = texture(TEXTURE, UV);
    COLOR = mix(tex, color_shift * tex.a, intensity);
}`;

const INVALID_SHADER_MISSING_TYPE = `uniform vec4 color : source_color = vec4(1.0, 0.0, 0.0, 1.0);

void fragment() {
    COLOR = color;
}`;

const INVALID_SHADER_MISSING_FRAGMENT = `shader_type canvas_item;

uniform vec4 color : source_color = vec4(1.0, 0.0, 0.0, 1.0);
`;

const INVALID_SHADER_SYNTAX_ERROR = `shader_type canvas_item;

void fragment() {
    COLOR = vec4(1.0 0.0, 0.0, 1.0); // Missing comma
}`;

const PRESET_SHADERS = [
	{ name: "Valid: Color Shift", code: VALID_SHADER, valid: true },
	{
		name: "Invalid: Missing shader_type",
		code: INVALID_SHADER_MISSING_TYPE,
		valid: false,
	},
	{
		name: "Invalid: Missing fragment()",
		code: INVALID_SHADER_MISSING_FRAGMENT,
		valid: false,
	},
	{
		name: "Invalid: Syntax Error",
		code: INVALID_SHADER_SYNTAX_ERROR,
		valid: false,
	},
];

export default function DynamicShaderExample() {
	const [bridge, setBridge] = useState<GodotBridge | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">(
		"loading",
	);
	const [GodotView, setGodotView] = useState<React.ComponentType<{
		style?: object;
	}> | null>(null);
	const [shaderCode, setShaderCode] = useState(VALID_SHADER);
	const [error, setError] = useState<string | null>(null);
	const [shaderApplied, setShaderApplied] = useState(false);
	const gameLoadedRef = useRef(false);

	useEffect(() => {
		let mounted = true;

		import("@slopcade/godot-bridge")
			.then(async (mod) => {
				if (!mounted) return;
				const newBridge = await mod.createGodotBridge();
				if (!mounted) return;
				setBridge(newBridge);
				setGodotView(() => mod.GodotView);
			})
			.catch((err) => {
				if (!mounted) return;
				setStatus("error");
				console.error("Failed to load Godot module:", err);
			});

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!bridge || gameLoadedRef.current) return;

		const initGame = async () => {
			try {
				await bridge.initialize();
				await bridge.loadGame(GAME_DEFINITION);
				gameLoadedRef.current = true;
				setStatus("ready");
			} catch (err) {
				setStatus("error");
				console.error("Failed to init game:", err);
			}
		};

		initGame();

		return () => {
			bridge.dispose();
		};
	}, [bridge]);

	const handleCompileAndApply = useCallback(async () => {
		if (!bridge || status !== "ready") return;

		setError(null);

		try {
			bridge.applySpriteEffect("test-entity", "custom", { shader: shaderCode });
			setShaderApplied(true);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			setError(errorMsg);
			console.error("Failed to apply shader:", err);
		}
	}, [bridge, status, shaderCode]);

	const handleClearShader = useCallback(() => {
		if (!bridge || status !== "ready") return;

		try {
			bridge.clearSpriteEffect("test-entity");
			setShaderApplied(false);
			setError(null);
		} catch (err) {
			console.error("Failed to clear shader:", err);
		}
	}, [bridge, status]);

	const handleSelectPreset = useCallback(
		(preset: (typeof PRESET_SHADERS)[number]) => {
			setShaderCode(preset.code);
		},
		[],
	);

	const handleReset = useCallback(() => {
		setShaderCode(VALID_SHADER);
		setError(null);
	}, []);

	return (
		<View style={styles.container}>
			<View style={styles.canvasContainer}>
				{GodotView && <GodotView style={{ flex: 1 }} />}

				{status === "loading" && (
					<View style={styles.loadingOverlay}>
						<Text style={styles.loadingText}>Loading Godot...</Text>
					</View>
				)}
			</View>

			<View style={styles.controlPanel}>
				<Text style={styles.title}>Shader Authoring</Text>
				<Text style={styles.subtitle}>
					Write GLSL shaders with live compilation and error reporting
				</Text>

				<Text style={styles.sectionTitle}>Shader Presets</Text>
				<ScrollView style={styles.presetsContainer} nestedScrollEnabled>
					{PRESET_SHADERS.map((preset) => (
						<Pressable
							key={preset.name}
							onPress={() => handleSelectPreset(preset)}
							style={({ pressed }) => [
								styles.presetButton,
								{ backgroundColor: pressed ? "#333" : "#222" },
								{ borderLeftColor: preset.valid ? "#4c4" : "#d44" },
							]}
						>
							<Text style={styles.presetText}>{preset.name}</Text>
						</Pressable>
					))}
				</ScrollView>

				<Text style={styles.sectionTitle}>Shader Code</Text>
				<ScrollView style={styles.editorContainer} nestedScrollEnabled>
					<TextInput
						style={styles.editor}
						value={shaderCode}
						onChangeText={setShaderCode}
						multiline
						autoCapitalize="none"
						autoCorrect={false}
						spellCheck={false}
						placeholder="Enter GLSL shader code..."
						placeholderTextColor="#666"
					/>
				</ScrollView>

				{error && (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				<View style={styles.buttonRow}>
					<Pressable
						onPress={handleCompileAndApply}
						disabled={status !== "ready"}
						style={[
							styles.button,
							styles.applyButton,
							status !== "ready" && styles.buttonDisabled,
						]}
					>
						<Text style={styles.buttonText}>Compile & Apply</Text>
					</Pressable>

					{shaderApplied && (
						<Pressable
							onPress={handleClearShader}
							disabled={status !== "ready"}
							style={[
								styles.button,
								styles.clearButton,
								status !== "ready" && styles.buttonDisabled,
							]}
						>
							<Text style={styles.buttonText}>Clear</Text>
						</Pressable>
					)}

					<Pressable
						onPress={handleReset}
						disabled={status !== "ready"}
						style={[
							styles.button,
							styles.resetButton,
							status !== "ready" && styles.buttonDisabled,
						]}
					>
						<Text style={styles.buttonText}>Reset</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1a1a2e",
	},
	canvasContainer: {
		flex: 1,
		flexShrink: 1,
	},
	loadingOverlay: {
		position: "absolute",
		inset: 0,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	loadingText: {
		color: "#fff",
		fontSize: 16,
	},
	controlPanel: {
		backgroundColor: "#2a2a3e",
		borderTopWidth: 1,
		borderTopColor: "#444",
		paddingTop: 12,
		paddingHorizontal: 16,
		paddingBottom: 16,
		maxHeight: "50%",
	},
	title: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#fff",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 12,
		color: "#aaa",
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#fff",
		marginBottom: 8,
		marginTop: 8,
	},
	presetsContainer: {
		maxHeight: 100,
		marginBottom: 8,
	},
	presetButton: {
		padding: 8,
		borderRadius: 4,
		marginBottom: 4,
		borderLeftWidth: 3,
	},
	presetText: {
		color: "#fff",
		fontSize: 12,
	},
	editorContainer: {
		backgroundColor: "#1e1e2e",
		borderRadius: 6,
		borderWidth: 1,
		borderColor: "#444",
		maxHeight: 200,
		marginBottom: 12,
	},
	editor: {
		fontFamily: "monospace",
		fontSize: 12,
		color: "#f8f8f2",
		padding: 12,
		minHeight: 150,
	},
	errorContainer: {
		backgroundColor: "#d44",
		borderRadius: 4,
		padding: 8,
		marginBottom: 12,
	},
	errorText: {
		color: "#fff",
		fontSize: 12,
		fontFamily: "monospace",
	},
	buttonRow: {
		flexDirection: "row",
		gap: 8,
	},
	button: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
	},
	applyButton: {
		backgroundColor: "#4c4",
		borderWidth: 1,
		borderColor: "#393",
	},
	clearButton: {
		backgroundColor: "#d44",
		borderWidth: 1,
		borderColor: "#a22",
	},
	resetButton: {
		backgroundColor: "#666",
		borderWidth: 1,
		borderColor: "#444",
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	buttonText: {
		fontWeight: "bold",
		color: "#fff",
		fontSize: 14,
	},
});
