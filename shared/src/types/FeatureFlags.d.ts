export interface PackageRuntimeFlags {
    /**
     * When true, use tag-native bridge calls (setupWorld, registerPrefabs, loadEntities)
     * instead of assembling a full GameDefinition and calling loadGame.
     * Enables incremental tag loading without full game reload.
     */
    tagNativeLoading: boolean;
}
export declare const DEFAULT_PACKAGE_RUNTIME_FLAGS: Readonly<PackageRuntimeFlags>;
//# sourceMappingURL=FeatureFlags.d.ts.map