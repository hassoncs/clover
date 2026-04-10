import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { BackdropFilter, Blur, Shadow } from "@shopify/react-native-skia";
export function PenEffectsRenderer({ effects }) {
    if (!effects || effects.length === 0)
        return null;
    const elements = [];
    for (const effect of effects) {
        if (effect.enabled === false)
            continue;
        if (effect.shadow && effect.shadow.enabled !== false) {
            const s = effect.shadow;
            elements.push(_jsx(Shadow, { dx: s.offsetX, dy: s.offsetY, blur: s.blur, color: s.color, inner: s.inner ?? false }, `shadow-${elements.length}`));
        }
        if (effect.blur != null) {
            elements.push(_jsx(Blur, { blur: effect.blur / 2, mode: "clamp" }, `blur-${elements.length}`));
        }
        if (effect.background_blur != null) {
            elements.push(_jsx(BackdropFilter, { filter: _jsx(Blur, { blur: effect.background_blur / 2, mode: "clamp" }) }, `bg-blur-${elements.length}`));
        }
    }
    return elements.length > 0 ? _jsx(_Fragment, { children: elements }) : null;
}
//# sourceMappingURL=effects.js.map