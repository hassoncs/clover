import type { DesignElement } from "@slopcade/shared";
/**
 * Resolved URL map: element ID → URL string (or null for placeholder fallback).
 *
 * null means no image could be resolved — the renderer should show a placeholder.
 */
export type ImageResolutionMap = Map<string, string | null>;
/**
 * Resolves image sources for a list of DesignElements using a deterministic
 * priority order:
 *
 *   1. `assetRef`  → workspace asset file URL
 *                    (T6 stub: returned as-is; T8 will resolve via workspace
 *                    file API to a real blob/CDN URL)
 *   2. `imageUrl`  → used directly as-is
 *   3. (neither)   → null — renderer shows a placeholder
 *
 * Contract guarantees:
 * - Non-blocking: resolution runs in useEffect, never on the render thread.
 * - Failure-safe: network/resolution errors are caught and mapped to null.
 * - Caching: the same source value (assetRef or imageUrl) is resolved at most
 *   once per hook lifetime; subsequent renders are free.
 * - Stable output: returned Map reference only changes when resolved URLs
 *   actually change.
 *
 * @param elements - Full flat list of DesignElements for the current frame(s).
 *                   Non-image elements are ignored.
 *                   ⚠️ Memoize this array at the call site to avoid
 *                   unnecessary re-resolution on every render.
 * @returns Map from element ID to resolved URL, or null for placeholder.
 */
export declare function useDesignImageResolver(elements: DesignElement[]): ImageResolutionMap;
/**
 * Computes the cache key for a given (assetRef, imageUrl) combination.
 * Elements sharing the same source map to the same key and are resolved once.
 */
export declare function sourceKeyFor(assetRef: string | undefined, imageUrl: string | undefined): string;
/**
 * Applies the resolution priority contract and returns the URL to use,
 * or null when no source is available.
 *
 * Priority:
 *   1. assetRef  (T6: returned as-is; T8 will fetch a signed URL)
 *   2. imageUrl  (used directly)
 *   3. null      (placeholder)
 */
export declare function resolveImageUrl(assetRef: string | undefined, imageUrl: string | undefined): string | null;
//# sourceMappingURL=useDesignImageResolver.d.ts.map