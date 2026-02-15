import type { KnobConfig } from "@slopcade/shared";
import React from "react";
import { Text, View } from "react-native";
import { KnobButton } from "./KnobButton";
import { KnobColor } from "./KnobColor";
import { KnobGradient } from "./KnobGradient";
import { KnobSelect } from "./KnobSelect";
import { KnobSlider } from "./KnobSlider";
import { KnobToggle } from "./KnobToggle";
import { KnobVec2 } from "./KnobVec2";
import { KnobVec3 } from "./KnobVec3";
import type { GradientStop } from "./types";

export interface KnobControlProps {
	config: KnobConfig;
	value: unknown;
	onChange: (value: unknown) => void;
	label: string;
	description?: string;
}

export function KnobControl({
	config,
	value,
	onChange,
	label,
	description,
}: KnobControlProps) {
	switch (config.controlType) {
		case "slider":
			return (
				<KnobSlider
					{...config}
					label={label}
					description={description}
					value={value as number}
					onChange={onChange as (val: number) => void}
				/>
			);
		case "toggle":
			return (
				<KnobToggle
					{...config}
					label={label}
					description={description}
					value={value as boolean}
					onChange={onChange as (val: boolean) => void}
				/>
			);
		case "select":
			return (
				<KnobSelect
					{...config}
					label={label}
					description={description}
					value={value as string | number}
					onChange={onChange as (val: string | number) => void}
				/>
			);
		case "color":
			return (
				<KnobColor
					{...config}
					label={label}
					description={description}
					value={value as string}
					onChange={onChange as (val: string) => void}
				/>
			);
		case "button":
			return (
				<KnobButton
					{...config}
					label={label}
					onAction={onChange as (action: string) => void}
				/>
			);
		case "vec2":
			return (
				<KnobVec2
					{...config}
					label={label}
					description={description}
					value={value as { x: number; y: number }}
					onChange={onChange as (val: { x: number; y: number }) => void}
				/>
			);
		case "vec3":
			return (
				<KnobVec3
					{...config}
					label={label}
					description={description}
					value={value as { x: number; y: number; z: number }}
					onChange={
						onChange as (val: { x: number; y: number; z: number }) => void
					}
				/>
			);
		case "gradient":
			return (
				<KnobGradient
					{...config}
					label={label}
					description={description}
					value={value as GradientStop[]}
					onChange={onChange as (val: GradientStop[]) => void}
				/>
			);
		case "text":
			return (
				<View className="mb-4 bg-gray-900/95 p-4 rounded-lg">
					<Text className="text-white font-medium">{label}</Text>
					{description && (
						<Text className="text-gray-400 text-xs mb-2">{description}</Text>
					)}
					<Text className="text-gray-500 italic">
						text control not yet implemented
					</Text>
				</View>
			);
		default:
			return null;
	}
}
