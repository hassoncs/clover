export interface FollowSuggestion {
  id: string;
  name: string;
  handle: string;
  avatarText: string;
  avatarColor: string;
}

export interface PlaylistCardMock {
  id: string;
  title: string;
  accent: string;
  items: { id: string; label: string; color: string }[];
}

export const FOLLOW_SUGGESTIONS: FollowSuggestion[] = [
  {
    id: "tc",
    name: "TC Mulcahy",
    handle: "freetc",
    avatarText: "TM",
    avatarColor: "#2D3139",
  },
  {
    id: "fisher",
    name: "Fisher Hash",
    handle: "fisher_hash",
    avatarText: "FH",
    avatarColor: "#243048",
  },
  {
    id: "emma",
    name: "Emma Bussy",
    handle: "emma_bussy",
    avatarText: "EB",
    avatarColor: "#453344",
  },
  {
    id: "maya",
    name: "Maya Quill",
    handle: "maya_quill",
    avatarText: "MQ",
    avatarColor: "#33453A",
  },
];

export const PLAYLIST_MOCKS: PlaylistCardMock[] = [
  {
    id: "instrumenti",
    title: "instrumenti",
    accent: "#2A2D34",
    items: [
      { id: "i1", label: "Soundboard", color: "#3A3F4B" },
      { id: "i2", label: "Wheel", color: "#AA3434" },
      { id: "i3", label: "Symbols", color: "#2D343F" },
      { id: "i4", label: "Lockscreen", color: "#1F2735" },
    ],
  },
  {
    id: "tunes",
    title: "tunes",
    accent: "#88DFE1",
    items: [
      { id: "t1", label: "Runner", color: "#435A70" },
      { id: "t2", label: "Lo-fi", color: "#A17A84" },
      { id: "t3", label: "Nostalgic", color: "#77BBC0" },
      { id: "t4", label: "Ambient", color: "#8CCED0" },
    ],
  },
  {
    id: "arcades",
    title: "arcades",
    accent: "#252A38",
    items: [
      { id: "a1", label: "Neon Run", color: "#273056" },
      { id: "a2", label: "Puzzle Pop", color: "#4A3056" },
      { id: "a3", label: "Retro Aim", color: "#304A57" },
      { id: "a4", label: "Flip Dash", color: "#414758" },
    ],
  },
  {
    id: "cozy",
    title: "cozy",
    accent: "#2A3A34",
    items: [
      { id: "c1", label: "Moon Garden", color: "#354A4A" },
      { id: "c2", label: "Rainy Home", color: "#435164" },
      { id: "c3", label: "Night Tea", color: "#384448" },
      { id: "c4", label: "Soft Drift", color: "#4C5D67" },
    ],
  },
];
