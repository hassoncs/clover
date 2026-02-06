export const STYLE_PRESET_KEYS = [
  '3d',
  'pixel',
  'cartoon',
  'flat',
  'sketch',
  'photorealistic',
  'watercolor',
  'low-poly',
  'voxel',
  'retro',
] as const;

export type StylePresetKey = (typeof STYLE_PRESET_KEYS)[number];

export interface StylePresetOption {
  id: StylePresetKey;
  label: string;
  emoji: string;
}

export const STYLE_PRESET_OPTIONS: StylePresetOption[] = [
  { id: '3d', label: '3D Render', emoji: '🧊' },
  { id: 'pixel', label: 'Pixel Art', emoji: '🎮' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎨' },
  { id: 'flat', label: 'Flat Design', emoji: '📐' },
  { id: 'sketch', label: 'Sketch', emoji: '✏️' },
  { id: 'photorealistic', label: 'Photo', emoji: '📷' },
  { id: 'watercolor', label: 'Watercolor', emoji: '🖌️' },
  { id: 'low-poly', label: 'Low Poly', emoji: '💎' },
  { id: 'voxel', label: 'Voxel', emoji: '🧱' },
  { id: 'retro', label: 'Retro', emoji: '🕹️' },
];
