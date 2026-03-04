import { shaderMaterial } from "@react-three/drei";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// Brand colors from Slopcade identity
const COLORS = {
	primary: "#C4F82A",
	primaryDark: "#27272A",
	background: "#0A0A0A",
	accent: "#7C3AED",
};

// Parse hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return [0, 0, 0];
	return [
		parseInt(result[1], 16) / 255,
		parseInt(result[2], 16) / 255,
		parseInt(result[3], 16) / 255,
	];
}

// Vertex shader - pass-through with UV
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader - animated gradient with noise and mouse reactivity
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorAccent;
  uniform float uAnimationSpeed;
  
  varying vec2 vUv;
  
  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 4; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }
  
  void main() {
    // Time-based animation
    float time = uTime * uAnimationSpeed;
    
    // Base UV with subtle distortion
    vec2 uv = vUv;
    uv.x += sin(uv.y * 2.0 + time * 0.5) * 0.02;
    uv.y += cos(uv.x * 2.0 + time * 0.3) * 0.02;
    
    // Mouse influence - creates a subtle radial gradient around cursor
    float mouseInfluence = 0.0;
    float mouseDist = distance(vUv, uMouse);
    mouseInfluence = smoothstep(0.5, 0.0, mouseDist) * 0.3;
    
    // Layered noise for organic movement
    float noise1 = fbm(uv * 3.0 + time * 0.2);
    float noise2 = fbm(uv * 5.0 - time * 0.15 + vec2(10.0));
    float noise3 = snoise(uv * 8.0 + time * 0.1);
    
    // Combine noise layers
    float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    combinedNoise = combinedNoise * 0.5 + 0.5; // Normalize to 0-1
    
    // Color mixing based on noise and mouse
    vec3 baseColor = mix(uColorPrimary, uColorSecondary, combinedNoise);
    
    // Add accent color highlights
    float accentMask = smoothstep(0.4, 0.6, combinedNoise + mouseInfluence);
    baseColor = mix(baseColor, uColorAccent, accentMask * 0.3);
    
    // Add mouse glow effect
    baseColor += uColorAccent * mouseInfluence * 0.5;
    
    // Subtle vignette for depth
    float vignette = 1.0 - smoothstep(0.3, 1.2, length(vUv - 0.5) * 1.5);
    baseColor *= vignette * 0.3 + 0.7;
    
    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

// Create the shader material
const GradientShaderMaterial = shaderMaterial(
	{
		uTime: 0,
		uMouse: new THREE.Vector2(0.5, 0.5),
		uColorPrimary: new THREE.Color(...hexToRgb(COLORS.background)),
		uColorSecondary: new THREE.Color(...hexToRgb(COLORS.primaryDark)),
		uColorAccent: new THREE.Color(...hexToRgb(COLORS.primary)),
		uAnimationSpeed: 1.0,
	},
	vertexShader,
	fragmentShader,
);

// Extend for JSX usage
extend({ GradientShaderMaterial });

// Shader plane component
function ShaderPlane({
	mousePosition,
	isPaused,
}: {
	mousePosition: { x: number; y: number };
	isPaused: boolean;
}) {
	const materialRef = useRef<THREE.ShaderMaterial>(null);

	useFrame(({ clock }) => {
		if (materialRef.current && !isPaused) {
			materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
			materialRef.current.uniforms.uMouse.value.set(
				mousePosition.x,
				mousePosition.y,
			);
		}
	});

	return (
		<mesh>
			<planeGeometry args={[2, 2]} />
			<gradientShaderMaterial
				ref={materialRef}
				key={GradientShaderMaterial.key}
			/>
		</mesh>
	);
}

// CSS gradient fallback component
function CSSGradientFallback() {
	return (
		<div
			className="absolute inset-0 w-full h-full"
			style={{
				background: `
          radial-gradient(ellipse at 30% 20%, ${COLORS.primary}33 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, ${COLORS.accent}22 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, ${COLORS.primaryDark}44 0%, transparent 70%),
          linear-gradient(180deg, ${COLORS.background} 0%, #0a0f1a 100%)
        `,
			}}
		/>
	);
}

// WebGL detection hook
function useWebGLSupport(): boolean {
	const [isSupported, setIsSupported] = useState(false);

	useEffect(() => {
		try {
			const canvas = document.createElement("canvas");
			const gl =
				canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
			setIsSupported(gl !== null);
		} catch {
			setIsSupported(false);
		}
	}, []);

	return isSupported;
}

// Mobile detection hook
function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return isMobile;
}

// Reduced motion hook
function usePrefersReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setPrefersReducedMotion(mediaQuery.matches);

		const handleChange = (event: MediaQueryListEvent) => {
			setPrefersReducedMotion(event.matches);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	return prefersReducedMotion;
}

// Mouse position hook
function useMousePosition() {
	const [position, setPosition] = useState({ x: 0.5, y: 0.5 });

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			setPosition({
				x: event.clientX / window.innerWidth,
				y: 1.0 - event.clientY / window.innerHeight, // Flip Y for GL coords
			});
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return position;
}

// Main component props
interface HeroShaderSceneProps {
	className?: string;
}

// Main component
export function HeroShaderScene({ className = "" }: HeroShaderSceneProps) {
	const webglSupported = useWebGLSupport();
	const isMobile = useIsMobile();
	const prefersReducedMotion = usePrefersReducedMotion();
	const mousePosition = useMousePosition();

	// Determine if we should use WebGL or fallback
	const useWebGL = webglSupported && !isMobile;

	// Memoize canvas props to prevent unnecessary re-renders
	const canvasProps = useMemo(
		() => ({
			camera: { position: [0, 0, 1] as [number, number, number] },
			gl: {
				antialias: false,
				alpha: false,
				powerPreference: "low-power" as const,
			},
			dpr: 1, // Limit pixel ratio for performance
		}),
		[],
	);

	return (
		<div
			className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
			aria-hidden="true"
		>
			{useWebGL ? (
				<Canvas
					{...canvasProps}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
					}}
				>
					<ShaderPlane
						mousePosition={mousePosition}
						isPaused={prefersReducedMotion}
					/>
				</Canvas>
			) : (
				<CSSGradientFallback />
			)}
		</div>
	);
}

export default HeroShaderScene;
