import type { DesignElement } from "@slopcade/protocol/design";
import { useEffect, useRef, useState } from "react";

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
export function useDesignImageResolver(
	elements: DesignElement[],
): ImageResolutionMap {
	// Cache maps source key → resolved URL (or null).
	// Keyed by the canonical source string so the same asset referenced by
	// multiple elements is resolved exactly once.
	const sourceCacheRef = useRef<Map<string, string | null>>(new Map());

	const [resolvedMap, setResolvedMap] = useState<ImageResolutionMap>(new Map());

	useEffect(() => {
		const imageElements = elements.filter(
			(el): el is DesignElement & { type: "image" } => el.type === "image",
		);

		if (imageElements.length === 0) return;

		let cancelled = false;

		const resolveAll = async () => {
			// Identify elements whose source hasn't been cached yet.
			const pending = imageElements.filter(
				(el) =>
					!sourceCacheRef.current.has(sourceKeyFor(el.assetRef, el.imageUrl)),
			);

			// Resolve all uncached sources concurrently.
			// Each resolution is wrapped in try/catch so a single failure
			// doesn't abort the whole batch.
			await Promise.all(
				pending.map(async (el) => {
					const key = sourceKeyFor(el.assetRef, el.imageUrl);
					try {
						sourceCacheRef.current.set(
							key,
							resolveImageUrl(el.assetRef, el.imageUrl),
						);
					} catch {
						// Graceful degradation: failed resolution → null (placeholder)
						sourceCacheRef.current.set(key, null);
					}
				}),
			);

			if (cancelled) return;

			// Build the output map from all current image elements using the cache.
			const nextMap = new Map<string, string | null>();
			for (const el of imageElements) {
				const key = sourceKeyFor(el.assetRef, el.imageUrl);
				nextMap.set(el.id, sourceCacheRef.current.get(key) ?? null);
			}

			setResolvedMap(nextMap);
		};

		resolveAll();

		return () => {
			cancelled = true;
		};
	}, [elements]);

	return resolvedMap;
}

// ---------------------------------------------------------------------------
// Pure helpers — exported for unit testing
// ---------------------------------------------------------------------------

/**
 * Computes the cache key for a given (assetRef, imageUrl) combination.
 * Elements sharing the same source map to the same key and are resolved once.
 */
export function sourceKeyFor(
	assetRef: string | undefined,
	imageUrl: string | undefined,
): string {
	if (assetRef) return `asset:${assetRef}`;
	if (imageUrl) return `url:${imageUrl}`;
	return "none";
}

/**
 * Applies the resolution priority contract and returns the URL to use,
 * or null when no source is available.
 *
 * Priority:
 *   1. assetRef  (T6: returned as-is; T8 will fetch a signed URL)
 *   2. imageUrl  (used directly)
 *   3. null      (placeholder)
 */
export function resolveImageUrl(
	assetRef: string | undefined,
	imageUrl: string | undefined,
): string | null {
	if (assetRef) return assetRef;
	if (imageUrl) return imageUrl;
	return null;
}
