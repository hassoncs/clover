import type React from "react";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

// Dynamically import WithSkiaWeb — only available on web
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WithSkiaWeb } =
	require("@shopify/react-native-skia/lib/module/web") as {
		WithSkiaWeb: ComponentType<{
			getComponent: () => Promise<{ default: ComponentType<any> }>;
			fallback?: React.ReactNode;
			opts?: { locateFile?: (file: string) => string };
			componentProps?: any;
		}>;
	};

import type { PenCanvasPanelProps } from "./PenCanvasPanel";

export type { PenCanvasPanelProps };

/**
 * Web version of PenCanvasPanel.
 *
 * Wraps the inner panel in WithSkiaWeb which loads canvaskit.wasm before
 * mounting the panel (which uses Canvas, useFont, etc.).
 */
export function PenCanvasPanel(props: PenCanvasPanelProps) {
	const getComponent = useMemo(
		() => () => import("./PenCanvasPanelInner"),
		[],
	);

	return (
		<WithSkiaWeb
			getComponent={getComponent}
			fallback={
				<View style={styles.fallback}>
					<ActivityIndicator color="#818cf8" />
				</View>
			}
			opts={{
				locateFile: (file: string) => `/${file}`,
			}}
			componentProps={props}
		/>
	);
}

const styles = StyleSheet.create({
	fallback: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#050310",
	},
});
