export type ChromaPhase =
	| "lobby"
	| "clue_giving"
	| "first_guess"
	| "second_guess"
	| "reveal"
	| "scores"
	| "winner";

export interface GridCoordinate {
	row: number;
	col: number;
}

export interface PlayerMarker {
	playerId: string;
	markerNumber: 1 | 2;
	position: GridCoordinate | null;
	score?: number;
}

export interface ChromaSharedData {
	phase: ChromaPhase;
	round: number;
	cueGiverId: string;
	clue1: string | null;
	clue2: string | null;
	markers: PlayerMarker[];
	targetColor: GridCoordinate | null;
	scores: Record<string, number>;
	scoreboard: Array<{ id: string; name: string; score: number }>;
}

export interface ChromaPrivateData {
	targetColor: GridCoordinate;
}
