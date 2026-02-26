declare module "@slopcade/ui/amen" {
	import type { ComponentType } from "react";

	export type AmenIconName = string;
	export const AMEN_ICONS: Record<string, string>;
	export const AmenIcon: ComponentType<any>;
	export const HaloBadge: ComponentType<any>;
	export const MotifDivider: ComponentType<any>;
}
