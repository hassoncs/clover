import { Ionicons } from "@expo/vector-icons";
import {
	DndProvider,
	Draggable,
	Droppable,
	type ItemOptions,
	useActiveDropReaction,
} from "@mgcrea/react-native-dnd";
import { useRef, useState } from "react";
import {
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { runOnJS } from "react-native-reanimated";

const DEFAULT_TOKENS = [
	"The",
	"quick",
	"brown",
	"fox",
	"jumps",
	"over",
	"lazy",
	"dog",
	"is",
	"a",
	"an",
	"the",
	"my",
	"your",
	"our",
];

interface Token {
	id: string;
	text: string;
}

interface TokenComposerProps {
	onSubmit: (data: { tokens: string[] }) => void;
	timeLimit?: number;
	prompt?: string;
	tokens?: string[];
}

function TokenItem({
	token,
	isDragging,
}: {
	token: Token;
	isDragging?: boolean;
}) {
	return (
		<View style={[styles.token, isDragging && styles.tokenDragging]}>
			<Text style={styles.tokenText}>{token.text}</Text>
		</View>
	);
}

function DroppableArea({
	id,
	children,
	style,
}: {
	id: string;
	children: React.ReactNode;
	style?: any;
}) {
	const [isActive, setIsActive] = useState(false);

	useActiveDropReaction(id, (active) => {
		runOnJS(setIsActive)(active);
	});

	return (
		<Droppable id={id} style={[style, isActive && styles.droppableActive]}>
			{children}
		</Droppable>
	);
}

export function TokenComposer({
	onSubmit,
	timeLimit,
	prompt,
	tokens = DEFAULT_TOKENS,
}: TokenComposerProps) {
	const [bankTokens, setBankTokens] = useState<Token[]>(
		tokens.map((t, i) => ({ id: `bank-${i}-${t}`, text: t })),
	);
	const [composedTokens, setComposedTokens] = useState<Token[]>([]);

	const handleDragEnd = (event: {
		active: ItemOptions;
		over: ItemOptions | null;
	}) => {
		"worklet";
		const { active, over } = event;

		if (!over) return;

		const activeId = String(active.id);
		const overId = String(over.id);

		const findToken = (id: string) => {
			const inBank = bankTokens.find((t) => t.id === id);
			if (inBank) return { token: inBank, source: "bank" as const };
			const inComposed = composedTokens.find((t) => t.id === id);
			if (inComposed) return { token: inComposed, source: "composed" as const };
			return null;
		};

		const updateState = () => {
			const found = findToken(activeId);
			if (!found) return;

			const { token, source } = found;

			if (overId === "composition-area") {
				if (source === "bank") {
					setBankTokens((prev) => prev.filter((t) => t.id !== activeId));
					setComposedTokens((prev) => [...prev, token]);
				}
			} else if (overId === "bank-area") {
				if (source === "composed") {
					setComposedTokens((prev) => prev.filter((t) => t.id !== activeId));
					setBankTokens((prev) => [...prev, token]);
				}
			}
		};

		runOnJS(updateState)();
	};

	const handleSubmit = () => {
		onSubmit({ tokens: composedTokens.map((t) => t.text) });
	};

	return (
		<DndProvider onDragEnd={handleDragEnd}>
			<View style={styles.container}>
				{prompt && <Text style={styles.prompt}>{prompt}</Text>}

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Your Phrase</Text>
					<DroppableArea id="composition-area" style={styles.compositionArea}>
						{composedTokens.length === 0 ? (
							<Text style={styles.placeholderText}>
								Drag words here to compose...
							</Text>
						) : (
							<View style={styles.tokenContainer}>
								{composedTokens.map((token) => (
									<Draggable key={token.id} id={token.id}>
										<TokenItem token={token} />
									</Draggable>
								))}
							</View>
						)}
					</DroppableArea>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Word Bank</Text>
					<DroppableArea id="bank-area" style={styles.bankArea}>
						<View style={styles.tokenContainer}>
							{bankTokens.map((token) => (
								<Draggable key={token.id} id={token.id}>
									<TokenItem token={token} />
								</Draggable>
							))}
						</View>
					</DroppableArea>
				</View>

				<TouchableOpacity
					onPress={handleSubmit}
					disabled={composedTokens.length === 0}
					style={[
						styles.submitButton,
						composedTokens.length === 0 && styles.submitButtonDisabled,
					]}
				>
					<Text style={styles.submitButtonText}>Submit Phrase</Text>
				</TouchableOpacity>
			</View>
		</DndProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		backgroundColor: "#f9fafb",
		gap: 20,
	},
	prompt: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#111827",
		textAlign: "center",
		marginBottom: 10,
	},
	section: {
		gap: 8,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#4b5563",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	compositionArea: {
		minHeight: 120,
		backgroundColor: "#ffffff",
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "#e5e7eb",
		padding: 16,
		justifyContent: "center",
	},
	bankArea: {
		minHeight: 150,
		backgroundColor: "#f3f4f6",
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "transparent",
		padding: 16,
	},
	droppableActive: {
		borderColor: "#6366f1",
		backgroundColor: "rgba(99, 102, 241, 0.05)",
	},
	tokenContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	placeholderText: {
		color: "#9ca3af",
		textAlign: "center",
		fontSize: 16,
	},
	token: {
		backgroundColor: "#ffffff",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#d1d5db",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	tokenDragging: {
		opacity: 0.5,
		transform: [{ scale: 1.05 }],
		borderColor: "#6366f1",
	},
	tokenText: {
		fontSize: 16,
		fontWeight: "500",
		color: "#1f2937",
	},
	submitButton: {
		backgroundColor: "#111827",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		marginTop: "auto",
	},
	submitButtonDisabled: {
		backgroundColor: "#9ca3af",
		opacity: 0.7,
	},
	submitButtonText: {
		color: "#ffffff",
		fontSize: 18,
		fontWeight: "bold",
	},
});
