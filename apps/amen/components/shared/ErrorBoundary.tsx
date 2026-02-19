import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
	error: "#EF4444",
};

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	resetError = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<View style={styles.container}>
					<Text style={styles.title}>Something went wrong</Text>
					{this.state.error && (
						<Text style={styles.message}>{this.state.error.message}</Text>
					)}
					<Pressable
						style={styles.button}
						onPress={this.resetError}
						accessibilityRole="button"
						accessibilityLabel="Try again"
					>
						<Text style={styles.buttonText}>Try Again</Text>
					</Pressable>
				</View>
			);
		}

		return this.props.children;
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: AMEN.background,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	title: {
		color: AMEN.error,
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 8,
	},
	message: {
		color: AMEN.textTertiary,
		fontSize: 14,
		textAlign: "center",
		marginBottom: 24,
	},
	button: {
		backgroundColor: AMEN.surface,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	buttonText: {
		color: AMEN.text,
		fontSize: 16,
		fontWeight: "500",
	},
});
