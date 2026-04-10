export interface AssetUrlConfig {
    offlineMode?: boolean;
    localServerUrl?: string;
}
export declare function getAssetUrl(r2Key: string, cdnBaseUrl: string, config?: AssetUrlConfig): string;
export declare function buildGameFileKey(gameId: string, path: string): string;
export declare function resolveFileUrl(r2Key: string, baseUrl: string): string;
//# sourceMappingURL=asset-url.d.ts.map