import type { Vec2, Vec3 } from "./common";

export type PhysicsBodyType = "static" | "dynamic" | "kinematic";

export interface PhysicsComponent {
	bodyType: PhysicsBodyType;
	density?: number;
	mass?: number;
	gravityScale?: number;
	linearDamping?: number;
	angularDamping?: number;
	fixedRotation?: boolean;
	ccd?: boolean;
	initialVelocity?: Vec2;
	initialAngularVelocity?: number;
}

export type ColliderShape = "box" | "circle" | "polygon" | "capsule";

export type CoefficientCombineRule = "average" | "min" | "multiply" | "max";

interface BaseColliderComponent {
	shape: ColliderShape;
	friction?: number;
	restitution?: number;
	frictionCombine?: CoefficientCombineRule;
	restitutionCombine?: CoefficientCombineRule;
	isSensor?: boolean;
}

export interface BoxColliderComponent extends BaseColliderComponent {
	shape: "box";
	width: number;
	height: number;
}

export interface CircleColliderComponent extends BaseColliderComponent {
	shape: "circle";
	radius: number;
}

export interface PolygonColliderComponent extends BaseColliderComponent {
	shape: "polygon";
	vertices: Vec2[];
}

export interface CapsuleColliderComponent extends BaseColliderComponent {
	shape: "capsule";
	radius: number;
	height: number;
}

export type ColliderComponent =
	| BoxColliderComponent
	| CircleColliderComponent
	| PolygonColliderComponent
	| CapsuleColliderComponent;

export interface PhysicsComponent3D {
	bodyType: PhysicsBodyType;
	mass?: number;
	density?: number;
	gravityScale?: number;
	linearDamping?: number;
	angularDamping?: number;
	freezeRotationX?: boolean;
	freezeRotationY?: boolean;
	freezeRotationZ?: boolean;
	ccd?: boolean;
	initialVelocity?: Vec3;
	initialAngularVelocity?: Vec3;
}

export type ColliderShape3D =
	| "box"
	| "sphere"
	| "capsule"
	| "cylinder"
	| "convex"
	| "trimesh";

export interface BaseColliderComponent3D {
	shape: ColliderShape3D;
	friction?: number;
	restitution?: number;
	isSensor?: boolean;
	fromVisual?: boolean;
}

export interface BoxCollider3D extends BaseColliderComponent3D {
	shape: "box";
	width: number;
	height: number;
	depth: number;
}

export interface SphereCollider3D extends BaseColliderComponent3D {
	shape: "sphere";
	radius: number;
}

export interface CapsuleCollider3D extends BaseColliderComponent3D {
	shape: "capsule";
	radius: number;
	height: number;
}

export interface CylinderCollider3D extends BaseColliderComponent3D {
	shape: "cylinder";
	radius: number;
	height: number;
}

export type ColliderComponent3D =
	| BoxCollider3D
	| SphereCollider3D
	| CapsuleCollider3D
	| CylinderCollider3D;

// Entity Archetypes - explicit classification for entity behavior
export type EntityArchetype =
	| { type: "body"; bodyType: "dynamic" | "static" | "kinematic" }
	| { type: "sensor" }
	| { type: "hitbox" }
	| { type: "visual" };

// Collision layer constants (matching Godot CollisionLayers.gd)
export const COLLISION_LAYERS = {
	BODIES: 1,
	SENSORS: 2,
	HITBOXES: 4,
} as const;
