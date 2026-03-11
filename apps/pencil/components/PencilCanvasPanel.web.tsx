import type React from "react";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

const { WithSkiaWeb } =
	require("@shopify/react-native-skia/lib/module/web") as {
		WithSkiaWeb: ComponentType<{
			getComponent: () => Promise<{ default: ComponentType<any> }>;
			fallback?: React.ReactNode;
			opts?: { locateFile?: (file: string) => string };
			componentProps?: any;
		}>;
	};

import type { PenCanvasPanelProps } from "./PencilCanvasPanelInner";

export type { PenCanvasPanelProps };

export function PencilCanvasPanel(props: PenCanvasPanelProps) {
	const getComponent = useMemo(
		() => () =>
			import("./PencilCanvasPanelInner").then((module) => ({
				default: module.PencilCanvasPanelInner,
			})),
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
			opts={{ locateFile: (file: string) => `/${file}` }}
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
