import type { PenDocument, PenNode, PenVariable } from "@slopcade/shared/types/pen";
import { type ThemeContext } from "./themes";
export declare function resolveVariable(name: string, variables: Record<string, PenVariable> | undefined, theme: ThemeContext): string | number | boolean;
export declare function resolveValue<T>(value: T, variables: Record<string, PenVariable> | undefined, theme: ThemeContext): T;
export declare function resolveTreeVariables(nodes: PenNode[], variables: PenDocument["variables"], themes: PenDocument["themes"], parentTheme?: ThemeContext): PenNode[];
//# sourceMappingURL=variables.d.ts.map