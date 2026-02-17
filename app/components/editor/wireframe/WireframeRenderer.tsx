import type { GameDefinition } from "@slopcade/shared";
import * as React from "react";
import { StyleSheet, Text, View } from "react-native";

interface WireframeRendererProps {
	document: GameDefinition;
	mode: "structural" | "production";
}

export function WireframeRenderer({ document, mode }: WireframeRendererProps) {
	const worldWidth = document.world.bounds?.width ?? 20;
	const worldHeight = document.world.bounds?.height ?? 12;

	// Coordinate conversion: World (Center 0,0, Y up) -> Screen % (Top-Left 0,0, Y down)
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

			{document.entities.map((entity) => {
				const prefab = entity.prefab ? document.prefabs[entity.prefab] : null;

				let width = 1;
				let height = 1;
				let shape = "box";

				const collider = entity.collider || prefab?.collider;
				const visual = entity.visual || prefab?.visual;

				if (collider) {
					if (collider.shape === "box") {
						width = collider.width ?? 1;
						height = collider.height ?? 1;
					} else if (collider.shape === "circle") {
						width = (collider.radius ?? 0.5) * 2;
						height = (collider.radius ?? 0.5) * 2;
						shape = "circle";
					}
				} else if (visual) {
					if (visual.type === "rect") {
						width = visual.width ?? 1;
						height = visual.height ?? 1;
					} else if (visual.type === "circle") {
						width = (visual.radius ?? 0.5) * 2;
						height = (visual.radius ?? 0.5) * 2;
						shape = "circle";
					}
				}

				width *= entity.transform.scaleX ?? 1;
				height *= entity.transform.scaleY ?? 1;

				const angle =
					"angle" in entity.transform
						? entity.transform.angle
						: (entity.transform as any).rotationZ || 0;

				const left = toScreenX(entity.transform.x - width / 2);
				const top = toScreenY(entity.transform.y + height / 2);
				const widthPct = toScreenSize(width, "width");
				const heightPct = toScreenSize(height, "height");

				return (
					<View
						key={entity.id}
						style={[
							styles.entityBox,
							{
								left: `${left}%`,
								top: `${top}%`,
								width: `${widthPct}%`,
								height: `${heightPct}%`,
								borderRadius: shape === "circle" ? 999 : 0,
								transform: [{ rotate: `${angle}rad` }],
							},
						]}
					>
						<Text style={styles.entityLabel} numberOfLines={1}>
							{entity.name || entity.id}
						</Text>
						{entity.prefab && (
							<Text style={styles.prefabLabel} numberOfLines={1}>
								({entity.prefab})
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
