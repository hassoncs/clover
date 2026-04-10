import type { SkTypefaceFontProvider } from "@shopify/react-native-skia";
import type React from "react";
import type { LayoutNode } from "../../layout";
interface NodeRendererProps {
    layoutNode: LayoutNode;
    fontMgr: SkTypefaceFontProvider | null;
}
export declare function TextNode({ layoutNode, fontMgr }: NodeRendererProps): React.ReactNode;
export {};
//# sourceMappingURL=TextNode.d.ts.map