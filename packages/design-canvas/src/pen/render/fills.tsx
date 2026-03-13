import {
	ImageShader,
	LinearGradient,
	Paint,
	RadialGradient,
	SweepGradient,
	useImage,
	vec,
} from "@shopify/react-native-skia";
import type { PenFill, PenGradientStop } from "@slopcade/protocol/pen";
import type React from "react";

interface FillProps {
	fill: PenFill | undefined;
	width: number;
	height: number;
}

interface GradientFillProps {
	fill: {
		type: "gradient";
		gradientType: "linear" | "radial" | "angular" | "mesh";
		stops: PenGradientStop[];
		angle?: number;
		centerX?: number;
		centerY?: number;
		enabled?: boolean;
	};
	width: number;
	height: number;
}

interface ImageFillProps {
	fill: {
		type: "image";
		url: string;
		fit?: "cover" | "contain" | "fill" | "tile";
		opacity?: number;
		enabled?: boolean;
	};
	width: number;
	height: number;
}

export function resolveSolidFillColor(
	fill: PenFill | undefined,
): string | null {
	if (!fill || Array.isArray(fill)) return null;
	if (typeof fill === "string") return fill;
	if (fill.enabled === false) return null;
	if (fill.type === "color") return fill.color;
	return null;
}

function GradientFill({
	fill,
	width,
	height,
}: GradientFillProps): React.ReactNode {
	const colors = fill.stops.map((s) => s.color);
	const positions = fill.stops.map((s) => s.position);

	if (fill.gradientType === "linear") {
		const angle = fill.angle ?? 0;
		const rad = (angle * Math.PI) / 180;
		const cx = width / 2;
		const cy = height / 2;
		const r = Math.max(width, height) / 2;
		return (
			<LinearGradient
				start={vec(cx - Math.cos(rad) * r, cy - Math.sin(rad) * r)}
				end={vec(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r)}
				colors={colors}
				positions={positions}
			/>
		);
	}

	if (fill.gradientType === "radial") {
		const cx = (fill.centerX ?? 0.5) * width;
		const cy = (fill.centerY ?? 0.5) * height;
		return (
			<RadialGradient
				c={vec(cx, cy)}
				r={Math.max(width, height) / 2}
				colors={colors}
				positions={positions}
			/>
		);
	}

	if (fill.gradientType === "angular" || fill.gradientType === "mesh") {
		return (
			<SweepGradient
				c={vec(width / 2, height / 2)}
				colors={colors}
				positions={positions}
			/>
		);
	}

	return null;
}

function ImageFill({ fill, width, height }: ImageFillProps): React.ReactNode {
	const image = useImage(fill.url);
	if (!image) return null;

	const fitMode = fill.fit ?? "cover";
	const tx = fitMode === "tile" ? ("repeat" as const) : ("decal" as const);

	return (
		<ImageShader
			image={image}
			fit={fitMode === "tile" ? "none" : fitMode}
			tx={tx}
			ty={tx}
			rect={{ x: 0, y: 0, width, height }}
		/>
	);
}

function renderSingleFill(
	fill: Exclude<PenFill, PenFill[]>,
	width: number,
	height: number,
	key: string,
): React.ReactNode {
	if (typeof fill === "string") {
		return <Paint key={key} color={fill} style="fill" />;
	}

	if (fill.enabled === false) return null;

	if (fill.type === "color") {
		return (
			<Paint key={key} color={fill.color} style="fill" opacity={fill.opacity} />
		);
	}

	if (fill.type === "gradient") {
		return (
			<Paint key={key} style="fill">
				<GradientFill fill={fill} width={width} height={height} />
			</Paint>
		);
	}

	if (fill.type === "image") {
		return (
			<Paint key={key} style="fill" opacity={fill.opacity}>
				<ImageFill fill={fill} width={width} height={height} />
			</Paint>
		);
	}

	return null;
}

export function PenFillRenderer({
	fill,
	width,
	height,
}: FillProps): React.ReactNode {
	if (!fill) return null;

	if (Array.isArray(fill)) {
		const rendered: React.ReactNode[] = [];
		for (const nestedFill of fill) {
			const fillKey = `fill-${JSON.stringify(nestedFill)}`;
			if (Array.isArray(nestedFill)) {
				rendered.push(
					<PenFillRenderer
						key={fillKey}
						fill={nestedFill}
						width={width}
						height={height}
					/>,
				);
			} else {
				rendered.push(renderSingleFill(nestedFill, width, height, fillKey));
			}
		}
		return rendered;
	}

	return renderSingleFill(fill, width, height, "fill-0");
}
