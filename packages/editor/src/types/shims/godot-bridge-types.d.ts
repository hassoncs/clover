export interface GodotBridge {
	hotSwapShader: (shaderId: string, source: string) => void;
	[key: string]: unknown;
}
