/**
 * ResizableSplit — thin wrapper around react-resizable-panels for web.
 *
 * Renders a draggable resize handle between two panels.
 * Persists sizes to localStorage via `storageKey`.
 * Falls back to a plain flex row/col on native (no handle).
 */

import type { ReactNode } from "react";
import { Platform, View } from "react-native";

export type ResizableSplitProps = {
	/** Direction of the split */
	direction: "horizontal" | "vertical";
	/** localStorage key to persist panel sizes */
	storageKey: string;
	/** Content for the first panel */
	first: ReactNode;
	/** Content for the second panel */
	second: ReactNode;
	/** Initial size of the first panel in percent (0–100). Default 20 */
	defaultFirstSize?: number;
	/** Minimum size of the first panel in percent. Default 8 */
	minFirstSize?: number;
	/** Maximum size of the first panel in percent. Default 50 */
	maxFirstSize?: number;
	/** Minimum size of the second panel in percent. Default 10 */
	minSecondSize?: number;
};

// ─── Web implementation ────────────────────────────────────────────────────

// react-resizable-panels is a DOM library — only load it on web.
// We use a require() to keep Metro from bundling it on native.
function ResizableSplitWeb(props: ResizableSplitProps) {
	// react-resizable-panels types are tricky with require()
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const rp =
		require("react-resizable-panels") as typeof import("react-resizable-panels");
	const Group = rp.Group as any;
	const Panel = rp.Panel as any;
	const Separator = rp.Separator as any;

	const {
		direction,
		storageKey,
		first,
		second,
		defaultFirstSize = 20,
		minFirstSize = 8,
		maxFirstSize = 50,
		minSecondSize = 10,
	} = props;

	const isHorizontal = direction === "horizontal";

	return (
		<Group
			direction={direction}
			autoSaveId={storageKey}
			style={{ display: "flex", flex: 1, width: "100%", height: "100%" }}
		>
			<Panel
				defaultSize={defaultFirstSize}
				minSize={minFirstSize}
				maxSize={maxFirstSize}
				style={{ overflow: "hidden", minWidth: 0, minHeight: 0 }}
			>
				{first}
			</Panel>

			<Separator
				style={{
					background: "transparent",
					flexShrink: 0,
					...(isHorizontal
						? { width: 8, cursor: "col-resize" }
						: { height: 8, cursor: "row-resize" }),
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					transition: "background 0.15s ease",
				}}
				className="resize-handle"
			>
				{/* Grip indicator - 3 dots */}
				<div
					style={{
						display: "flex",
						...(isHorizontal
							? { flexDirection: "column", gap: 3 }
							: { flexDirection: "row", gap: 3 }),
						alignItems: "center",
						justifyContent: "center",
						padding: 4,
						borderRadius: 4,
						transition: "background 0.15s ease",
					}}
					className="grip-dots"
				>
					{/* 3 dots */}
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							style={{
								width: 3,
								height: 3,
								borderRadius: "50%",
								background: "#5a5590",
								transition: "background 0.15s ease, transform 0.15s ease",
							}}
							className="grip-dot"
						/>
					))}
				</div>

				{/* CSS for hover effects */}
				<style>{`
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
				`}</style>
			</Separator>

			<Panel
				minSize={minSecondSize}
				style={{ overflow: "hidden", minWidth: 0, minHeight: 0 }}
			>
				{second}
			</Panel>
		</Group>
	);
}

// ─── Native fallback ───────────────────────────────────────────────────────

function ResizableSplitNative(props: ResizableSplitProps) {
	const { direction, first, second, defaultFirstSize = 20 } = props;
	const isHorizontal = direction === "horizontal";
	return (
		<View style={{ flex: 1, flexDirection: isHorizontal ? "row" : "column" }}>
			<View style={{ flex: defaultFirstSize / 100 }}>{first}</View>
			<View style={{ flex: 1 - defaultFirstSize / 100 }}>{second}</View>
		</View>
	);
}

// ─── Export ───────────────────────────────────────────────────────────────

export function ResizableSplit(props: ResizableSplitProps) {
	if (Platform.OS === "web") {
		return <ResizableSplitWeb {...props} />;
	}
	return <ResizableSplitNative {...props} />;
}
