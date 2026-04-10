import { jsx as _jsx } from "react/jsx-runtime";
import { Group, Rect, Shader, Skia, useClock } from "@shopify/react-native-skia";
import { rewriteGodotToSkSL } from "@slopcade/shared/effects";
import { useMemo } from "react";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { buildNodeTransform } from "../nodeTransform";
export function EffectNode({ layoutNode }) {
    const node = layoutNode.node;
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
        }
        catch (e) {
            return { sksl: null, error: String(e) };
        }
    }, [node.shaderCode]);
    const runtimeEffect = useMemo(() => {
        if (!sksl)
            return null;
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
    let content;
    if (error || !runtimeEffect) {
        // Fallback for invalid shader
        content = (_jsx(Rect, { x: 0, y: 0, width: width, height: height, color: "rgba(255, 0, 0, 0.5)" }));
    }
    else {
        content = (_jsx(Rect, { x: 0, y: 0, width: width, height: height, children: _jsx(Shader, { source: runtimeEffect, uniforms: uniforms }) }));
    }
    return (_jsx(Group, { transform: buildNodeTransform(x, y, width, height, node.flipX, node.flipY), opacity: opacity, children: content }));
}
//# sourceMappingURL=EffectNode.js.map