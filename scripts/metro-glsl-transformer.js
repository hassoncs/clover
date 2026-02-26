const fs = require("fs");
const path = require("path");
const upstreamTransformer = require("@expo/metro-config/babel-transformer");

function resolveIncludes(src, filePath) {
	return src.replace(/#include\s+"([^"]+)"/g, (_match, includePath) => {
		const resolved = path.resolve(path.dirname(filePath), includePath);
		if (!fs.existsSync(resolved)) {
			throw new Error(
				`GLSL #include not found: ${includePath} (from ${filePath})`,
			);
		}
		return fs.readFileSync(resolved, "utf8");
	});
}

module.exports = {
	...upstreamTransformer,

	transform(params) {
		if (params.filename.endsWith(".glsl")) {
			const resolved = resolveIncludes(params.src, params.filename);
			const wrappedSrc = `export default ${JSON.stringify(resolved)};`;
			return upstreamTransformer.transform({
				...params,
				src: wrappedSrc,
			});
		}
		return upstreamTransformer.transform(params);
	},
};
