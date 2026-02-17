import { lazy, Suspense } from "react";
import { View } from "react-native";
import type { SplashPreviewCanvasProps } from "./types";

export type { SplashPreviewCanvasProps, SplashStyleName } from "./types";
export { STYLE_NAMES } from "./types";

const LazySplashPreviewCanvas = lazy(() => import("./SplashPreviewCanvas"));

export function SplashPreview({
	styleName,
	time = 0,
	width,
	height,
}: SplashPreviewCanvasProps) {
	const canvasWidth = width ?? 400;
	const canvasHeight = height ?? 300;

	return (
		<Suspense
			fallback={
				<View
					style={{
						width: canvasWidth,
						height: canvasHeight,
						backgroundColor: "#111",
					}}
				/>
			}
		>
			<LazySplashPreviewCanvas
				styleName={styleName}
				time={time}
				width={canvasWidth}
				height={canvasHeight}
			/>
		</Suspense>
	);
}

export default SplashPreview;
