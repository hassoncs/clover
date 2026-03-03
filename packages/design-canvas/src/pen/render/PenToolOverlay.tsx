import {
	Circle,
	DashPathEffect,
	Group,
	Paint,
	Path,
} from "@shopify/react-native-skia";
import type React from "react";
import type { PenAnchor, PenDrawingState } from "../../tools/penToolState";
import { buildPathGeometry } from "../../tools/penToolState";

const CURVE_COLOR = "#818cf8";
const PREVIEW_COLOR = "#818cf8";
const ANCHOR_FILL = "#ffffff";
const ANCHOR_RADIUS = 4;
const HANDLE_RADIUS = 3;
const CURSOR_RADIUS = 4;

interface Props {
	drawingState: PenDrawingState;
}

export function PenToolOverlay({ drawingState }: Props): React.ReactNode {
	const { anchors, cursorDocX, cursorDocY, isDraggingHandle } = drawingState;

	const committedPath = anchors.length >= 2 ? buildPathGeometry(anchors, false) : null;

	let previewPath: string | null = null;
	if (anchors.length > 0 && cursorDocX !== null && cursorDocY !== null && !isDraggingHandle) {
		const last = anchors[anchors.length - 1];
		previewPath = buildPathGeometry(
			[
				last,
				{
					docX: cursorDocX,
					docY: cursorDocY,
					handleInDocX: cursorDocX,
					handleInDocY: cursorDocY,
					handleOutDocX: cursorDocX,
					handleOutDocY: cursorDocY,
				},
			],
			false,
		);
	}

	return (
		<Group>
			{/* Committed path segments */}
			{committedPath && (
				<Path path={committedPath} color="transparent">
					<Paint
						style="stroke"
						color={CURVE_COLOR}
						strokeWidth={1.5}
						strokeJoin="round"
						strokeCap="round"
					/>
				</Path>
			)}

			{/* Preview segment to cursor (dashed) */}
			{previewPath && (
				<Path path={previewPath} color="transparent">
					<Paint
						style="stroke"
						color={PREVIEW_COLOR}
						strokeWidth={1}
						strokeJoin="round"
						strokeCap="round"
					>
						<DashPathEffect intervals={[4, 4]} />
					</Paint>
				</Path>
			)}

			{/* Anchor points with handles */}
			{anchors.map((anchor, i) => (
				<AnchorVis key={i} anchor={anchor} />
			))}

			{/* Cursor indicator */}
			{cursorDocX !== null && cursorDocY !== null && (
				<Circle cx={cursorDocX} cy={cursorDocY} r={CURSOR_RADIUS} color="transparent">
					<Paint style="fill" color={CURVE_COLOR} opacity={0.25} />
					<Paint style="stroke" color={CURVE_COLOR} strokeWidth={1.5} />
				</Circle>
			)}
		</Group>
	);
}

function AnchorVis({ anchor }: { anchor: PenAnchor }): React.ReactNode {
	const hasOut =
		anchor.handleOutDocX !== anchor.docX || anchor.handleOutDocY !== anchor.docY;
	const hasIn =
		anchor.handleInDocX !== anchor.docX || anchor.handleInDocY !== anchor.docY;

	return (
		<Group>
			{/* Handle-out line + dot */}
			{hasOut && (
				<>
					<Path
						path={`M ${anchor.docX} ${anchor.docY} L ${anchor.handleOutDocX} ${anchor.handleOutDocY}`}
						color="transparent"
					>
						<Paint
							style="stroke"
							color={CURVE_COLOR}
							strokeWidth={1}
							opacity={0.6}
						/>
					</Path>
					<Circle
						cx={anchor.handleOutDocX}
						cy={anchor.handleOutDocY}
						r={HANDLE_RADIUS}
						color={CURVE_COLOR}
					/>
				</>
			)}

			{/* Handle-in line + dot */}
			{hasIn && (
				<>
					<Path
						path={`M ${anchor.docX} ${anchor.docY} L ${anchor.handleInDocX} ${anchor.handleInDocY}`}
						color="transparent"
					>
						<Paint
							style="stroke"
							color={CURVE_COLOR}
							strokeWidth={1}
							opacity={0.6}
						/>
					</Path>
					<Circle
						cx={anchor.handleInDocX}
						cy={anchor.handleInDocY}
						r={HANDLE_RADIUS}
						color={CURVE_COLOR}
					/>
				</>
			)}

			{/* Anchor point: white fill + colored stroke */}
			<Circle cx={anchor.docX} cy={anchor.docY} r={ANCHOR_RADIUS} color={ANCHOR_FILL}>
				<Paint style="stroke" color={CURVE_COLOR} strokeWidth={1.5} />
			</Circle>
		</Group>
	);
}
