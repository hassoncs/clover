/**
 * ResizableSplit — thin wrapper around react-resizable-panels for web.
 *
 * Renders a draggable resize handle between two panels.
 * Persists sizes to localStorage via `storageKey`.
 * Falls back to a plain flex row/col on native (no handle).
 */
import type { ReactNode } from "react";
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
export declare function ResizableSplit(props: ResizableSplitProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ResizableSplit.d.ts.map