import {
	getAllSoundIdsForGame,
	getMusicForPhase,
	getSoundFileUrl,
} from "@slopcade/shared";
import { useEffect, useRef } from "react";
import { getAudioManager, type SoundConfig } from "@slopcade/app-lib/audio";
import type { PartyRoomState } from "./types";
import { usePartyConfig } from "../config";

const DEFAULT_BRAND = "amen";

function resolveEffectivePhase(roomState: PartyRoomState): string | null {
	if (roomState.phase === "lobby") return "lobby";
	if (roomState.phase === "ended") return null;

	const sharedData = (roomState.sharedData || {}) as Record<string, unknown>;
	const gamePhase =
		(sharedData.phase as string) ?? (sharedData.qaPhase as string);
	return gamePhase ?? null;
}

export function usePartyMusic(
	roomState: PartyRoomState | null,
	brand: string = DEFAULT_BRAND,
): void {
	const { resolveAssetUrl } = usePartyConfig();
	const preloadedRef = useRef(false);
	const lastPhaseRef = useRef<string | null>(null);

	useEffect(() => {
		if (!roomState || preloadedRef.current) return;

		const sharedData = (roomState.sharedData || {}) as Record<string, unknown>;
		const gameTemplate = (sharedData.gameTemplate as string) || "default";
		if (gameTemplate === "default") return;

		preloadedRef.current = true;
		const audioManager = getAudioManager();
		const soundIds = getAllSoundIdsForGame(brand, gameTemplate);

		const configs: Record<string, SoundConfig> = {};
		for (const id of soundIds) {
			const r2Key = getSoundFileUrl(id, brand);
			const url = resolveAssetUrl(r2Key);
			if (!url) continue;

			configs[id] = {
				url,
				type: "music",
				loop: true,
				defaultVolume: 0.5,
			};
		}

		audioManager.preloadAll(configs).then(({ loaded, failed }) => {
			if (failed.length > 0) {
				console.warn("[usePartyMusic] Failed to preload:", failed);
			}
			if (loaded.length > 0) {
				console.log(`[usePartyMusic] Preloaded ${loaded.length} tracks`);
			}
		});
	}, [roomState, brand]);

	useEffect(() => {
		if (!roomState) return;

		const sharedData = (roomState.sharedData || {}) as Record<string, unknown>;
		const gameTemplate = (sharedData.gameTemplate as string) || "default";
		const effectivePhase = resolveEffectivePhase(roomState);

		if (effectivePhase === lastPhaseRef.current) return;
		lastPhaseRef.current = effectivePhase;

		const audioManager = getAudioManager();

		if (!effectivePhase) {
			audioManager.fadeOut();
			return;
		}

		const musicConfig = getMusicForPhase(brand, gameTemplate, effectivePhase);
		if (!musicConfig) {
			audioManager.fadeOut();
			return;
		}

		audioManager.crossfadeTo(musicConfig.soundId, 0.5);
	}, [roomState, brand]);

	useEffect(() => {
		return () => {
			const audioManager = getAudioManager();
			audioManager.fadeOut();
		};
	}, []);
}
