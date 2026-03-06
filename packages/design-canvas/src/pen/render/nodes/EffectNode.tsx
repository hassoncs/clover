import { Group, Rect, Shader, Skia, useClock } from "@shopify/react-native-skia";
import { rewriteGodotToSkSL } from "@slopcade/shared/effects";
import type { PenEffectNode } from "@slopcade/shared/types/pen";
import type React from "react";
import { useMemo } from "react";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import type { LayoutNode } from "../../layout";
import { buildNodeTransform } from "../nodeTransform";
interface NodeRendererProps {
	layoutNode: LayoutNode;
}

export function EffectNode({ layoutNode }: NodeRendererProps): React.ReactNode {
	const node = layoutNode.node as PenEffectNode;
	const { x, y, width, height } = layoutNode.rect;
	const opacity = node.opacity ?? 1;

	const clock = useClock();

	const { sksl, error } = useMemo(() => {
		if (!node.shaderCode) {
			return { sksl: null, error: "No shader code provided" };
		}
		try {
			const result = rewriteGodotToSkSL(node.shaderCode);
			return { sksl: result.sksl, error: null };
		} catch (e) {
			return { sksl: null, error: String(e) };
		}
	}, [node.shaderCode]);

	const runtimeEffect = useMemo(() => {
		if (!sksl) return null;
		const effect = Skia.RuntimeEffect.Make(sksl);
		if (!effect) {
			console.warn("Failed to compile SkSL shader");
			return null;
		}
		return effect;
	}, [sksl]);

	const isPlaying = node.playing ?? true;
	const accumulatedTime = useSharedValue(0);
	const lastTick = useSharedValue(-1);

	const uniforms = useDerivedValue(() => {
		const now = clock.value;
		if (lastTick.value === -1) {
			lastTick.value = now;
		}
		const dt = now - lastTick.value;
		lastTick.value = now;

		if (isPlaying) {
			accumulatedTime.value += dt;
		}

		return {
			...node.uniforms,
			iResolution: [width, height],
			iTime: accumulatedTime.value / 1000,
		};
	}, [node.uniforms, width, height, clock, isPlaying]);

	let content: React.ReactNode;

	if (error || !runtimeEffect) {
		// Fallback for invalid shader
		content = (
			<Rect x={0} y={0} width={width} height={height} color="rgba(255, 0, 0, 0.5)" />
		);
	} else {
		content = (
			<Rect x={0} y={0} width={width} height={height}>
				<Shader source={runtimeEffect} uniforms={uniforms} />
			</Rect>
		);
	}

	return (
		<Group transform={buildNodeTransform(x, y, width, height, node.flipX, node.flipY)} opacity={opacity}>
			{content}
		</Group>
	);
}
