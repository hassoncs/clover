export interface PackageRuntimeFlags {
  /**
   * When true, use tag-native bridge calls (setupWorld, registerTemplates, loadEntities)
   * instead of assembling a full GameDefinition and calling loadGame.
   * Enables incremental tag loading without full game reload.
   */
  tagNativeLoading: boolean;
}

export const DEFAULT_PACKAGE_RUNTIME_FLAGS: Readonly<PackageRuntimeFlags> = {
  tagNativeLoading: false,
};
