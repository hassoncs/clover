import type { GameDefinition } from "@slopcade/shared";
import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import { createEntityLayoutAdapter, type LayoutAdapter } from "./LayoutAdapter";

interface WireframeRendererProps {
	document: GameDefinition;
	mode: "structural" | "production";
	layoutAdapter?: LayoutAdapter;
}

export function WireframeRenderer({
	document,
	mode,
	layoutAdapter,
}: WireframeRendererProps) {
	const adapter = React.useMemo(
		() => layoutAdapter || createEntityLayoutAdapter(),
		[layoutAdapter],
	);

	const layout = adapter.getLayout({ document, mode });

	const worldWidth =
		layout?.worldBounds?.width ?? document.world.bounds?.width ?? 20;
	const worldHeight =
		layout?.worldBounds?.height ?? document.world.bounds?.height ?? 12;

	const toScreenX = (worldX: number) =>
		((worldX + worldWidth / 2) / worldWidth) * 100;
	const toScreenY = (worldY: number) =>
		((worldHeight / 2 - worldY) / worldHeight) * 100;
	const toScreenSize = (worldSize: number, dimension: "width" | "height") =>
		(worldSize / (dimension === "width" ? worldWidth : worldHeight)) * 100;

	if (mode === "production") {
		return (
			<View style={styles.productionContainer}>
				<Text style={styles.productionText}>
					Production preview coming soon
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.worldBounds} />

			{layout?.zones.map((zone) => {
				const { width, height, x, y } = zone.bounds;
				const angle = zone.rotation ?? 0;

				const left = toScreenX(x - width / 2);
				const top = toScreenY(y + height / 2);
				const widthPct = toScreenSize(width, "width");
				const heightPct = toScreenSize(height, "height");

				return (
					<View
						key={zone.id}
						style={[
							styles.entityBox,
							{
								left: `${left}%`,
								top: `${top}%`,
								width: `${widthPct}%`,
								height: `${heightPct}%`,
								borderRadius: zone.shape === "circle" ? 999 : 0,
								transform: [{ rotate: `${angle}rad` }],
							},
						]}
					>
						<Text style={styles.entityLabel} numberOfLines={1}>
							{zone.label}
						</Text>
						{zone.subLabel && (
							<Text style={styles.prefabLabel} numberOfLines={1}>
								{zone.subLabel}
							</Text>
						)}
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
		overflow: "hidden",
		position: "relative",
	},
	productionContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#1a1a1a",
	},
	productionText: {
		color: "#666",
		fontSize: 14,
	},
	worldBounds: {
		...StyleSheet.absoluteFillObject,
		borderWidth: 1,
		borderColor: "#e0e0e0",
		borderStyle: "dashed",
	},
	entityBox: {
		position: "absolute",
		borderWidth: 1,
		borderColor: "#666",
		borderStyle: "dashed",
		backgroundColor: "rgba(0,0,0,0.05)",
		justifyContent: "center",
		alignItems: "center",
		overflow: "hidden",
	},
	entityLabel: {
		fontSize: 8,
		color: "#333",
		textAlign: "center",
	},
	prefabLabel: {
		fontSize: 6,
		color: "#666",
		textAlign: "center",
	},
});
