import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
const PenRendererImpl = lazy(() => import("./PenRendererImpl"));
function PenRenderer(props) {
    return (_jsx(Suspense, { fallback: null, children: _jsx(PenRendererImpl, { ...props }) }));
}
export { PenRenderer };
export default PenRenderer;
//# sourceMappingURL=PenRenderer.js.map