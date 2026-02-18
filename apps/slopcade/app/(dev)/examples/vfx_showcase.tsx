import Slider from "@react-native-community/slider";
import type { GameDefinition } from "@slopcade/shared";
import type {
	CompiledPlan,
	EffectGraphSpec,
	EffectParamSchema,
	ParamValue,
} from "@slopcade/shared/effects";
import {
	compileGraph,
	getShaderEntry,
	getShaderGlsl,
	SHADER_REGISTRY,
} from "@slopcade/shared/effects";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GodotBridge } from "@slopcade/godot-bridge/types";
import type { ExampleMeta } from "@/lib/registry/types";
import { FullScreenHeader } from "@/components/FullScreenHeader";

export const metadata: ExampleMeta = {
	title: "VFX Showcase",
	description:
		"Visual effects demo: sprite shaders, post-processing, camera effects, and particles.",
};

const WORLD_BOUNDS = { width: 14, height: 18 };
const PIXELS_PER_METER = 50;

const GAME_DEFINITION: GameDefinition = {
	metadata: {
		id: "vfx-showcase",
		title: "VFX Showcase",
		description: "Visual effects demonstration",
		version: "1.0.0",
	},
	world: {
		gravity: { x: 0, y: -15 },
		pixelsPerMeter: PIXELS_PER_METER,
		bounds: WORLD_BOUNDS,
	},
	camera: { type: "fixed", zoom: 1 },
	prefabs: {
		box: {
			id: "box",
			visual: { type: "rect", width: 2, height: 2, color: "#4ECDC4" },
			physics: { bodyType: "dynamic", density: 1 },
			collider: {
				shape: "box",
				width: 2,
				height: 2,
				friction: 0.3,
				restitution: 0.3,
			},
		},
		circle: {
			id: "circle",
			visual: { type: "circle", radius: 1, color: "#FF6B6B" },
			physics: { bodyType: "dynamic", density: 1 },
			collider: { shape: "circle", radius: 1, friction: 0.3, restitution: 0.5 },
		},
		ground: {
			id: "ground",
			visual: { type: "rect", width: 14, height: 1, color: "#2C3E50" },
			physics: { bodyType: "static" },
			collider: {
				shape: "box",
				width: 14,
				height: 1,
				friction: 0.5,
				restitution: 0,
			},
		},
		wall: {
			id: "wall",
			visual: { type: "rect", width: 0.5, height: 18, color: "#2C3E50" },
			physics: { bodyType: "static" },
			collider: {
				shape: "box",
				width: 0.5,
				height: 18,
				friction: 0.5,
				restitution: 0.3,
			},
		},
	},
	entities: [
		{
			id: "ground",
			name: "Ground",
			prefab: "ground",
			transform: { x: 0, y: -8.5, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "wall-left",
			name: "Left Wall",
			prefab: "wall",
			transform: { x: -6.75, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "wall-right",
			name: "Right Wall",
			prefab: "wall",
			transform: { x: 6.75, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
		},
		{
			id: "box1",
			name: "Box 1",
			prefab: "box",
			transform: { x: -2, y: -5, angle: 0.1, scaleX: 1, scaleY: 1 },
		},
		{
			id: "box2",
			name: "Box 2",
			prefab: "box",
			transform: { x: 2, y: -5, angle: -0.1, scaleX: 1, scaleY: 1 },
		},
		{
			id: "circle1",
			name: "Circle 1",
			prefab: "circle",
			transform: { x: 0, y: -1, angle: 0, scaleX: 1, scaleY: 1 },
		},
	],
};

const PARTICLE_PRESETS = [
	"fire",
	"smoke",
	"sparks",
	"magic",
	"explosion",
	"confetti",
	"dust",
	"stars",
];

const SPRITE_SHADER_IDS = [
	"silhouette",
	"tint",
	"waveDistortion",
	"rimLight",
	"rainbow",
	"pixelate",
	"posterize",
	"outline",
	"innerGlow",
	"holographic",
	"glow",
	"dropShadow",
	"flash",
	"dissolve",
	"colorMatrix",
];

const POST_SHADER_IDS = [
	"underwater",
	"vignette",
	"thermalVision",
	"speedLines",
	"shockwave",
	"shimmer",
	"ripple",
	"scanlines",
	"oldFilm",
	"pixelateScreen",
	"motionBlur",
	"nightVision",
	"fogOfWar",
	"crt",
	"halftone",
	"glitch",
	"chromaticAberration",
	"colorGrading",
	"blur",
	"bloom",
	"ascii",
];

type EffectCategory = "sprite" | "post" | "camera" | "particles";

function buildEffectSpec(
	effectName: string,
	scope: "entity" | "screen",
	params: Record<string, ParamValue>,
): EffectGraphSpec {
	return {
		id: `${scope}-${effectName}`,
		version: "1.0.0",
		engineApiVersion: "2.0.0",
		scope,
		nodes: [
			{
				id: "fx",
				type: effectName,
				family: "filter",
				inputSlots: [{ name: "input", dataType: "texture", connectedTo: null }],
				params,
				outputTarget: {
					bufferId: "output",
					format: "rgba8",
					resolution: "full",
				},
				flags: { stateful: false, fusible: "never" },
			},
		],
		connections: [],
		feedbackEdges: [],
		lifecycle: { autoStart: true, stopMode: "freeze" },
	};
}

function compileEffectPlan(
	effectName: string,
	scope: "entity" | "screen",
	params: Record<string, ParamValue>,
): CompiledPlan | null {
	const spec = buildEffectSpec(effectName, scope, params);
	const result = compileGraph(spec);
	if (!result.success || !result.plan) return null;

	const glsl = getShaderGlsl(effectName);
	return {
		...result.plan,
		passes: result.plan.passes.map((p) => ({
			...p,
			shaderSource: glsl ? { glsl } : p.shaderSource,
		})),
	};
}

function getDefaultParams(effectName: string): Record<string, ParamValue> {
	const entry = getShaderEntry(effectName);
	if (!entry) return {};
	const defaults: Record<string, ParamValue> = {};
	for (const schema of entry.paramsSchema) {
		defaults[schema.key] = schema.defaultValue;
	}
	return defaults;
}

export default function VFXShowcaseExample() {
	const router = useRouter();
	const [bridge, setBridge] = useState<GodotBridge | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">(
		"loading",
	);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [GodotView, setGodotView] = useState<React.ComponentType<{
		style?: object;
	}> | null>(null);

	const activeCategoryRef = useRef<EffectCategory>("sprite");

	const [activeCategory, setActiveCategory] =
		useState<EffectCategory>("sprite");
	const [selectedSpriteEffect, setSelectedSpriteEffect] = useState("none");
	const [selectedPostEffect, setSelectedPostEffect] = useState("none");
	const [selectedParticle, setSelectedParticle] = useState("fire");
	const [selectedEntity, setSelectedEntity] = useState("box1");
	const [spriteParams, setSpriteParams] = useState<Record<string, ParamValue>>(
		{},
	);
	const [postParams, setPostParams] = useState<Record<string, ParamValue>>({});

	const spriteEffects = useMemo(
		() => SPRITE_SHADER_IDS.filter((id) => id in SHADER_REGISTRY),
		[],
	);

	const postEffects = useMemo(
		() => POST_SHADER_IDS.filter((id) => id in SHADER_REGISTRY),
		[],
	);

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
				setErrorMsg(
					err instanceof Error ? err.message : "Failed to load Godot module",
				);
			});

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!bridge || !GodotView) return;

		let mounted = true;

		bridge
			.initialize()
			.then(() => {
				if (!mounted) return;
				return bridge.loadGame(GAME_DEFINITION);
			})
			.then(() => {
				if (!mounted) return;
				setStatus("ready");
			})
			.catch((err) => {
				if (!mounted) return;
				setStatus("error");
				setErrorMsg(
					err instanceof Error ? err.message : "Failed to initialize",
				);
			});

		return () => {
			mounted = false;
		};
	}, [bridge, GodotView]);

	const applySpriteEffect = useCallback(
		async (effectName: string) => {
			if (!bridge || status !== "ready") return;
			setSelectedSpriteEffect(effectName);

			if (effectName === "none") {
				await bridge.stop();
				await bridge.clearGraph();
				setSpriteParams({});
			} else {
				const defaults = getDefaultParams(effectName);
				setSpriteParams(defaults);
				const plan = compileEffectPlan(effectName, "entity", defaults);
				if (plan) {
					await bridge.applyGraph(plan);
					await bridge.start();
				}
			}
		},
		[bridge, status],
	);

	const applyPostEffect = useCallback(
		async (effectName: string) => {
			if (!bridge || status !== "ready") return;
			setSelectedPostEffect(effectName);

			if (effectName === "none") {
				await bridge.stop();
				await bridge.clearGraph();
				setPostParams({});
			} else {
				const defaults = getDefaultParams(effectName);
				setPostParams(defaults);
				const plan = compileEffectPlan(effectName, "screen", defaults);
				if (plan) {
					await bridge.applyGraph(plan);
					await bridge.start();
				}
			}
		},
		[bridge, status],
	);

	const updateSpriteParam = useCallback(
		(key: string, value: ParamValue) => {
			setSpriteParams((prev) => {
				const next: Record<string, ParamValue> = { ...prev, [key]: value };
				bridge?.effectsUpdateParams(
					"fx",
					next as Record<string, number | boolean | string>,
				);
				return next;
			});
		},
		[bridge],
	);

	const updatePostParam = useCallback(
		(key: string, value: ParamValue) => {
			setPostParams((prev) => {
				const next: Record<string, ParamValue> = { ...prev, [key]: value };
				bridge?.effectsUpdateParams(
					"fx",
					next as Record<string, number | boolean | string>,
				);
				return next;
			});
		},
		[bridge],
	);

	const triggerCameraEffect = useCallback(
		(effect: "shake" | "zoom" | "flash" | "shockwave") => {
			if (!bridge || status !== "ready") return;

			if (effect === "shake") {
				bridge.screenShake(0.8, 0.4);
			} else if (effect === "zoom") {
				bridge.zoomPunch(0.2, 0.25);
			} else if (effect === "flash") {
				bridge.flashScreen([1, 1, 1, 1], 0.15);
			} else if (effect === "shockwave") {
				bridge.triggerShockwave(7, 9, 3.0);
			}
		},
		[bridge, status],
	);

	useEffect(() => {
		activeCategoryRef.current = activeCategory;
	}, [activeCategory]);

	useEffect(() => {
		if (!bridge || status !== "ready") return;

		const unsubscribe = bridge.onInputEvent((type, x, y) => {
			if (type === "tap" && activeCategoryRef.current === "particles") {
				bridge.spawnParticlePreset(selectedParticle, x, y);
			}
		});

		return unsubscribe;
	}, [bridge, status, selectedParticle]);

	const renderParamControl = (schema: EffectParamSchema, isPost: boolean) => {
		const currentParams = isPost ? postParams : spriteParams;
		const updateFn = isPost ? updatePostParam : updateSpriteParam;
		const value = currentParams[schema.key] ?? schema.defaultValue;
		const ui = schema.ui;

		if (schema.type === "int" && ui?.options) {
			return (
				<View key={schema.key} className="mb-3">
					<Text className="text-gray-300 text-xs mb-1">
						{ui.displayName ?? schema.key}
					</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						{ui.options.map((opt, idx) => (
							<Pressable
								key={opt}
								onPress={() => updateFn(schema.key, idx)}
								className={`px-2 py-1 mr-1 rounded ${value === idx ? "bg-cyan-700" : "bg-gray-700"}`}
							>
								<Text
									className={`text-xs ${value === idx ? "text-white" : "text-gray-400"}`}
								>
									{opt}
								</Text>
							</Pressable>
						))}
					</ScrollView>
				</View>
			);
		}

		if (schema.type === "float" || schema.type === "int") {
			const numValue = typeof value === "number" ? value : Number(value);
			return (
				<View key={schema.key} className="mb-3">
					<View className="flex-row justify-between mb-1">
						<Text className="text-gray-300 text-xs">
							{ui?.displayName ?? schema.key}
						</Text>
						<Text className="text-cyan-400 text-xs font-mono">
							{numValue.toFixed(2)}
						</Text>
					</View>
					<Slider
						style={{ width: "100%", height: 32 }}
						minimumValue={ui?.min ?? 0}
						maximumValue={ui?.max ?? 1}
						step={ui?.step ?? 0.01}
						value={numValue}
						onValueChange={(v) => updateFn(schema.key, v)}
						minimumTrackTintColor="#22d3ee"
						maximumTrackTintColor="#4b5563"
						thumbTintColor="#22d3ee"
					/>
				</View>
			);
		}

		if (schema.type === "bool") {
			return (
				<View
					key={schema.key}
					className="flex-row justify-between items-center mb-3"
				>
					<Text className="text-gray-300 text-xs">
						{ui?.displayName ?? schema.key}
					</Text>
					<Switch
						value={Boolean(value)}
						onValueChange={(v) => updateFn(schema.key, v)}
						trackColor={{ false: "#4b5563", true: "#0e7490" }}
						thumbColor={value ? "#22d3ee" : "#f4f4f5"}
					/>
				</View>
			);
		}

		return null;
	};

	const activeEffectName =
		activeCategory === "sprite" ? selectedSpriteEffect : selectedPostEffect;
	const activeEntry =
		activeEffectName !== "none" ? getShaderEntry(activeEffectName) : null;

	const renderCategoryTabs = () => (
		<View className="flex-row bg-black/60 px-2 py-1">
			{(["sprite", "post", "camera", "particles"] as EffectCategory[]).map(
				(cat) => (
					<Pressable
						key={cat}
						onPress={() => setActiveCategory(cat)}
						className={`px-3 py-2 mr-1 rounded ${activeCategory === cat ? "bg-cyan-600" : "bg-gray-700"}`}
					>
						<Text className="text-white text-xs font-semibold capitalize">
							{cat}
						</Text>
					</Pressable>
				),
			)}
		</View>
	);

	const renderSpriteControls = () => (
		<View className="p-2">
			<View className="flex-row mb-2">
				<Text className="text-gray-400 text-xs mr-2">Entity:</Text>
				{["box1", "box2", "circle1"].map((ent) => (
					<Pressable
						key={ent}
						onPress={() => setSelectedEntity(ent)}
						className={`px-2 py-1 mr-1 rounded ${selectedEntity === ent ? "bg-cyan-600" : "bg-gray-700"}`}
					>
						<Text className="text-white text-xs">{ent}</Text>
					</Pressable>
				))}
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className="mb-2"
			>
				<Pressable
					onPress={() => applySpriteEffect("none")}
					className={`px-3 py-2 mr-1 rounded ${selectedSpriteEffect === "none" ? "bg-green-600" : "bg-gray-700"}`}
				>
					<Text className="text-white text-xs">none</Text>
				</Pressable>
				{spriteEffects.map((effect) => (
					<Pressable
						key={effect}
						onPress={() => applySpriteEffect(effect)}
						className={`px-3 py-2 mr-1 rounded ${selectedSpriteEffect === effect ? "bg-green-600" : "bg-gray-700"}`}
					>
						<Text className="text-white text-xs">{effect}</Text>
					</Pressable>
				))}
			</ScrollView>
			{activeEntry && (
				<ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
					{activeEntry.paramsSchema.map((schema) =>
						renderParamControl(schema, false),
					)}
				</ScrollView>
			)}
		</View>
	);

	const renderPostControls = () => (
		<View className="p-2">
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className="mb-2"
			>
				<Pressable
					onPress={() => applyPostEffect("none")}
					className={`px-3 py-2 mr-1 rounded ${selectedPostEffect === "none" ? "bg-purple-600" : "bg-gray-700"}`}
				>
					<Text className="text-white text-xs">none</Text>
				</Pressable>
				{postEffects.map((effect) => (
					<Pressable
						key={effect}
						onPress={() => applyPostEffect(effect)}
						className={`px-3 py-2 mr-1 rounded ${selectedPostEffect === effect ? "bg-purple-600" : "bg-gray-700"}`}
					>
						<Text className="text-white text-xs">{effect}</Text>
					</Pressable>
				))}
			</ScrollView>
			{activeEntry && activeCategory === "post" && (
				<ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
					{activeEntry.paramsSchema.map((schema) =>
						renderParamControl(schema, true),
					)}
				</ScrollView>
			)}
		</View>
	);

	const renderCameraControls = () => (
		<View className="flex-row p-2">
			{(["shake", "zoom", "flash", "shockwave"] as const).map((effect) => (
				<Pressable
					key={effect}
					onPress={() => triggerCameraEffect(effect)}
					className="px-4 py-2 mr-2 rounded bg-orange-600"
				>
					<Text className="text-white text-xs font-semibold capitalize">
						{effect}
					</Text>
				</Pressable>
			))}
		</View>
	);

	const renderParticleControls = () => (
		<View className="p-2">
			<Text className="text-gray-400 text-xs mb-2">
				Tap screen to spawn particles:
			</Text>
			<ScrollView horizontal showsHorizontalScrollIndicator={false}>
				{PARTICLE_PRESETS.map((preset) => (
					<Pressable
						key={preset}
						onPress={() => setSelectedParticle(preset)}
						className={`px-3 py-2 mr-1 rounded ${selectedParticle === preset ? "bg-red-600" : "bg-gray-700"}`}
					>
						<Text className="text-white text-xs">{preset}</Text>
					</Pressable>
				))}
			</ScrollView>
		</View>
	);

	if (status === "error") {
		return (
			<SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
				<Text className="text-red-400 text-lg mb-4">{errorMsg}</Text>
				<Pressable
					onPress={() => router.back()}
					className="py-2 px-4 bg-gray-700 rounded-lg"
				>
					<Text className="text-white font-semibold">← Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-gray-900" edges={["top"]}>
			<FullScreenHeader
				title="VFX Showcase"
				rightContent={
					status === "loading" ? (
						<Text className="text-yellow-400 text-xs">Loading...</Text>
					) : null
				}
			/>

			<View className="flex-1">
				<View className="flex-1">
					{GodotView ? (
						<GodotView style={{ flex: 1 }} />
					) : (
						<View className="flex-1 items-center justify-center">
							<Text className="text-white">Loading Godot...</Text>
						</View>
					)}
				</View>

				<View className="bg-black/80">
					{renderCategoryTabs()}
					{activeCategory === "sprite" && renderSpriteControls()}
					{activeCategory === "post" && renderPostControls()}
					{activeCategory === "camera" && renderCameraControls()}
					{activeCategory === "particles" && renderParticleControls()}
				</View>
			</View>
		</SafeAreaView>
	);
}
