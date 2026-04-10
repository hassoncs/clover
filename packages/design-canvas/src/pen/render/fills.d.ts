import type { PenFill } from "@slopcade/shared/types/pen";
import type React from "react";
interface FillProps {
    fill: PenFill | undefined;
    width: number;
    height: number;
}
export declare function resolveSolidFillColor(fill: PenFill | undefined): string | null;
export declare function PenFillRenderer({ fill, width, height, }: FillProps): React.ReactNode;
export {};
//# sourceMappingURL=fills.d.ts.map