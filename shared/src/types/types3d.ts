import type { Vec3 } from "./common";
import type { TransformComponent3D } from "./entity";
import type { ColliderComponent3D, PhysicsComponent3D } from "./physics";
import type { VisualComponent3D } from "./visual";

export type SkyConfig =
	| { type: "color"; color: string }
	| { type: "gradient"; topColor: string; bottomColor: string }
	| { type: "hdri"; url: string };

export type LightingPreset =
	| "bright-day"
	| "overcast"
	| "sunset"
	| "night"
	| "studio"
	| "dramatic";

export interface LightingConfig {
	ambient?: { color?: string; energy?: number };
	directional?: {
		color?: string;
		energy?: number;
		rotation?: Vec3;
		shadows?: boolean;
	};
}

export interface FogConfig {
	enabled: boolean;
	color?: string;
	density?: number;
	start?: number;
	end?: number;
}

export interface World3DConfig {
	gravity?: Vec3;
	pixelsPerMeter?: number;
	bounds?: {
		width: number;
		height: number;
		depth: number;
		enforcement?: "walls" | "kill" | "none";
		killY?: number;
	};
	floor?: {
		enabled?: boolean;
		size: number;
		color?: string;
		texture?: string;
		material?: "standard" | "unlit";
	};
	sky?: SkyConfig;
	lighting?: LightingConfig | LightingPreset;
	fog?: FogConfig;
}

export interface Camera3DConfig {
	type: "perspective" | "orthographic";
	position: Vec3;
	lookAt: Vec3;
	fov?: number;
	size?: number;
	near?: number;
	far?: number;
	follow?: {
		target?: string;
		offset?: Vec3;
		smoothing?: number;
		mode?: "third-person" | "orbit" | "fixed-offset";
	};
	orbit?: {
		enabled: boolean;
		minDistance?: number;
		maxDistance?: number;
		minPolarAngle?: number;
		maxPolarAngle?: number;
		autoRotate?: boolean;
		autoRotateSpeed?: number;
		damping?: number;
	};
}

export interface InputConfig3D {
	movement?: {
		enabled: boolean;
		speed?: number;
		sprintMultiplier?: number;
		jumpForce?: number;
	};
	mouseLook?: {
		enabled: boolean;
		sensitivity?: number;
		invertY?: boolean;
	};
	touchLook?: {
		enabled: boolean;
		sensitivity?: number;
	};
}

export interface EntityPrefab3D {
	id: string;
	description?: string;
	whatDescription?: string;
	scriptRef?: string;
	visual?: VisualComponent3D;
	physics?: PhysicsComponent3D;
	collider?: ColliderComponent3D;
	tags?: string[];
	children?: ChildPrefab3D[];
}

export interface ChildPrefab3D {
	name: string;
	prefab: string;
	localTransform: TransformComponent3D;
	visual?: Partial<VisualComponent3D>;
	physics?: Partial<PhysicsComponent3D>;
	collider?: Partial<ColliderComponent3D>;
	tags?: string[];
	children?: ChildPrefab3D[];
}

export interface GameEntity3D {
	id: string;
	name: string;
	prefab?: string;
	scriptRef?: string;
	transform: TransformComponent3D;
	visual?: VisualComponent3D;
	physics?: PhysicsComponent3D;
	collider?: ColliderComponent3D;
	tags?: string[];
	visible?: boolean;
	active?: boolean;
	children?: ChildEntity3D[];
}

export interface ChildEntity3D {
	id?: string;
	name: string;
	prefab: string;
	localTransform: TransformComponent3D;
	visual?: Partial<VisualComponent3D>;
	tags?: string[];
	children?: ChildEntity3D[];
}
