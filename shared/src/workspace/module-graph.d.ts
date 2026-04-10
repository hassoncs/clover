import type { WorkspaceTag } from "./types";
export interface ModuleNode {
    path: string;
    deps: Set<string>;
    importers: Set<string>;
    tagHints: WorkspaceTag[];
}
export interface InvalidationResult {
    changedPaths: string[];
    affectedPaths: string[];
    affectedTags: WorkspaceTag[];
}
export declare class WorkspaceModuleGraph {
    private nodes;
    upsertNode(path: string, tagHints: WorkspaceTag[]): void;
    setDeps(path: string, deps: string[]): void;
    getNode(path: string): ModuleNode | undefined;
    invalidate(changedPaths: string[]): InvalidationResult;
}
//# sourceMappingURL=module-graph.d.ts.map