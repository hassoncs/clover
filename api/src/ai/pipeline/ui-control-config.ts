import type { UIComponentSheetSpec } from './types';

type UIComponentType = UIComponentSheetSpec['componentType'];
type UIState = UIComponentSheetSpec['states'][number];

export interface UIControlConfig {
  states: UIState[];
  baseState: UIState;
  margins: { left: number; right: number; top: number; bottom: number };
  dimensions: { width: number; height: number };
  description: string;
}

export const UI_CONTROL_CONFIG: Record<UIComponentType, UIControlConfig> = {
  button: {
    states: ['normal', 'hover', 'pressed', 'disabled'],
    baseState: 'normal',
    margins: { left: 12, right: 12, top: 12, bottom: 12 },
    dimensions: { width: 256, height: 256 },
    description: 'rectangular button with raised 3D appearance',
  },
  checkbox: {
    states: ['normal', 'hover', 'pressed', 'disabled'],
    baseState: 'normal',
    margins: { left: 12, right: 12, top: 12, bottom: 12 },
    dimensions: { width: 256, height: 256 },
    description: 'square checkbox container without checkmark',
  },
  panel: {
    states: ['normal'],
    baseState: 'normal',
    margins: { left: 16, right: 16, top: 16, bottom: 16 },
    dimensions: { width: 256, height: 256 },
    description: 'decorative frame panel with hollow center for content',
  },
  progress_bar: {
    states: ['normal', 'disabled'],
    baseState: 'normal',
    margins: { left: 8, right: 8, top: 8, bottom: 8 },
    dimensions: { width: 256, height: 64 },
    description: 'horizontal progress bar track with rounded end caps',
  },
  scroll_bar_h: {
    states: ['normal', 'hover', 'pressed'],
    baseState: 'normal',
    margins: { left: 8, right: 8, top: 8, bottom: 8 },
    dimensions: { width: 256, height: 32 },
    description: 'horizontal scrollbar track',
  },
  scroll_bar_v: {
    states: ['normal', 'hover', 'pressed'],
    baseState: 'normal',
    margins: { left: 8, right: 8, top: 8, bottom: 8 },
    dimensions: { width: 32, height: 256 },
    description: 'vertical scrollbar track',
  },
  tab_bar: {
    states: ['unselected', 'selected', 'hover'],
    baseState: 'unselected',
    margins: { left: 12, right: 12, top: 12, bottom: 12 },
    dimensions: { width: 128, height: 48 },
    description: 'navigation tab background in unselected state',
  },
  // Placeholder configs for types not in scope
  radio: {
    states: ['normal', 'hover', 'pressed', 'disabled'],
    baseState: 'normal',
    margins: { left: 12, right: 12, top: 12, bottom: 12 },
    dimensions: { width: 256, height: 256 },
    description: 'radio button (not implemented)',
  },
  slider: {
    states: ['normal', 'hover', 'pressed', 'disabled'],
    baseState: 'normal',
    margins: { left: 8, right: 8, top: 8, bottom: 8 },
    dimensions: { width: 256, height: 32 },
    description: 'slider track (not implemented)',
  },
  list_item: {
    states: ['normal', 'hover', 'pressed'],
    baseState: 'normal',
    margins: { left: 8, right: 8, top: 8, bottom: 8 },
    dimensions: { width: 256, height: 64 },
    description: 'list item background (not implemented)',
  },
  dropdown: {
    states: ['normal', 'hover', 'pressed', 'disabled'],
    baseState: 'normal',
    margins: { left: 12, right: 12, top: 12, bottom: 12 },
    dimensions: { width: 256, height: 64 },
    description: 'dropdown button (not implemented)',
  },
  toggle_switch: {
    states: ['normal', 'hover', 'pressed', 'disabled'],
    baseState: 'normal',
    margins: { left: 8, right: 8, top: 8, bottom: 8 },
    dimensions: { width: 128, height: 64 },
    description: 'toggle switch (not implemented)',
  },
};

export function getControlConfig(type: UIComponentType): UIControlConfig {
  const config = UI_CONTROL_CONFIG[type];
  if (!config) {
    throw new Error(`Unknown UI control type: ${type}`);
  }
  return config;
}

export function getControlStates(type: UIComponentType): UIState[] {
  return getControlConfig(type).states;
}

export function getControlMargins(type: UIComponentType): { left: number; right: number; top: number; bottom: number } {
  return getControlConfig(type).margins;
}

export function getControlDimensions(type: UIComponentType): { width: number; height: number } {
  return getControlConfig(type).dimensions;
}

export function getControlBaseState(type: UIComponentType): UIState {
  return getControlConfig(type).baseState;
}
