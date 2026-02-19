import { useState } from "react";
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { trpcReact } from "@/lib/trpc/react";

interface InviteCodeInputProps {
	onValidated: (code: string) => void;
}

export function InviteCodeInput({ onValidated }: InviteCodeInputProps) {
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isValidating, setIsValidating] = useState(false);
	const [isValid, setIsValid] = useState(false);

	const validateQuery = trpcReact.economy.validateSignupCode.useQuery(
		{ code: code.trim() },
		{
			enabled: false,
			retry: false,
		},
	);

	const handleValidate = async () => {
		if (!code.trim()) {
			setError("Please enter an invite code");
			return;
		}

		setError(null);
		setIsValidating(true);

		try {
			const validation = await validateQuery.refetch();

			if (validation.data?.valid) {
				setIsValid(true);
				onValidated(code.trim());
			} else {
				const errorMsg =
					!validation.data?.valid && "error" in (validation.data || {})
						? (validation.data as { error: string }).error
						: "Invalid invite code";
				setError(errorMsg);
			}
		} catch (err) {
			setError("Failed to validate code");
		} finally {
			setIsValidating(false);
		}
	};

	if (isValid) {
		return (
			<View className="w-full bg-theme-success/30 p-4 rounded-xl border border-theme-success mb-4">
				<Text className="text-theme-success text-center font-semibold">
					✓ Invite code verified
				</Text>
				<Text className="text-theme-success text-center text-sm mt-1">
					You can now sign in below
				</Text>
			</View>
		);
	}

	return (
		<View className="w-full bg-theme-surface/50 p-4 rounded-xl border border-theme-border mb-4">
			<Text className="text-theme-text font-semibold text-center mb-2">
				🎫 Have an Invite Code?
			</Text>
			<Text className="text-theme-text-secondary text-center text-sm mb-3">
				Amen is invite-only during beta
			</Text>

			<View className="mb-2">
				<TextInput
					className="bg-theme-surface border border-theme-border rounded-xl px-4 py-3 text-theme-text text-center font-bold tracking-widest"
					placeholder="ENTER INVITE CODE"
					placeholderTextColor="#A89B7D"
					value={code}
					onChangeText={(text) => {
						setCode(text.toUpperCase());
						setError(null);
					}}
					autoCapitalize="characters"
					autoCorrect={false}
					editable={!isValidating}
					accessibilityLabel="Invite code input"
				/>
				{error && (
					<Text className="text-theme-error text-center mt-2 text-sm">
						{error}
					</Text>
				)}
			</View>

			<TouchableOpacity
				className={`w-full py-3 rounded-xl items-center ${
					isValidating || !code.trim()
						? "bg-theme-surface-elevated"
						: "bg-theme-primary active:bg-theme-primary/90"
				}`}
				onPress={handleValidate}
				disabled={isValidating || !code.trim()}
				accessibilityRole="button"
				accessibilityLabel="Verify invite code"
				accessibilityState={{ disabled: isValidating || !code.trim() }}
			>
				{isValidating ? (
					<ActivityIndicator color="#FDF8F0" />
				) : (
					<Text className="text-theme-secondary font-bold">
						Verify Invite Code
					</Text>
				)}
			</TouchableOpacity>
		</View>
	);
}
