/// <reference path="../.astro/types.d.ts" />

// React Three Fiber JSX types
import { Object3DNode, MaterialNode } from "@react-three/fiber";
import {
	Mesh,
	PlaneGeometry,
	ShaderMaterial,
} from "three";

declare global {
	namespace JSX {
		interface IntrinsicElements {
			mesh: Object3DNode<Mesh, typeof Mesh>;
			planeGeometry: Object3DNode<PlaneGeometry, typeof PlaneGeometry>;
			gradientShaderMaterial: MaterialNode<
				ShaderMaterial & {
					uTime?: number;
					uMouse?: [number, number];
					uColorPrimary?: [number, number, number];
					uColorSecondary?: [number, number, number];
					uColorAccent?: [number, number, number];
					uAnimationSpeed?: number;
				},
				typeof ShaderMaterial
			>;
		}
	}
}