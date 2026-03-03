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

import type { DesignCanvasPanelProps } from "./DesignCanvasPanel";

export type { DesignCanvasPanelProps };

/**
 * Web version of DesignCanvasPanel.
 *
 * Wraps the inner panel in WithSkiaWeb which:
 * 1. Loads canvaskit.wasm from /canvaskit.wasm
 * 2. Only then mounts the panel (which calls useFont, Canvas, Skia.*, etc.)
 *
 * This prevents the "Cannot use 'in' operator" crash caused by Skia APIs
 * being called before CanvasKit WASM is initialised.
 */
export function DesignCanvasPanel(props: DesignCanvasPanelProps) {
	// Stable reference — never recreate between renders
	const getComponent = useMemo(
		() => () => import("./DesignCanvasPanelInner"),
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
