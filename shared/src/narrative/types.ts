export interface Choice {
	id: string;
	label: string;
	condition?: string;
}

export interface Scene {
	id: string;
	title: string;
	body: string;
	speaker?: string;
	choices: Choice[];
	isStart?: boolean;
	isEnding?: boolean;
}

export interface Transition {
	id: string;
	fromSceneId: string;
	choiceId: string;
	toSceneId: string;
}

export interface NarrativeGraph {
	id: string;
	title: string;
	scenes: Scene[];
	transitions: Transition[];
}
