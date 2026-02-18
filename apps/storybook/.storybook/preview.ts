import "./global.css";
import { tokens } from "@slopcade/theme/tokens";
import type { Preview } from "@storybook/react";

// Load icon fonts served via staticDirs /fonts
const iconFonts = [
	{ family: "material-community", file: "MaterialCommunityIcons.ttf" },
];

for (const { family, file } of iconFonts) {
	const style = document.createElement("style");
	style.textContent = `@font-face { font-family: "${family}"; src: url("/fonts/${file}") format("truetype"); }`;
	document.head.appendChild(style);
}

const preview: Preview = {
	loaders: [
		async () => {
			if (typeof globalThis.CanvasKit !== "undefined") return {};
			const mod = await import("canvaskit-wasm/bin/full/canvaskit");
			const CanvasKitInit = mod.default;
			const CanvasKit = await CanvasKitInit({
				locateFile: (file: string) => `/${file}`,
			});
			(globalThis as any).CanvasKit = CanvasKit;
			return {};
		},
	],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/,
			},
		},
		backgrounds: {
			default: "light",
			values: [
				{
					name: "light",
					value: tokens.colors.background,
				},
				{
					name: "dark",
					value: tokens.colors.secondary[900],
				},
			],
		},
	},
};

export default preview;
