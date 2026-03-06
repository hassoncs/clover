import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/EffectNode",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const shaderCode = `shader_type canvas_item;

uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform vec4 color : source_color = vec4(1.0, 0.5, 0.0, 1.0);

void fragment() {
    vec2 uv = UV;
    COLOR = mix(vec4(uv.x, uv.y, 0.5 + 0.5 * sin(TIME * speed), 1.0), color, 0.5);
}`;

export const Playing: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "effect-playing",
					type: "effect",
					x: 50,
					y: 50,
					width: 200,
					height: 200,
					authoringMode: "code",
					shaderCode,
					playing: true,
					uniforms: { speed: 2.0, color: [0.0, 1.0, 1.0, 1.0] },
				},
			],
		},
	},
};

export const Paused: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "effect-paused",
					type: "effect",
					x: 50,
					y: 50,
					width: 200,
					height: 200,
					authoringMode: "code",
					shaderCode,
					playing: false,
					uniforms: { speed: 2.0, color: [1.0, 0.0, 1.0, 1.0] },
				},
			],
		},
	},
};
