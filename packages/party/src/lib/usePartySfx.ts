import { getAudioManager, type SoundConfig } from "@slopcade/app-lib/audio";
import { SFX_PROMPTS } from "@slopcade/shared/constants/audio-sfx-prompts";
import { useEffect, useRef } from "react";
import { usePartyConfig } from "../config";
import type { PartyRoomState } from "./types";

const PHASE_SFX: Record<string, string> = {
	answering: "swoosh",
	writing_lies: "swoosh",
	drawing_f1: "swoosh",
	drawing_f2: "swoosh",
	bluffing: "swoosh",
	reveal: "reveal",
	voting: "drumroll",
	round_results: "score-up",
	scores: "correct",
	winner: "winner-fanfare",
};

function resolveEffectivePhase(roomState: PartyRoomState): string | null {
	if (roomState.phase === "lobby") return "lobby";
	if (roomState.phase === "ended") return null;

	const sharedData = (roomState.sharedData || {}) as Record<string, unknown>;
	const gamePhase =
		(sharedData.phase as string) ?? (sharedData.qaPhase as string);
	return gamePhase ?? null;
}

function resolveDeclaredSfxIds(
	roomState: PartyRoomState | null,
	sfxIds?: string[],
): string[] {
	if (sfxIds && sfxIds.length > 0) return sfxIds;

	const sharedData = (roomState?.sharedData || {}) as Record<string, unknown>;
	const sharedSfxIds = sharedData.sfxIds;
	if (Array.isArray(sharedSfxIds)) {
		const ids = sharedSfxIds.filter(
			(value): value is string => typeof value === "string" && value.length > 0,
		);
		if (ids.length > 0) return ids;
	}

	return SFX_PROMPTS.map((prompt) => prompt.id);
}

export function usePartySfx(
	roomState: PartyRoomState | null,
	sfxIds?: string[],
): void {
	const { resolveAssetUrl } = usePartyConfig();
	const preloadedRef = useRef(false);
	const lastPhaseRef = useRef<string | null>(null);

	useEffect(() => {
		if (!roomState || preloadedRef.current) return;

		preloadedRef.current = true;
		const audioManager = getAudioManager();
		const declaredSfxIds = resolveDeclaredSfxIds(roomState, sfxIds);

		const configs: Record<string, SoundConfig> = {};
		for (const id of declaredSfxIds) {
			configs[id] = {
				url: resolveAssetUrl(`audio/sfx/shared/${id}.mp3`),
				type: "sfx" as const,
				loop: false,
				defaultVolume: 1.0,
			};
		}

		audioManager.preloadAll(configs).then(({ loaded, failed }) => {
			if (failed.length > 0) {
				console.warn("[usePartySfx] Failed to preload:", failed);
			}
			if (loaded.length > 0) {
				console.log(`[usePartySfx] Preloaded ${loaded.length} SFX`);
			}
		});
	}, [roomState, sfxIds, resolveAssetUrl]);

	useEffect(() => {
		if (!roomState) return;

		const effectivePhase = resolveEffectivePhase(roomState);
		if (effectivePhase === lastPhaseRef.current) return;
		lastPhaseRef.current = effectivePhase;

		if (!effectivePhase) return;

		const sfxId = PHASE_SFX[effectivePhase];
		if (!sfxId) return;

		void getAudioManager().playSfx(sfxId);
	}, [roomState]);
}
