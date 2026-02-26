/** @type {import('jest').Config} */
module.exports = {
	preset: "jest-expo/web",

	transformIgnorePatterns: [],

	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
		"^swiper/react$": "<rootDir>/__mocks__/swiper.js",
		"^swiper/modules$": "<rootDir>/__mocks__/swiper.js",
		"^swiper/css.*$": "<rootDir>/__mocks__/empty.js",
		"^@gorhom/bottom-sheet$": "<rootDir>/__mocks__/empty.js",
		"^@borndotcom/react-native-godot$": "<rootDir>/__mocks__/empty.js",
		"^react-native-vision-camera$": "<rootDir>/__mocks__/empty.js",
		"^@shopify/react-native-skia$": "<rootDir>/__mocks__/empty.js",
		"^expo-audio$": "<rootDir>/__mocks__/empty.js",
		"^sonner-native$": "<rootDir>/__mocks__/empty.js",
		"^react-native-sortables$": "<rootDir>/__mocks__/empty.js",
		"^@mgcrea/react-native-dnd$": "<rootDir>/__mocks__/empty.js",
		"^@shopify/flash-list$": "<rootDir>/__mocks__/empty.js",
		"^react-native-live-audio-stream$": "<rootDir>/__mocks__/empty.js",
		"^dockview$": "<rootDir>/__mocks__/empty.js",
		"^react-native-css-interop$":
			"<rootDir>/__mocks__/react-native-css-interop.js",
		"^nativewind$": "<rootDir>/__mocks__/empty.js",
		"\\.glsl$": "<rootDir>/__mocks__/empty.js",
		"\\.css$": "<rootDir>/__mocks__/empty.js",
	},

	testMatch: [
		"<rootDir>/lib/**/*.test.ts",
		"<rootDir>/lib/**/*.test.tsx",
		"<rootDir>/components/**/*.test.ts",
		"<rootDir>/components/**/*.test.tsx",
	],

	setupFilesAfterEnv: ["./jest.setup.ts"],
};
