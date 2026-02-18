const upstreamTransformer = require("@expo/metro-config/babel-transformer");

module.exports = {
	...upstreamTransformer,

	transform(params) {
		if (params.filename.endsWith(".glsl")) {
			const wrappedSrc = `export default ${JSON.stringify(params.src)};`;
			return upstreamTransformer.transform({
				...params,
				src: wrappedSrc,
			});
		}
		return upstreamTransformer.transform(params);
	},
};
