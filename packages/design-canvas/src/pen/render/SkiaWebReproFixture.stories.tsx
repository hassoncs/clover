import type { Meta, StoryObj } from "@storybook/react";
import {
	SkiaWebProgressiveFixture,
	SkiaWebReproFixture,
	Stage,
} from "./SkiaWebReproFixture";

const meta: Meta<typeof SkiaWebReproFixture> = {
	title: "Pen/Skia Web Repro",
	component: SkiaWebReproFixture,
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof SkiaWebReproFixture>;

export const SolidRect: Story = {
	args: {
		stage: Stage.SOLID_RECT,
		width: 300,
		height: 200,
	},
};

export const RoundedRect: Story = {
	args: {
		stage: Stage.ROUNDED_RECT,
		width: 300,
		height: 200,
	},
};

export const FrameChildren: Story = {
	args: {
		stage: Stage.FRAME_CHILDREN,
		width: 300,
		height: 200,
	},
};

export const Text: Story = {
	args: {
		stage: Stage.TEXT,
		width: 300,
		height: 200,
	},
};

export const Image: Story = {
	args: {
		stage: Stage.IMAGE,
		width: 300,
		height: 300,
	},
};

export const Effects: Story = {
	args: {
		stage: Stage.EFFECTS,
		width: 300,
		height: 500,
	},
};

export const EffectShadowOnly: Story = {
	args: {
		stage: Stage.EFFECT_SHADOW_ONLY,
		width: 300,
		height: 250,
	},
};

export const EffectBlurOnly: Story = {
	args: {
		stage: Stage.EFFECT_BLUR_ONLY,
		width: 300,
		height: 250,
	},
};

export const EffectBackdropOnly: Story = {
	args: {
		stage: Stage.EFFECT_BACKDROP_ONLY,
		width: 300,
		height: 250,
	},
};

export const FreshNodeChrome: Story = {
	args: {
		stage: Stage.FRESH_NODE_CHROME,
		width: 300,
		height: 200,
	},
};

export const Progressive: StoryObj<typeof SkiaWebProgressiveFixture> = {
	render: () => <SkiaWebProgressiveFixture width={180} height={180} gap={12} />,
};
