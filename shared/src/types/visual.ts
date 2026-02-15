import type { Vec2, Vec3 } from "./common";

export type VisualType = "rect" | "circle" | "polygon" | "image" | "text";

export type VisualBlendMode = "mix" | "add" | "sub" | "mul";

export interface ShadowEffect {
	color: string;
	offsetX: number;
	offsetY: number;
	blur: number;
}

interface BaseVisualComponent {
	type: VisualType;
	width?: number;
	height?: number;
	offsetX?: number;
	offsetY?: number;
	opacity?: number;
	zIndex?: number;
	blendMode?: VisualBlendMode;
	shadow?: ShadowEffect;
}

export interface RectVisualComponent extends BaseVisualComponent {
	type: "rect";
	color: string;
	strokeColor?: string;
	strokeWidth?: number;
}

export interface CircleVisualComponent extends BaseVisualComponent {
	type: "circle";
	radius?: number;
	color: string;
	strokeColor?: string;
	strokeWidth?: number;
}

export interface PolygonVisualComponent extends BaseVisualComponent {
	type: "polygon";
	vertices: Vec2[];
	color: string;
	strokeColor?: string;
	strokeWidth?: number;
}

export interface ImageVisualComponent extends BaseVisualComponent {
	type: "image";
	/**
	 * Description of what the image should look like.
	 * Used by the AI asset generation pipeline.
	 */
	whatDescription?: string;
	tint?: string;
	imageWidth?: number;
	imageHeight?: number;
	url?: string;
	assetId?: string;
	scale?: number;
}

export interface TextVisualComponent extends BaseVisualComponent {
	type: "text";
	text: string;
	color?: string;
	fontSize?: number;
	fontFamily?: string;
	align?: "left" | "center" | "right";
}

export type VisualComponent =
	| RectVisualComponent
	| CircleVisualComponent
	| PolygonVisualComponent
	| ImageVisualComponent
	| TextVisualComponent;

export type VisualType3D = "primitive" | "voxels" | "model" | "sprite3d";

export interface MaterialConfig {
	color?: string;
	roughness?: number;
	metallic?: number;
	emissive?: string;
	emissiveEnergy?: number;
	transparent?: boolean;
	opacity?: number;
	unlit?: boolean;
	doubleSided?: boolean;
	textureUrl?: string;
	textureAssetRef?: string;
}

export interface PrimitiveVisual3D {
	type: "primitive";
	shape: "box" | "sphere" | "cylinder" | "capsule" | "plane";
	color: string;
	size?: Vec3;
	radius?: number;
	height?: number;
	material?: MaterialConfig;
}

export interface VoxelCube {
	x: number;
	y: number;
	z: number;
	size: number;
	color: string;
}

export interface VoxelVisual3D {
	type: "voxels";
	voxels: VoxelCube[];
	optimize?: boolean;
}

export interface ModelVisual3D {
	type: "model";
	url?: string;
	assetRef?: string;
	animationClip?: string;
	animationLoop?: boolean;
}

export interface Sprite3DVisual {
	type: "sprite3d";
	url?: string;
	assetRef?: string;
	whatDescription?: string;
	billboard?: boolean;
	pixelsPerMeter?: number;
}

export type VisualComponent3D =
	| PrimitiveVisual3D
	| VoxelVisual3D
	| ModelVisual3D
	| Sprite3DVisual;
