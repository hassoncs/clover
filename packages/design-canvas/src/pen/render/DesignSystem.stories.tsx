import type { Meta, StoryObj } from "@storybook/react";
import { LUNARIS_DESIGN_SYSTEM } from "./fixtures/lunaris-design-system";
import { PenCanvasFixture } from "./PenCanvasFixture";

// The full design system frame is 2696×4641. We render it at 0.25 scale
// to get a ~674×1160 viewport that fits in Storybook.
const DS_WIDTH = 2696;
const DS_HEIGHT = 4641;

const SCALE = 0.25;
const PREVIEW_WIDTH = Math.round(DS_WIDTH * SCALE);
const PREVIEW_HEIGHT = Math.round(DS_HEIGHT * SCALE);

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Lunaris Design System",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Full design system rendered at 25% scale — dark theme (as authored).
 * 2696×4641 canvas shows all 105 components at once.
 */
export const FullDark: Story = {
	name: "Full Canvas (Dark)",
	args: {
		document: LUNARIS_DESIGN_SYSTEM,
		width: PREVIEW_WIDTH,
		height: PREVIEW_HEIGHT,
		camera: {
			translateX: 0,
			translateY: 0,
			scale: SCALE,
		},
	},
};

/**
 * Full design system rendered at 25% scale — light theme override.
 */
export const FullLight: Story = {
	name: "Full Canvas (Light)",
	args: {
		document: {
			...LUNARIS_DESIGN_SYSTEM,
			children: LUNARIS_DESIGN_SYSTEM.children.map((child) => ({
				...child,
				theme: { Mode: "Light" },
			})),
		},
		width: PREVIEW_WIDTH,
		height: PREVIEW_HEIGHT,
		camera: {
			translateX: 0,
			translateY: 0,
			scale: SCALE,
		},
	},
};

/**
 * Full-resolution top section (top 1/4 of the canvas) at 50% scale.
 * Good for inspecting button, input, and form components.
 */
export const TopSectionDark: Story = {
	name: "Top Section 50% (Dark)",
	args: {
		document: LUNARIS_DESIGN_SYSTEM,
		width: Math.round(DS_WIDTH * 0.5),
		height: Math.round((DS_HEIGHT / 4) * 0.5),
		camera: {
			translateX: 0,
			translateY: 0,
			scale: 0.5,
		},
	},
};

/**
 * Second quarter of the canvas — sidebar, table, cards.
 */
export const MiddleSectionDark: Story = {
	name: "Middle Section 50% (Dark)",
	args: {
		document: LUNARIS_DESIGN_SYSTEM,
		width: Math.round(DS_WIDTH * 0.5),
		height: Math.round((DS_HEIGHT / 4) * 0.5),
		camera: {
			translateX: 0,
			translateY: -(DS_HEIGHT / 4) * 0.5,
			scale: 0.5,
		},
	},
};

/**
 * Full resolution 1:1 — shows the top-left corner with buttons/inputs.
 * Use this to pixel-check individual components.
 */
export const PixelPerfectTopLeft: Story = {
	name: "Pixel Perfect — Top Left 1:1",
	args: {
		document: LUNARIS_DESIGN_SYSTEM,
		width: 800,
		height: 600,
		camera: {
			translateX: 0,
			translateY: 0,
			scale: 1,
		},
	},
};
