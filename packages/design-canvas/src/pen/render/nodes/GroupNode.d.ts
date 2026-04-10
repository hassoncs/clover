import type React from "react";
import type { LayoutNode } from "../../layout";
interface NodeRendererProps {
    layoutNode: LayoutNode;
    renderChildren?: (children: LayoutNode[]) => React.ReactNode;
}
export declare function GroupNode({ layoutNode, renderChildren }: NodeRendererProps): React.ReactNode;
export {};
//# sourceMappingURL=GroupNode.d.ts.map