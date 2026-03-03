import type { PenVariable } from "@slopcade/shared/types/pen";
import { useTheme } from "@slopcade/theme";
import React, { useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { usePenRuntime } from "../PenRuntimeContext";

export function VariablesPanel() {
	const { editorColors: c } = useTheme();
	const { graph, selectedId, commitMutation, revision } = usePenRuntime();

	const [newVarName, setNewVarName] = useState("");
	const [newVarValue, setNewVarValue] = useState("");

	// We depend on revision to re-render when graph mutates
	const node = selectedId ? graph.getNode(selectedId) : null;

	const handleCreateVariable = () => {
		if (!newVarName || !newVarValue) return;
		if (graph.variables.has(newVarName)) return;

		const variable: PenVariable = {
			type: "string", // Defaulting to string for simplicity, could be inferred
			value: newVarValue,
		};

		graph.variables.set(newVarName, variable);
		setNewVarName("");
		setNewVarValue("");
		commitMutation();
	};

	const handleDeleteVariable = (name: string) => {
		graph.variables.delete(name);
		commitMutation();
	};

	const handleUpdateVariable = (name: string, value: string) => {
		const existing = graph.variables.get(name);
		if (existing) {
			graph.variables.set(name, { ...existing, value });
			commitMutation();
		}
	};

	const variablesList = Array.from(graph.variables.entries());

	return (
		<ScrollView
			style={[
				styles.container,
				{ backgroundColor: c.panelBg, borderRightColor: c.border },
			]}
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>VARIABLES</Text>
			</View>

			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
					Create Variable
				</Text>
				<View style={styles.row}>
					<TextInput
						style={[
							styles.input,
							{
								color: c.text,
								borderColor: c.border,
								backgroundColor: c.surface,
							},
						]}
						value={newVarName}
						onChangeText={setNewVarName}
						placeholder="Name"
						placeholderTextColor={c.textSecondary}
					/>
					<TextInput
						style={[
							styles.input,
							{
								color: c.text,
								borderColor: c.border,
								backgroundColor: c.surface,
							},
						]}
						value={newVarValue}
						onChangeText={setNewVarValue}
						placeholder="Value"
						placeholderTextColor={c.textSecondary}
					/>
				</View>
				<TouchableOpacity
					style={[
						styles.button,
						{ backgroundColor: c.surface, borderColor: c.border },
					]}
					onPress={handleCreateVariable}
				>
					<Text style={[styles.buttonText, { color: c.text }]}>Add</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
					All Variables
				</Text>
				{variablesList.length === 0 ? (
					<Text style={[styles.emptyText, { color: c.textSecondary }]}>
						No variables defined
					</Text>
				) : (
					variablesList.map(([name, variable]) => (
						<View key={name} style={styles.variableRow}>
							<Text style={[styles.variableName, { color: c.text }]}>
								{name}
							</Text>
							<TextInput
								style={[
									styles.input,
									{
										color: c.text,
										borderColor: c.border,
										backgroundColor: c.surface,
										flex: 1,
									},
								]}
								value={String(variable.value)}
								onChangeText={(v) => handleUpdateVariable(name, v)}
							/>
							<TouchableOpacity
								style={[
									styles.deleteButton,
									{ backgroundColor: c.surface, borderColor: c.border },
								]}
								onPress={() => handleDeleteVariable(name)}
							>
								<Text style={[styles.buttonText, { color: c.text }]}>X</Text>
							</TouchableOpacity>
						</View>
					))
				)}
			</View>

			{node && node.theme && Object.keys(node.theme).length > 0 && (
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
						Bound to Selection
					</Text>
					{Object.entries(node.theme).map(([prop, varName]) => (
						<View key={prop} style={styles.boundRow}>
							<Text style={[styles.boundProp, { color: c.textSecondary }]}>
								{prop}
							</Text>
							<Text style={[styles.boundVar, { color: c.text }]}>
								{varName}
							</Text>
						</View>
					))}
				</View>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		width: 240,
		borderRightWidth: 1,
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
	input: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		fontSize: 12,
	},
	button: {
		borderWidth: 1,
		borderRadius: 4,
		paddingVertical: 6,
		alignItems: "center",
	},
	buttonText: {
		fontSize: 12,
		fontWeight: "500",
	},
	emptyText: {
		fontSize: 12,
		fontStyle: "italic",
	},
	variableRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 8,
	},
	variableName: {
		fontSize: 12,
		width: 60,
	},
	deleteButton: {
		borderWidth: 1,
		borderRadius: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	boundRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	boundProp: {
		fontSize: 12,
	},
	boundVar: {
		fontSize: 12,
		fontWeight: "500",
	},
});
