import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

const AMEN = {
	background: "#0D1C33",
	surface: "#152A4D",
	surfaceElevated: "#1E3866",
	border: "#2A4A80",
	text: "#FDF8F0",
	textSecondary: "#A89B7D",
	textTertiary: "#6B7280",
	primary: "#C9A84C",
	secondary: "#1B3A6B",
};

interface SearchInputProps {
	value: string;
	onChangeText: (text: string) => void;
	onSubmit?: (text: string) => void;
	placeholder?: string;
	autoFocus?: boolean;
}

export function SearchInput({
	value,
	onChangeText,
	onSubmit,
	placeholder = "Search...",
	autoFocus = false,
}: SearchInputProps) {
	const inputRef = useRef<TextInput>(null);

	const handleClear = useCallback(() => {
		onChangeText("");
		inputRef.current?.focus();
	}, [onChangeText]);

	const handleSubmitEditing = useCallback(() => {
		const trimmed = value.trim();
		if (trimmed && onSubmit) {
			onSubmit(trimmed);
		}
	}, [value, onSubmit]);

	return (
		<View style={styles.container}>
			<Ionicons
				name="search"
				size={20}
				color={AMEN.textSecondary}
				style={styles.icon}
			/>
			<TextInput
				ref={inputRef}
				style={styles.input}
				value={value}
				onChangeText={onChangeText}
				onSubmitEditing={handleSubmitEditing}
				placeholder={placeholder}
				placeholderTextColor={AMEN.textSecondary}
				autoCapitalize="none"
				autoCorrect={false}
				autoFocus={autoFocus}
				returnKeyType="search"
				blurOnSubmit={false}
				accessibilityLabel="Search"
			/>
			{value.length > 0 && (
				<Pressable
					onPress={handleClear}
					style={styles.clearButton}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Clear search"
				>
					<Ionicons name="close-circle" size={18} color={AMEN.textSecondary} />
				</Pressable>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		height: 48,
		backgroundColor: AMEN.surface,
		borderRadius: 24,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: AMEN.border,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		gap: 10,
	},
	icon: {
		flexShrink: 0,
	},
	input: {
		flex: 1,
		color: AMEN.text,
		fontSize: 16,
		lineHeight: 20,
	},
	clearButton: {
		flexShrink: 0,
		width: 28,
		height: 28,
		alignItems: "center",
		justifyContent: "center",
	},
});
