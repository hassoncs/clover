declare module "@slopcade/shared" {
	export interface AssetPlacement {
		[key: string]: any;
	}

	export type Vec2 = { x: number; y: number };

	export interface UserQuestion {
		id: string;
		header?: string;
		question: string;
		options?: Array<{ label: string; description: string; iconKey?: string }>;
		multiple?: boolean;
	}

	export interface EntityPrefab {
		visual?: unknown;
		collider?: ColliderComponent;
		tags?: string[];
		layer?: string;
		[key: string]: any;
	}

	export interface GameEntity {
		id: string;
		name: string;
		prefab?: string;
		transform: {
			x: number;
			y: number;
			angle: number;
			scaleX: number;
			scaleY: number;
		};
		visual?: unknown;
		collider?: ColliderComponent;
		tags?: string[];
		layer?: string;
		[key: string]: any;
	}

	export interface PreviewContext {
		id: string;
		label: string;
		mode: string;
		runtimeIntent: "author" | "live";
	}

	export interface ColliderComponent {
		shape: string;
		width?: number;
		height?: number;
		radius?: number;
		[key: string]: any;
	}

	export interface PhysicsComponent {
		bodyType?: PhysicsBodyType;
		collider?: ColliderComponent;
		[key: string]: any;
	}

	export interface VisualComponent {
		type?: string;
		[key: string]: any;
	}

}
