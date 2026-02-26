import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@slopcade/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppHeaderAction {
	icon: keyof typeof Ionicons.glyphMap;
	onPress?: () => void;
}

interface AppFrameHeaderProps {
	title?: string;
	rightActions?: AppHeaderAction[];
}

function HeaderIconButton({
	icon,
	onPress,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	onPress?: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			style={styles.iconButton}
			hitSlop={8}
			accessibilityRole="button"
			accessibilityLabel={`${icon} button`}
		>
			<Ionicons name={icon} size={24} color={tokens.colors.text.primary} />
		</Pressable>
	);
}

export function AppFrameHeader({ title, rightActions }: AppFrameHeaderProps) {
	const insets = useSafeAreaInsets();
	const resolvedRightActions = rightActions ?? [];

	return (
		<View style={[styles.container, { paddingTop: insets.top + 6 }]}>
			<View style={styles.row}>
				<View style={styles.sideRow} />

				{!!title && (
					<Text style={styles.title} numberOfLines={1}>
						{title}
					</Text>
				)}

				<View style={[styles.sideRow, styles.rightRow]}>
					{resolvedRightActions.map((action) => (
						<HeaderIconButton
							key={action.icon}
							icon={action.icon}
							onPress={action.onPress}
						/>
					))}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: tokens.colors.background,
		paddingHorizontal: 14,
		paddingBottom: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: tokens.colors.border,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		minHeight: 38,
	},
	sideRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		width: 96,
	},
	rightRow: {
		justifyContent: "flex-end",
	},
	iconButton: {
		width: 34,
		height: 34,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 17,
	},
	title: {
		position: "absolute",
		left: 0,
		right: 0,
		color: tokens.colors.text.primary,
		fontSize: 20,
		lineHeight: 26,
		fontFamily: "Cinzel_700Bold",
		letterSpacing: 2,
		textAlign: "center",
		pointerEvents: "none" as const,
	},
});
