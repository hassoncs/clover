declare module "@slopcade/shared" {
	export function getAllSoundIdsForGame(
		brand: string,
		gameTemplate: string,
	): string[];

	export function getMusicForPhase(
		brand: string,
		gameTemplate: string,
		phase: string,
	): { soundId: string } | null;

	export function getSoundFileUrl(id: string, brand: string): string;
}
