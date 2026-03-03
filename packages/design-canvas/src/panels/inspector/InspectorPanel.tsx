import { useTheme } from "@slopcade/theme";
import React from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { usePenRuntime } from "../PenRuntimeContext";

export function InspectorPanel() {
	const { editorColors: c } = useTheme();
	const { graph, facade, selectedId, commitMutation, revision } =
		usePenRuntime();

	// We depend on revision to re-render when graph mutates
	const node = selectedId ? graph.getNode(selectedId) : null;

	if (!node) {
		return (
			<View
				style={[
					styles.container,
					{ backgroundColor: c.panelBg, borderLeftColor: c.border },
				]}
			>
				<Text style={[styles.emptyText, { color: c.textSecondary }]}>
					No selection
				</Text>
			</View>
		);
	}

	const updateField = (field: string, value: any) => {
		if (!selectedId) return;
		facade.updateNode(selectedId, { [field]: value });
		commitMutation();
	};

	const updateNumberField = (field: string, value: string) => {
		const num = parseFloat(value);
		if (!isNaN(num)) {
			updateField(field, num);
		}
	};

	return (
		<ScrollView
			style={[
				styles.container,
				{ backgroundColor: c.panelBg, borderLeftColor: c.border },
			]}
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>INSPECTOR</Text>
			</View>

			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
					Position & Size
				</Text>
				<View style={styles.row}>
					<View style={styles.field}>
						<Text style={[styles.label, { color: c.textSecondary }]}>X</Text>
						<TextInput
							style={[
								styles.input,
								{
									color: c.text,
									borderColor: c.border,
									backgroundColor: c.surface,
								},
							]}
							value={node.x?.toString() ?? "0"}
							onChangeText={(v) => updateNumberField("x", v)}
							keyboardType="numeric"
						/>
					</View>
					<View style={styles.field}>
						<Text style={[styles.label, { color: c.textSecondary }]}>Y</Text>
						<TextInput
							style={[
								styles.input,
								{
									color: c.text,
									borderColor: c.border,
									backgroundColor: c.surface,
								},
							]}
							value={node.y?.toString() ?? "0"}
							onChangeText={(v) => updateNumberField("y", v)}
							keyboardType="numeric"
						/>
					</View>
				</View>
				<View style={styles.row}>
					<View style={styles.field}>
						<Text style={[styles.label, { color: c.textSecondary }]}>W</Text>
						<TextInput
							style={[
								styles.input,
								{
									color: c.text,
									borderColor: c.border,
									backgroundColor: c.surface,
								},
							]}
							value={node.width?.toString() ?? "0"}
							onChangeText={(v) => updateNumberField("width", v)}
							keyboardType="numeric"
						/>
					</View>
					<View style={styles.field}>
						<Text style={[styles.label, { color: c.textSecondary }]}>H</Text>
						<TextInput
							style={[
								styles.input,
								{
									color: c.text,
									borderColor: c.border,
									backgroundColor: c.surface,
								},
							]}
							value={node.height?.toString() ?? "0"}
							onChangeText={(v) => updateNumberField("height", v)}
							keyboardType="numeric"
						/>
					</View>
				</View>
			</View>

			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
					Fill
				</Text>
				<TextInput
					style={[
						styles.input,
						{
							color: c.text,
							borderColor: c.border,
							backgroundColor: c.surface,
						},
					]}
					value={typeof node.fill === "string" ? node.fill : ""}
					onChangeText={(v) => updateField("fill", v)}
					placeholder="e.g. #FF0000"
					placeholderTextColor={c.textSecondary}
				/>
			</View>

			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
					Stroke
				</Text>
				<TextInput
					style={[
						styles.input,
						{
							color: c.text,
							borderColor: c.border,
							backgroundColor: c.surface,
						},
					]}
					value={typeof node.stroke === "string" ? node.stroke : ""}
					onChangeText={(v) => updateField("stroke", v)}
					placeholder="e.g. #000000"
					placeholderTextColor={c.textSecondary}
				/>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		width: 240,
		borderLeftWidth: 1,
	},
	emptyText: {
		padding: 20,
		textAlign: "center",
		fontSize: 13,
	},
	header: {
		padding: 12,
		borderBottomWidth: 1,
		height: 48,
		justifyContent: "center",
	},
	title: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
	section: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0,0,0,0.05)",
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "600",
		marginBottom: 12,
		textTransform: "uppercase",
	},
	row: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 8,
	},
	field: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	label: {
		fontSize: 11,
		width: 12,
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		fontSize: 12,
	},
});
