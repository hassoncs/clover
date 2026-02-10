// UI Overlay System - v1 Element Types

// ============================================================================
// Anchoring
// ============================================================================

export type OverlayAnchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// ============================================================================
// Styling
// ============================================================================

export interface OverlayStyle {
  backgroundColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  opacity?: number;
  shadow?: boolean;
}

// ============================================================================
// Theming
// ============================================================================

export type FontPreset = 'system' | 'pixel' | 'retro' | 'handwritten' | 'monospace';

export interface OverlayTheme {
  fontFamily?: string;
  fontUrl?: string;
  fontPreset?: FontPreset;
  pixelMode?: boolean;
  pixelScale?: number;
  primaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
}

// ============================================================================
// Base Element
// ============================================================================

export interface BaseOverlayElement {
  id: string;
  type: OverlayElementType;
  anchor?: OverlayAnchor;
  offset?: { x: number; y: number };
  visible?: boolean;
  visibleWhen?: string;
  bindings?: Record<string, string>;
  style?: OverlayStyle;
}

// ============================================================================
// Element Types
// ============================================================================

export interface TextOverlayElement extends BaseOverlayElement {
  type: 'text';
  text?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export interface BarOverlayElement extends BaseOverlayElement {
  type: 'bar';
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  direction?: 'left-to-right' | 'right-to-left' | 'bottom-to-top';
  showLabel?: boolean;
  labelFormat?: string;
}

export interface CounterOverlayElement extends BaseOverlayElement {
  type: 'counter';
  icon?: string;
  iconEmoji?: string;
  iconSize?: number;
  fontSize?: number;
  color?: string;
  direction?: 'icon-left' | 'icon-right' | 'icon-top';
  gap?: number;
}

export interface ButtonOverlayElement extends BaseOverlayElement {
  type: 'button';
  label: string;
  eventName: string;
  eventData?: Record<string, unknown>;
  width?: number;
  height?: number;
  color?: string;
  textColor?: string;
  fontSize?: number;
  disabled?: boolean;
  disabledWhen?: string;
}

export interface ImageOverlayElement extends BaseOverlayElement {
  type: 'image';
  url?: string;
  assetRef?: string;
  width?: number;
  height?: number;
  tint?: string;
}

export interface ContainerOverlayElement extends BaseOverlayElement {
  type: 'container';
  direction?: 'horizontal' | 'vertical';
  gap?: number;
  children: OverlayElement[];
}

export interface SpacerOverlayElement extends BaseOverlayElement {
  type: 'spacer';
  width?: number;
  height?: number;
}

// ============================================================================
// Union Types
// ============================================================================

export type OverlayElementType =
  | 'text'
  | 'bar'
  | 'counter'
  | 'button'
  | 'image'
  | 'container'
  | 'spacer';

export type OverlayElement =
  | TextOverlayElement
  | BarOverlayElement
  | CounterOverlayElement
  | ButtonOverlayElement
  | ImageOverlayElement
  | ContainerOverlayElement
  | SpacerOverlayElement;

// ============================================================================
// Config
// ============================================================================

export interface OverlayConfig {
  elements: OverlayElement[];
  theme?: OverlayTheme;
}
