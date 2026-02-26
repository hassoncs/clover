import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioManager } from "@slopcade/app-lib/audio";
import { usePartyConfig } from "../config";

interface NarrationResult {
	assetId: string;
	url: string;
	contentType: string;
	durationSeconds: number | null;
}

export function usePartyNarration(): {
	narrate: (text: string, brand?: string) => Promise<void>;
	isNarrating: boolean;
} {
	const { resolveAssetUrl, generateNarration } = usePartyConfig();
	const [isNarrating, setIsNarrating] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);
	const currentSoundIdRef = useRef<string | null>(null);

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			const audioManager = getAudioManager();
			if (currentSoundIdRef.current) {
				audioManager.unload(currentSoundIdRef.current);
			}
		};
	}, []);

	const narrate = useCallback(
		async (text: string, brand: string = "amen") => {
			if (isNarrating) {
				abortControllerRef.current?.abort();
				const audioManager = getAudioManager();
				if (currentSoundIdRef.current) {
					audioManager.unload(currentSoundIdRef.current);
				}
			}

			setIsNarrating(true);
			abortControllerRef.current = new AbortController();
			const soundId = `narration-${Date.now()}`;
			currentSoundIdRef.current = soundId;

			try {
				const result = await generateNarration(
					text,
					brand,
					abortControllerRef.current.signal,
				);

				const narrationResult = result as NarrationResult;
				const resolvedUrl = resolveAssetUrl(narrationResult.url);

				if (!resolvedUrl) {
					console.warn("[usePartyNarration] Failed to resolve asset URL");
					setIsNarrating(false);
					return;
				}

				const audioManager = getAudioManager();

				await audioManager.preload(soundId, {
					url: resolvedUrl,
					type: "sfx",
					loop: false,
					defaultVolume: 1.0,
				});

				await audioManager.playSfx(soundId);

				setIsNarrating(false);
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					console.log("[usePartyNarration] Narration aborted");
				} else {
					console.error("[usePartyNarration] Error:", error);
				}
				setIsNarrating(false);
			}
		},
		[isNarrating],
	);

	return { narrate, isNarrating };
}
