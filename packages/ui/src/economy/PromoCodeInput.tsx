import { useState } from "react";
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

interface PromoCodeInputProps {
	onRedeem?: (
		code: string,
	) => Promise<{ message: string; alreadyRedeemed?: boolean }>;
}

export function PromoCodeInput({ onRedeem }: PromoCodeInputProps) {
	const [code, setCode] = useState("");
	const [message, setMessage] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);
	const [isRedeeming, setIsRedeeming] = useState(false);

	const handleRedeem = async () => {
		if (!code.trim() || !onRedeem) return;
		setMessage(null);
		setIsRedeeming(true);
		try {
			const result = await onRedeem(code.trim());
			if (result.alreadyRedeemed) {
				setMessage({ text: result.message, type: "error" });
			} else {
				setMessage({ text: result.message, type: "success" });
				setCode("");
			}
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to redeem";
			setMessage({ text: errorMessage, type: "error" });
		} finally {
			setIsRedeeming(false);
		}
	};

	return (
		<View className="bg-gray-100 p-4 rounded-lg">
			<Text className="text-lg font-bold mb-2 text-gray-800">
				Redeem Promo Code
			</Text>

			<View className="flex-row gap-2">
				<TextInput
					className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-800"
					placeholder="Enter code"
					value={code}
					onChangeText={(text) => setCode(text.toUpperCase())}
					autoCapitalize="characters"
					editable={!isRedeeming}
					accessibilityLabel="Promo code input"
				/>
				<TouchableOpacity
					className={`bg-amber-500 px-4 py-2 rounded justify-center items-center ${isRedeeming ? "opacity-50" : ""}`}
					onPress={handleRedeem}
					disabled={isRedeeming || !code.trim()}
					accessibilityRole="button"
					accessibilityLabel="Redeem promo code"
					accessibilityState={{ disabled: isRedeeming || !code.trim() }}
				>
					{isRedeeming ? (
						<ActivityIndicator color="white" size="small" />
					) : (
						<Text className="text-white font-bold">Redeem</Text>
					)}
				</TouchableOpacity>
			</View>

			{message && (
				<Text
					className={`mt-2 text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}
				>
					{message.text}
				</Text>
			)}
		</View>
	);
}
