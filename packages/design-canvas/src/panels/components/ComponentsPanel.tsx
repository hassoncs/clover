import { useTheme } from "@slopcade/theme";
import React from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { usePenRuntime } from "../PenRuntimeContext";

export function ComponentsPanel() {
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
					{ backgroundColor: c.panelBg, borderRightColor: c.border },
				]}
			>
				<Text style={[styles.emptyText, { color: c.textSecondary }]}>
					No selection
				</Text>
			</View>
		);
	}

	const isComponent = node.reusable === true;
	const isInstance = node.type === "ref";
	const canBeComponent =
		!isComponent &&
		!isInstance &&
		(node.type === "frame" || node.type === "group");

	const handleMakeComponent = () => {
		if (!selectedId) return;
		facade.updateNode(selectedId, { reusable: true });
		commitMutation();
	};

	const handleMakeInstance = () => {
		if (!selectedId) return;
		// Create an instance of the selected component
		const parentId = node.parentId ?? graph.rootId;
		facade.createNode("ref", parentId, {
			ref: selectedId,
			x: (node.x ?? 0) + 20,
			y: (node.y ?? 0) + 20,
		});
		commitMutation();
	};

	const handleResetOverrides = () => {
		if (!selectedId) return;
		facade.updateNode(selectedId, { descendants: {} });
		commitMutation();
	};

	return (
		<ScrollView
			style={[
				styles.container,
				{ backgroundColor: c.panelBg, borderRightColor: c.border },
			]}
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<Text style={[styles.title, { color: c.text }]}>COMPONENTS</Text>
			</View>

			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
					Status
				</Text>
				<Text style={[styles.statusText, { color: c.text }]}>
					{isComponent ? "Component" : isInstance ? "Instance" : "Regular Node"}
				</Text>
			</View>

			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
					Actions
				</Text>

				{canBeComponent && (
					<TouchableOpacity
						style={[
							styles.button,
							{ backgroundColor: c.surface, borderColor: c.border },
						]}
						onPress={handleMakeComponent}
					>
						<Text style={[styles.buttonText, { color: c.text }]}>
							Make Component
						</Text>
					</TouchableOpacity>
				)}

				{isComponent && (
					<TouchableOpacity
						style={[
							styles.button,
							{ backgroundColor: c.surface, borderColor: c.border },
						]}
						onPress={handleMakeInstance}
					>
						<Text style={[styles.buttonText, { color: c.text }]}>
							Create Instance
						</Text>
					</TouchableOpacity>
				)}

				{isInstance && (
					<>
						<TouchableOpacity
							style={[
								styles.button,
								{
									backgroundColor: c.surface,
									borderColor: c.border,
									marginBottom: 8,
								},
							]}
							onPress={handleResetOverrides}
						>
							<Text style={[styles.buttonText, { color: c.text }]}>
								Reset All Overrides
							</Text>
						</TouchableOpacity>

						<Text
							style={[
								styles.sectionTitle,
								{ color: c.textSecondary, marginTop: 12 },
							]}
						>
							Overrides
						</Text>
						{node.descendants && Object.keys(node.descendants).length > 0 ? (
							Object.entries(node.descendants).map(([path, override]) => (
								<View key={path} style={styles.overrideRow}>
									<Text
										style={[styles.overridePath, { color: c.textSecondary }]}
									>
										{path}
									</Text>
									<Text
										style={[styles.overrideValue, { color: c.text }]}
										numberOfLines={1}
									>
										{JSON.stringify(override)}
									</Text>
								</View>
							))
						) : (
							<Text
								style={[
									styles.emptyText,
									{ color: c.textSecondary, padding: 0 },
								]}
							>
								No overrides
							</Text>
						)}
					</>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		width: 240,
		borderRightWidth: 1,
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
	statusText: {
		fontSize: 13,
		fontWeight: "500",
	},
	button: {
		borderWidth: 1,
		borderRadius: 4,
		paddingVertical: 8,
		alignItems: "center",
	},
	buttonText: {
		fontSize: 12,
		fontWeight: "500",
	},
	overrideRow: {
		marginBottom: 8,
	},
	overridePath: {
		fontSize: 11,
		marginBottom: 2,
	},
	overrideValue: {
		fontSize: 12,
	},
});
