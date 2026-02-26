import { vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
	},
}));

vi.mock("@expo/vector-icons", () => ({
	Ionicons: () => null,
	MaterialIcons: () => null,
	FontAwesome: () => null,
	Feather: () => null,
	AntDesign: () => null,
}));

// Mock @slopcade/ui so MicButton and other UI components work in tests
vi.mock("@slopcade/ui", async (importOriginal) => {
	const React = await import("react");
	return {
		MicButton: ({ onPress, isRecording, testID }: any) =>
			React.createElement(
				"button",
				{
					"data-testid": testID ?? "mic-button",
					onClick: onPress,
					type: "button",
				},
				isRecording ? "Stop" : "Mic",
			),
		// Pass through everything else as undefined (tree-shaken in tests)
	};
});

vi.mock("react-native-reanimated", () => ({
	default: {
		Value: class {
			constructor(_v: any) {}
		},
	},
	useSharedValue: (v: any) => ({ value: v }),
	useAnimatedStyle: (_fn: any) => ({}),
	withTiming: (v: any) => v,
	withSpring: (v: any) => v,
	withRepeat: (v: any) => v,
	withDelay: (_: any, v: any) => v,
	cancelAnimation: () => {},
	Easing: {
		linear: (t: any) => t,
		in: (fn: any) => fn,
		out: (fn: any) => fn,
		inOut: (fn: any) => fn,
		ease: (t: any) => t,
	},
	Animated: { View: "div", Text: "span", ScrollView: "div" },
	FlatList: ({ data, renderItem }: any) => data?.map(renderItem) ?? null,
}));
