import type { PenDocument } from "@slopcade/shared/types/pen";
import type React from "react";
import type { PenDrawingState } from "../../tools/penToolState";
export interface PenRendererProps {
    document: PenDocument;
    camera: {
        translateX: number;
        translateY: number;
        scale: number;
    };
    width: number;
    height: number;
    selectedNodePath?: string[];
    onNodeTap?: (nodePath: string[]) => void;
    penDrawingState?: PenDrawingState;
}
export default function PenRenderer({ document, camera, width, height, selectedNodePath, penDrawingState, }: PenRendererProps): React.ReactNode;
//# sourceMappingURL=PenRendererImpl.d.ts.map