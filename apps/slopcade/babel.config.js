module.exports = (api) => {
	api.cache(true);
	const isTest = process.env.NODE_ENV === "test";
	return {
		presets: [
			["babel-preset-expo", isTest ? {} : { jsxImportSource: "nativewind" }],
			...(isTest ? [] : ["nativewind/babel"]),
		],
		plugins: [
			"babel-plugin-transform-import-meta",
			"react-native-reanimated/plugin", // must be last
		],
	};
};
