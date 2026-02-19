import { STYLE_PRESET_OPTIONS } from "@slopcade/shared/types/style-presets";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { trpcReact } from "@/lib/trpc/react";
import { CostPreview } from "../../economy/CostPreview";

interface QuickGenerationFormProps {
	gameId?: string;
	theme: string;
	onThemeChange: (theme: string) => void;
	style: string;
	onStyleChange: (style: string) => void;
	removeBackground: boolean;
	onRemoveBackgroundToggle: () => void;
	templateCount: number;
	isGenerating: boolean;
	isQuickCreating: boolean;
	progress: { completed: number; total: number };
	onGenerate: () => void;
}

export function QuickGenerationForm({
	gameId,
	theme,
	onThemeChange,
	style,
	onStyleChange,
	removeBackground,
	onRemoveBackgroundToggle,
	templateCount,
	isGenerating,
	isQuickCreating,
	progress,
	onGenerate,
}: QuickGenerationFormProps) {
	const isBusy = isQuickCreating || isGenerating;
	const {
		data: costData,
		isLoading: isCostLoading,
		error: costError,
	} = trpcReact.economy.estimateCost.useQuery(
		{ gameId: gameId!, regenerateAll: true },
		{ enabled: !!gameId },
	);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Generate All Assets</Text>
			<Text style={styles.subtitle}>
				Describe your game's visual theme and we'll generate sprites for all{" "}
				{templateCount} templates
			</Text>

			<TextInput
				style={styles.themeInput}
				placeholder="e.g., Dark fantasy medieval castle, spooky atmosphere..."
				placeholderTextColor="#6B7280"
				value={theme}
				onChangeText={onThemeChange}
				multiline
				numberOfLines={2}
				textAlignVertical="top"
			/>

			<View style={styles.styleRow}>
				{STYLE_PRESET_OPTIONS.map((option) => (
					<Pressable
						key={option.id}
						style={[
							styles.styleChip,
							style === option.id && styles.styleChipActive,
						]}
						onPress={() => onStyleChange(option.id)}
						accessibilityRole="button"
						accessibilityLabel={`Style: ${option.label}`}
						accessibilityState={{ selected: style === option.id }}
					>
						<Text style={styles.styleChipEmoji}>{option.emoji}</Text>
						<Text
							style={[
								styles.styleChipText,
								style === option.id && styles.styleChipTextActive,
							]}
						>
							{option.label}
						</Text>
					</Pressable>
				))}
				<Pressable
					style={[
						styles.styleChip,
						!STYLE_PRESET_OPTIONS.some((s) => s.id === style) &&
							styles.styleChipActive,
					]}
					onPress={() => {
						if (STYLE_PRESET_OPTIONS.some((s) => s.id === style)) {
							onStyleChange("");
						}
					}}
					accessibilityRole="button"
					accessibilityLabel="Style: Custom"
					accessibilityState={{
						selected: !STYLE_PRESET_OPTIONS.some((s) => s.id === style),
					}}
				>
					<Text style={styles.styleChipEmoji}>✨</Text>
					<Text
						style={[
							styles.styleChipText,
							!STYLE_PRESET_OPTIONS.some((s) => s.id === style) &&
								styles.styleChipTextActive,
						]}
					>
						Custom
					</Text>
				</Pressable>
			</View>
			{!STYLE_PRESET_OPTIONS.some((s) => s.id === style) && (
				<TextInput
					style={[styles.themeInput, { marginBottom: 16, minHeight: 40 }]}
					placeholder="Describe style (e.g., 'cyberpunk neon')"
					placeholderTextColor="#6B7280"
					value={style}
					onChangeText={onStyleChange}
				/>
			)}

			<Pressable
				style={styles.bgRemoveToggle}
				onPress={onRemoveBackgroundToggle}
				accessibilityRole="button"
				accessibilityLabel="Remove backgrounds"
				accessibilityState={{ checked: removeBackground }}
			>
				<View
					style={[styles.checkbox, removeBackground && styles.checkboxActive]}
				>
					{removeBackground && <Text style={styles.checkmark}>✓</Text>}
				</View>
				<Text style={styles.bgRemoveLabel}>
					Remove backgrounds (cleaner sprites)
				</Text>
			</Pressable>

			{gameId && (
				<View style={styles.costPreviewContainer}>
					<CostPreview
						gameId={gameId}
						data={costData}
						isLoading={isCostLoading}
						error={costError ?? null}
					/>
				</View>
			)}

			<Pressable
				style={[
					styles.quickGenerateButton,
					isBusy && styles.quickGenerateButtonDisabled,
				]}
				onPress={onGenerate}
				disabled={isBusy}
				accessibilityRole="button"
				accessibilityLabel={`Generate ${templateCount} Assets`}
				accessibilityState={{ disabled: isBusy }}
			>
				{isBusy ? (
					<View style={styles.generateButtonContent}>
						<ActivityIndicator size="small" color="#FFFFFF" />
						<Text style={styles.quickGenerateButtonText}>
							{isGenerating
								? `${progress.completed}/${progress.total} Generating...`
								: "Creating..."}
						</Text>
					</View>
				) : (
					<Text style={styles.quickGenerateButtonText}>
						Generate {templateCount} Assets
					</Text>
				)}
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: "#374151",
		borderRadius: 16,
		padding: 20,
		marginBottom: 20,
	},
	title: {
		color: "#FFFFFF",
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 8,
	},
	subtitle: {
		color: "#9CA3AF",
		fontSize: 14,
		marginBottom: 16,
		lineHeight: 20,
	},
	themeInput: {
		backgroundColor: "#1F2937",
		borderRadius: 12,
		padding: 14,
		color: "#FFFFFF",
		fontSize: 15,
		marginBottom: 16,
		minHeight: 60,
	},
	styleRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 20,
	},
	styleChip: {
		flex: 1,
		backgroundColor: "#1F2937",
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: "center",
		borderWidth: 2,
		borderColor: "transparent",
	},
	styleChipActive: {
		borderColor: "#4F46E5",
		backgroundColor: "#312E81",
	},
	styleChipEmoji: {
		fontSize: 20,
		marginBottom: 4,
	},
	styleChipText: {
		color: "#9CA3AF",
		fontSize: 12,
		fontWeight: "500",
	},
	styleChipTextActive: {
		color: "#FFFFFF",
	},
	bgRemoveToggle: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 16,
		paddingVertical: 8,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: "#6B7280",
		marginRight: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxActive: {
		backgroundColor: "#4F46E5",
		borderColor: "#4F46E5",
	},
	checkmark: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "700",
	},
	bgRemoveLabel: {
		color: "#D1D5DB",
		fontSize: 14,
	},
	costPreviewContainer: {
		marginBottom: 16,
	},
	quickGenerateButton: {
		backgroundColor: "#4F46E5",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
	},
	quickGenerateButtonDisabled: {
		backgroundColor: "#6366F1",
		opacity: 0.7,
	},
	quickGenerateButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "700",
	},
	generateButtonContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
});
