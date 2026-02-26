import type { ComponentType } from "react";

export const ShimmerText = (() => null) as ComponentType<{
	text: string;
	fontSize?: number;
}>;

export const MicButton = (() => null) as ComponentType<{
	isRecording: boolean;
	isConnecting: boolean;
	error: { code: string; message: string } | null;
	volumeLevel?: number;
	onPress?: () => void;
	onPressIn?: () => void;
	onPressOut?: () => void;
	mode: "toggle" | "hold";
}>;
