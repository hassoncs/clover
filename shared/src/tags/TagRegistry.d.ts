export declare class TagRegistry {
    private tagToId;
    private idToTag;
    private nextId;
    intern(tag: string): number;
    getId(tag: string): number | undefined;
    getTag(id: number): string | undefined;
    has(tag: string): boolean;
    get size(): number;
    clear(): void;
    getAllTags(): string[];
}
export declare function getGlobalTagRegistry(): TagRegistry;
export declare function resetGlobalTagRegistry(): void;
//# sourceMappingURL=TagRegistry.d.ts.map