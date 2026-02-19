export interface HowToPlayStep {
	step: number;
	title: string;
	body: string;
	panelImageUrl?: string | null;
}

export interface PartyTemplate {
	id: string;
	brandId: string;
	title: string;
	emoji: string;
	description: string | null;
	mechanic: string | null;
	contentPack: string;
	minPlayers: number;
	maxPlayers: number;
	sortOrder: number;
	tagline: string | null;
	formatTag: string | null;
	sessionLength: string | null;
	contentNote: string | null;
	thumbnailUrl: string | null;
	heroImageUrl: string | null;
	howToPlaySteps: HowToPlayStep[] | null;
}
