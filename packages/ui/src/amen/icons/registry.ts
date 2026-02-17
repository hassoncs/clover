export const AMEN_ICONS = {
	// Crosses
	cross: "cross",
	crossCeltic: "celtic-cross",
	crossOutline: "cross-outline",

	// Nature / Animals
	dove: "dove",
	fish: "fish",
	lamb: "sheep",

	// Objects
	bible: "book-open-variant",
	church: "church",
	crown: "crown",
	chalice: "cup",
	scroll: "script-text",

	// Symbols
	prayingHands: "hands-pray",
	flame: "fire",
	heart: "heart",
	star: "star-four-points",
	anchor: "anchor",
	shield: "shield-cross",

	// Nature
	oliveBranch: "leaf",
	wheat: "barley",

	// Other
	halo: "circle-outline",
	angelWings: "angel",
	alphaOmega: "alpha-a-circle",
} as const;

export type AmenIconName = keyof typeof AMEN_ICONS;
export const amenIconNames = Object.keys(AMEN_ICONS) as AmenIconName[];
