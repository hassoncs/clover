import React, { useMemo } from "react";
import { Platform } from "react-native";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import type { PenCanvasFixtureInnerProps } from "./PenCanvasFixtureInner";

export type PenCanvasFixtureProps = PenCanvasFixtureInnerProps;

export const PenCanvasFixture = (props: PenCanvasFixtureProps) => {
	const fallback = useMemo(
		() => (
			<div
				style={{
					width: props.width ?? 800,
					height: props.height ?? 600,
					background: "#111",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#666",
					fontSize: 14,
				}}
			>
				Loading canvas…
			</div>
		),
		[props.width, props.height],
	);

	if (Platform.OS === "web") {
		return (
			<WithSkiaWeb
				getComponent={() => {
					return import("./PenCanvasFixtureInner").then(
						(m) => ({ default: m.PenCanvasFixtureInner }),
					) as any;
				}}
				fallback={fallback}
				opts={{ locateFile: (file: string) => `/${file}` }}
				componentProps={props}
			/>
		);
	}

	const NativeInner = require("./PenCanvasFixtureInner").PenCanvasFixtureInner;
	return <NativeInner {...props} />;
};
