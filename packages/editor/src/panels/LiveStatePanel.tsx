import type { ReactGameState } from "@slopcade/game-runtime/BehaviorContext";
import type { RuntimeEntity } from "@slopcade/game-runtime/types";
import { useTheme } from "@slopcade/theme";
import { useCallback, useEffect, useState } from "react";
import {
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useEditor } from "../EditorProvider";

const isWeb = Platform.OS === "web";

interface VariableRowProps {
	label: string;
	value: any;
	onChange?: (val: any) => void;
	readonly?: boolean;
}

function VariableRow({ label, value, onChange, readonly }: VariableRowProps) {
	const { editorColors: c } = useTheme();
	const [localValue, setLocalValue] = useState(String(value));

	useEffect(() => {
		setLocalValue(String(value));
	}, [value]);

	const handleSubmit = () => {
		if (readonly || !onChange) return;

		let parsed: any = localValue;
		if (typeof value === "number") {
			parsed = parseFloat(localValue);
			if (isNaN(parsed)) return;
		} else if (typeof value === "boolean") {
			parsed = localValue === "true";
		}
		onChange(parsed);
	};

	return (
		<View style={styles.row}>
			<Text
				style={[styles.label, { color: c.textSecondary }]}
				numberOfLines={1}
				ellipsizeMode="middle"
			>
				{label}
			</Text>
			<TextInput
				style={[
					styles.input,
					{
						backgroundColor: readonly ? "transparent" : c.inputBg,
						color: readonly ? c.textMuted : c.inputText,
						borderColor: readonly ? "transparent" : c.inputBorder,
					},
				]}
				value={localValue}
				onChangeText={setLocalValue}
				onBlur={handleSubmit}
				onSubmitEditing={handleSubmit}
				editable={!readonly}
				placeholder={String(value)}
			/>
		</View>
	);
}

export function LiveStatePanel() {
	const { editorColors: c } = useTheme();
	const { runtimeRef } = useEditor();
	const [gameState, setGameState] = useState<ReactGameState | null>(null);
	const [entities, setEntities] = useState<
		{ id: string; name: string; x: number; y: number }[]
	>([]);

	useEffect(() => {
		const interval = setInterval(() => {
			if (runtimeRef.current) {
				const state = runtimeRef.current.getGameState();
				setGameState({ ...state });

				const entityManager = runtimeRef.current.getEntityManager();
				if (entityManager) {
					const allEntities = entityManager.getAllEntities();
					setEntities(
						allEntities.map((e: RuntimeEntity) => ({
							id: e.id,
							name: e.name,
							x: e.transform.x,
							y: e.transform.y,
						})),
					);
				}
			}
		}, 100);
		return () => clearInterval(interval);
	}, [runtimeRef]);

	const handleVariableChange = useCallback(
		(key: string, value: any) => {
			if (runtimeRef.current) {
				runtimeRef.current.setVariable(key, value);
			}
		},
		[runtimeRef],
	);

	if (!gameState) {
		return (
			<View style={[styles.container, { backgroundColor: c.panelBg }]}>
				<Text style={{ color: c.textMuted, padding: 12 }}>
					Waiting for runtime...
				</Text>
			</View>
		);
	}

	const roomVars = Object.entries(gameState.variables || {})
		.filter(([key]) => key.startsWith("room."))
		.sort((a, b) => a[0].localeCompare(b[0]));

	const gameVars = Object.entries(gameState.variables || {})
		.filter(([key]) => !key.startsWith("room."))
		.sort((a, b) => a[0].localeCompare(b[0]));

	return (
		<View style={[styles.container, { backgroundColor: c.panelBg }]}>
			{!isWeb && (
				<View style={[styles.header, { borderBottomColor: c.border }]}>
					<Text style={[styles.title, { color: c.text }]}>Live State</Text>
				</View>
			)}

			<ScrollView style={styles.content}>
				<View style={[styles.section, { borderBottomColor: c.border }]}>
					<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
						Variables
					</Text>
					{gameVars.length === 0 && (
						<Text style={{ color: c.textMuted, fontSize: 12 }}>
							No variables
						</Text>
					)}
					{gameVars.map(([key, value]) => (
						<VariableRow
							key={key}
							label={key}
							value={value}
							onChange={(val) => handleVariableChange(key, val)}
						/>
					))}
				</View>

				<View style={[styles.section, { borderBottomColor: c.border }]}>
					<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
						Room State
					</Text>
					{roomVars.length === 0 && (
						<Text style={{ color: c.textMuted, fontSize: 12 }}>
							Not in room
						</Text>
					)}
					{roomVars.map(([key, value]) => (
						<VariableRow
							key={key}
							label={key.replace("room.", "")}
							value={value}
							readonly
						/>
					))}
				</View>

				<View style={[styles.section, { borderBottomColor: c.border }]}>
					<Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
						Entities ({entities.length})
					</Text>
					{entities.map((entity) => (
						<View key={entity.id} style={styles.entityRow}>
							<Text
								style={[styles.entityName, { color: c.text }]}
								numberOfLines={1}
							>
								{entity.name}
							</Text>
							<Text style={[styles.entityPos, { color: c.textMuted }]}>
								{entity.x.toFixed(1)}, {entity.y.toFixed(1)}
							</Text>
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 12,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 14,
		fontWeight: "600",
	},
	content: {
		flex: 1,
	},
	section: {
		padding: 12,
		borderBottomWidth: 1,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "600",
		marginBottom: 8,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
	},
	label: {
		flex: 1,
		fontSize: 12,
		marginRight: 8,
	},
	input: {
		flex: 2,
		height: 24,
		paddingHorizontal: 6,
		paddingVertical: 0,
		fontSize: 12,
		borderWidth: 1,
		borderRadius: 4,
	},
	entityRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 2,
	},
	entityName: {
		fontSize: 12,
		flex: 1,
	},
	entityPos: {
		fontSize: 12,
		fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
	},
});
