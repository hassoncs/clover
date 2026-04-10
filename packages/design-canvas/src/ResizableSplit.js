import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Platform, View } from "react-native";
// ─── Web implementation ────────────────────────────────────────────────────
// react-resizable-panels is a DOM library — only load it on web.
// We use a require() to keep Metro from bundling it on native.
function ResizableSplitWeb(props) {
    // react-resizable-panels types are tricky with require()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rp = require("react-resizable-panels");
    const Group = rp.Group;
    const Panel = rp.Panel;
    const Separator = rp.Separator;
    const { direction, storageKey, first, second, defaultFirstSize = 20, minFirstSize = 8, maxFirstSize = 50, minSecondSize = 10, } = props;
    const isHorizontal = direction === "horizontal";
    return (_jsxs(Group, { direction: direction, autoSaveId: storageKey, style: { display: "flex", flex: 1, width: "100%", height: "100%" }, children: [_jsx(Panel, { defaultSize: defaultFirstSize, minSize: minFirstSize, maxSize: maxFirstSize, style: { overflow: "hidden", minWidth: 0, minHeight: 0 }, children: first }), _jsxs(Separator, { style: {
                    background: "transparent",
                    flexShrink: 0,
                    ...(isHorizontal
                        ? { width: 8, cursor: "col-resize" }
                        : { height: 8, cursor: "row-resize" }),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.15s ease",
                }, className: "resize-handle", children: [_jsx("div", { style: {
                            display: "flex",
                            ...(isHorizontal
                                ? { flexDirection: "column", gap: 3 }
                                : { flexDirection: "row", gap: 3 }),
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 4,
                            borderRadius: 4,
                            transition: "background 0.15s ease",
                        }, className: "grip-dots", children: [0, 1, 2].map((i) => (_jsx("div", { style: {
                                width: 3,
                                height: 3,
                                borderRadius: "50%",
                                background: "#5a5590",
                                transition: "background 0.15s ease, transform 0.15s ease",
                            }, className: "grip-dot" }, i))) }), _jsx("style", { children: `
					.resize-handle:hover {
						background: rgba(99, 102, 241, 0.1) !important;
					}
					.resize-handle:hover .grip-dots {
						background: rgba(99, 102, 241, 0.15);
					}
					.resize-handle:active {
						background: rgba(99, 102, 241, 0.2) !important;
					}
					.resize-handle:active .grip-dot {
						background: #818cf8 !important;
						transform: scale(1.2);
					}
					.resize-handle:hover .grip-dot {
						background: #7c71c0;
					}
				` })] }), _jsx(Panel, { minSize: minSecondSize, style: { overflow: "hidden", minWidth: 0, minHeight: 0 }, children: second })] }));
}
// ─── Native fallback ───────────────────────────────────────────────────────
function ResizableSplitNative(props) {
    const { direction, first, second, defaultFirstSize = 20 } = props;
    const isHorizontal = direction === "horizontal";
    return (_jsxs(View, { style: { flex: 1, flexDirection: isHorizontal ? "row" : "column" }, children: [_jsx(View, { style: { flex: defaultFirstSize / 100 }, children: first }), _jsx(View, { style: { flex: 1 - defaultFirstSize / 100 }, children: second })] }));
}
// ─── Export ───────────────────────────────────────────────────────────────
export function ResizableSplit(props) {
    if (Platform.OS === "web") {
        return _jsx(ResizableSplitWeb, { ...props });
    }
    return _jsx(ResizableSplitNative, { ...props });
}
//# sourceMappingURL=ResizableSplit.js.map