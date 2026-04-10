export function getAssetUrl(r2Key, cdnBaseUrl, config) {
    if (config?.offlineMode && config.localServerUrl) {
        const base = config.localServerUrl.replace(/\/$/, "");
        return `${base}/${r2Key}`;
    }
    return `${cdnBaseUrl.replace(/\/$/, "")}/${r2Key}`;
}
export function buildGameFileKey(gameId, path) {
    return `games/${gameId}/${path}`;
}
export function resolveFileUrl(r2Key, baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/${r2Key}`;
}
//# sourceMappingURL=asset-url.js.map