export declare const STYLE_PRESET_KEYS: readonly ["3d", "pixel", "cartoon", "flat", "sketch", "photorealistic", "watercolor", "low-poly", "voxel", "retro"];
export type StylePresetKey = (typeof STYLE_PRESET_KEYS)[number];
export interface StylePresetOption {
    id: StylePresetKey;
    label: string;
    emoji: string;
}
export declare const STYLE_PRESET_OPTIONS: StylePresetOption[];
//# sourceMappingURL=style-presets.d.ts.map