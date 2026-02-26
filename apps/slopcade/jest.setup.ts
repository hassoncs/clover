jest.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		getItem: jest.fn(),
		setItem: jest.fn(),
		removeItem: jest.fn(),
		clear: jest.fn(),
	},
}));
