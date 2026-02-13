import type { grainient, radii, spacing } from "@slopcade/theme";
import type { ViewProps } from "react-native";

export type SurfaceVariant = "grainient" | "glass" | "solid";

export interface SurfaceProps extends ViewProps {
	variant?: SurfaceVariant;
	palette?: keyof typeof grainient.palettes;
	radius?: keyof typeof radii | number;
	padding?: keyof typeof spacing | number;
	disableGrain?: boolean;
	className?: string;
}
