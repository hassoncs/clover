import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DashPathEffect, Group, Paint, Rect } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { useDerivedValue, useSharedValue, withRepeat, withTiming, } from "react-native-reanimated";
const FRESH_THRESHOLD_MS = 2000;
const BORDER_COLOR = "#06b6d4";
const BORDER_WIDTH = 2;
const DASH_TOTAL = 20;
export function BuildChrome({ layoutNode, children, }) {
    const node = layoutNode.node;
    const { x, y, width, height } = layoutNode.rect;
    const isFresh = typeof node.createdAt === "number" &&
        Date.now() - node.createdAt < FRESH_THRESHOLD_MS;
    const scale = useSharedValue(isFresh ? 0.985 : 1);
    const opacity = useSharedValue(isFresh ? 0 : 1);
    const dashPhase = useSharedValue(0);
    const borderOpacity = useSharedValue(isFresh ? 0.85 : 0);
    useEffect(() => {
        if (!isFresh)
            return;
        scale.value = withTiming(1, { duration: 400 });
        opacity.value = withTiming(1, { duration: 300 });
        dashPhase.value = withRepeat(withTiming(DASH_TOTAL, { duration: 400 }), -1, false);
        const timer = setTimeout(() => {
            borderOpacity.value = withTiming(0, { duration: 200 });
        }, 1800);
        return () => clearTimeout(timer);
    }, [isFresh, scale, opacity, dashPhase, borderOpacity]);
    const cx = x + width / 2;
    const cy = y + height / 2;
    const transform = useDerivedValue(() => [
        { translateX: cx },
        { translateY: cy },
        { scale: scale.value },
        { translateX: -cx },
        { translateY: -cy },
    ]);
    if (!isFresh) {
        return _jsx(_Fragment, { children: children });
    }
    return (_jsxs(Group, { transform: transform, opacity: opacity, children: [children, _jsx(Group, { opacity: borderOpacity, children: _jsx(Rect, { x: x - 1, y: y - 1, width: width + 2, height: height + 2, color: "transparent", children: _jsx(Paint, { style: "stroke", strokeWidth: BORDER_WIDTH, color: BORDER_COLOR, children: _jsx(DashPathEffect, { intervals: [6, 4], phase: dashPhase }) }) }) })] }));
}
//# sourceMappingURL=BuildChrome.js.map