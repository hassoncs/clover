/**
 * System execution phases (like Unity's script execution order).
 * Systems are executed in phase order, then by priority within each phase.
 */
export enum SystemPhase {
	PRE_UPDATE = 0,
	GAME_LOGIC = 1,
	PHYSICS = 2,
	POST_PHYSICS = 3,
	VISUAL = 4,
	CLEANUP = 5,
}
