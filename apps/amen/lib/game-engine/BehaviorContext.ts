import type { Vec2 } from "../physics2d/types";
import type { RuntimeEntity } from "./types";

export interface InputState {
	tap?: {
		x: number;
		y: number;
		worldX: number;
		worldY: number;
		targetEntityId?: string;
	};
	drag?: {
		startX: number;
		startY: number;
		currentX: number;
		currentY: number;
		startWorldX: number;
		startWorldY: number;
		currentWorldX: number;
		currentWorldY: number;
		targetEntityId?: string;
	};
	dragEnd?: {
		velocityX: number;
		velocityY: number;
		worldVelocityX: number;
		worldVelocityY: number;
	};
	tilt?: { x: number; y: number };
	buttons?: {
		left: boolean;
		right: boolean;
		up: boolean;
		down: boolean;
		jump: boolean;
		action: boolean;
	};
	joystick?: {
		x: number;
		y: number;
		magnitude: number;
		angle: number;
	};
	mouse?: { x: number; y: number; worldX: number; worldY: number };
	touch?: { x: number; y: number; worldX: number; worldY: number };
}

export interface InputEvents {
	tap?: {
		x: number;
		y: number;
		worldX: number;
		worldY: number;
		targetEntityId?: string;
	};
	dragStart?: {
		x: number;
		y: number;
		worldX: number;
		worldY: number;
		targetEntityId?: string;
	};
	dragEnd?: {
		velocityX: number;
		velocityY: number;
		worldVelocityX: number;
		worldVelocityY: number;
	};
	swipe?: { direction: "left" | "right" | "up" | "down" };
	buttonPressed?: Set<string>;
	buttonReleased?: Set<string>;
	gameStarted?: boolean;
	gameLoaded?: boolean;
}

export interface GameState {
	time: number;
	state: "loading" | "ready" | "playing" | "paused" | "won" | "lost";
	variables: Record<string, number | string | boolean>;
}

export interface ReactGameState extends GameState {
	score?: number;
	lives?: number;
}

export interface CollisionInfo {
	entityA: RuntimeEntity;
	entityB: RuntimeEntity;
	normal: Vec2;
	impulse: number;
}
