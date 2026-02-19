import { useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface SignupCodeGateProps {
	visible: boolean;
	onDismiss: () => void;
	onSuccess: () => void;
	onValidateCode: (code: string) => Promise<{ valid: boolean; error?: string }>;
	onRedeemCode: (code: string) => Promise<void>;
}

export function SignupCodeGate({
	visible,
	onDismiss,
	onSuccess,
	onValidateCode,
	onRedeemCode,
}: SignupCodeGateProps) {
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isValidating, setIsValidating] = useState(false);
	const [isRedeeming, setIsRedeeming] = useState(false);

	const handleSubmit = async () => {
		if (!code.trim()) return;

		setError(null);
		setIsValidating(true);

		try {
			const validation = await onValidateCode(code.trim());

			if (validation.valid) {
				setIsValidating(false);
				setIsRedeeming(true);
				try {
					await onRedeemCode(code.trim());
					onSuccess();
				} catch (err: unknown) {
					setError(
						err instanceof Error ? err.message : "Failed to redeem code",
					);
				} finally {
					setIsRedeeming(false);
				}
			} else {
				setError(validation.error ?? "Invalid code");
				setIsValidating(false);
			}
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to validate code");
			setIsValidating(false);
		}
	};

	if (!visible) return null;

	const isLoading = isValidating || isRedeeming;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onDismiss}
		>
			<View className="flex-1 justify-center items-center bg-black/80 px-4">
				<View className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-xl">
					<Text className="text-2xl font-bold text-white text-center mb-2">
						Have a Signup Code?
					</Text>

					<Text className="text-gray-400 text-center mb-6">
						Enter your code to unlock 1,000 Sparks ($1.00) for generating game
						assets.
					</Text>

					<View className="mb-4">
						<TextInput
							className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg text-center font-bold tracking-widest"
							placeholder="ENTER CODE"
							placeholderTextColor="#666"
							value={code}
							onChangeText={(text) => {
								setCode(text.toUpperCase());
								setError(null);
							}}
							autoCapitalize="characters"
							autoCorrect={false}
							editable={!isLoading}
							accessibilityLabel="Signup code input"
						/>
						{error && (
							<Text className="text-red-400 text-center mt-2 text-sm">
								{error}
							</Text>
						)}
					</View>

					<TouchableOpacity
						className={`w-full py-4 rounded-xl items-center mb-3 ${
							isLoading || !code.trim()
								? "bg-gray-700"
								: "bg-green-600 active:bg-green-700"
						}`}
						onPress={handleSubmit}
						disabled={isLoading || !code.trim()}
						accessibilityRole="button"
						accessibilityLabel="Redeem signup code"
						accessibilityState={{ disabled: isLoading || !code.trim() }}
					>
						{isLoading ? (
							<ActivityIndicator color="white" />
						) : (
							<Text className="text-white font-bold text-lg">
								Redeem & Start
							</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity
						className="py-2"
						onPress={onDismiss}
						disabled={isLoading}
						accessibilityRole="button"
						accessibilityLabel="Skip signup code"
						accessibilityState={{ disabled: isLoading }}
					>
						<Text className="text-gray-500 text-center font-medium">
							I don't have a code (Skip)
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}
