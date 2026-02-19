export type FollowSuggestion = {
	id: string;
	avatarColor: string;
	avatarText: string;
	name: string;
	handle: string;
};

export type PlaylistCardMock = {
	id: string;
	accent: string;
	items: Array<{
		id: string;
		color: string;
		label: string;
	}>;
	title: string;
};

export const FOLLOW_SUGGESTIONS: FollowSuggestion[] = [
	{
		id: "1",
		avatarColor: "#4A148C",
		avatarText: "JD",
		name: "Jane Doe",
		handle: "@janedoe",
	},
	{
		id: "2",
		avatarColor: "#004D40",
		avatarText: "AS",
		name: "Alex Smith",
		handle: "@alexsmith",
	},
	{
		id: "3",
		avatarColor: "#BF360C",
		avatarText: "MJ",
		name: "Michael Jordan",
		handle: "@mj23",
	},
];

export const PLAYLIST_MOCKS: PlaylistCardMock[] = [
	{
		id: "p1",
		accent: "#1A237E",
		title: "chill beats",
		items: [
			{ id: "i1", color: "#283593", label: "lofi" },
			{ id: "i2", color: "#303F9F", label: "ambient" },
			{ id: "i3", color: "#3949AB", label: "jazz" },
			{ id: "i4", color: "#3F51B5", label: "downtempo" },
		],
	},
	{
		id: "p2",
		accent: "#311B92",
		title: "workout hits",
		items: [
			{ id: "i5", color: "#4527A0", label: "techno" },
			{ id: "i6", color: "#512DA8", label: "house" },
			{ id: "i7", color: "#5E35B1", label: "rock" },
			{ id: "i8", color: "#673AB7", label: "metal" },
		],
	},
	{
		id: "p3",
		accent: "#004D40",
		title: "focus flow",
		items: [
			{ id: "i9", color: "#00695C", label: "classical" },
			{ id: "i10", color: "#00796B", label: "piano" },
			{ id: "i11", color: "#00897B", label: "nature" },
			{ id: "i12", color: "#009688", label: "white noise" },
		],
	},
	{
		id: "p4",
		accent: "#880E4F",
		title: "party mix",
		items: [
			{ id: "i13", color: "#AD1457", label: "pop" },
			{ id: "i14", color: "#C2185B", label: "dance" },
			{ id: "i15", color: "#D81B60", label: "hip hop" },
			{ id: "i16", color: "#E91E63", label: "r&b" },
		],
	},
];
