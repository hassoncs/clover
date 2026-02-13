import type { grainient } from "@slopcade/theme";
import type { VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { Pressable } from "react-native";
import type { buttonVariants } from "./variants";

export type ButtonVariant =
	| "grainient"
	| "glass"
	| "solid"
	| "outline"
	| "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonPalette = keyof typeof grainient.palettes;

export interface ButtonProps
	extends ComponentPropsWithoutRef<typeof Pressable>,
		VariantProps<typeof buttonVariants> {
	label?: string;
	iconLeft?: ReactNode;
	iconRight?: ReactNode;
	loading?: boolean;
	palette?: ButtonPalette;
}
