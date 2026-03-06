import { Ionicons } from "@expo/vector-icons";
import { GraphEditor } from "@slopcade/editor";
import { EffectsGraphAdapter } from "@slopcade/shared/graph-adapters/effects";
import { useTheme } from "@slopcade/theme";
import type { GraphDocument } from "@slopcade/shared/graph-core";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface ShaderEditorOverlayProps {
	effectNode: import("@slopcade/shared/types/pen").PenEffectNode;
	onClose: () => void;
	onChange: (
		nodeId: string,
		graphSpec: any,
		shaderCode: string,
		uniforms: Record<string, any>,
	) => void;
}

export function ShaderEditorOverlay({
	effectNode,
	onClose,
	onChange,
}: ShaderEditorOverlayProps) {
	const { editorColors: c } = useTheme();
	const adapter = useMemo(() => new EffectsGraphAdapter(), []);

	const initialDocument = useMemo(() => {
		if (effectNode.graphSpec) {
			try {
				return adapter.toGeneric(effectNode.graphSpec);
			} catch (err) {
				console.warn("Failed to parse graphSpec", err);
			}
		}
		return undefined;
	}, [adapter, effectNode.graphSpec]);

	const handleDocumentChange = useCallback(
		(doc: GraphDocument) => {
			try {
				const spec = adapter.fromGeneric(doc);
				const { compileGraph } = require("@slopcade/shared/effects/compiler");
				const result = compileGraph(spec);
				
				if (result.success && result.plan && result.plan.passes.length > 0) {
					// Extract the first pass GLSL for the live preview
					const firstPass = result.plan.passes[0];
					const shaderCode = firstPass.shaderSource.glsl;
					// Extract default uniforms from the spec params
					const uniforms: Record<string, any> = {};
					for (const node of spec.nodes) {
						if (node.params) {
							Object.assign(uniforms, node.params);
						}
					}
					onChange(effectNode.id, spec, shaderCode, uniforms);
				}
			} catch (err) {
				console.warn("Shader compile error:", err);
			}
		},
		[adapter, effectNode.id, onChange],
	);

	return (
		<View style={[styles.container, { backgroundColor: c.panelBg }]}>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>
					LIVE SHADER REGION
				</Text>
				<Pressable onPress={onClose} style={styles.closeButton}>
					<Ionicons name="close" size={20} color={c.text} />
				</Pressable>
			</View>
			<View style={styles.content}>
				<GraphEditor 
					documentId={effectNode.id} 
					initialDocument={initialDocument}
					adapter={adapter} 
					onDocumentChange={handleDocumentChange}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		zIndex: 1000,
		flexDirection: "column",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		height: 48,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	closeButton: {
		padding: 4,
	},
	content: {
		flex: 1,
	},
});
