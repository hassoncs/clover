import type { VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import type { Pressable } from "react-native";
import type { buttonVariants } from "./variants";

export type ButtonVariant =
	| "grainient"
	| "glass"
	| "solid"
	| "outline"
	| "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
	extends ComponentPropsWithoutRef<typeof Pressable>,
		VariantProps<typeof buttonVariants> {
	label?: string;
}
