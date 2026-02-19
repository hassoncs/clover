import { useState } from "react";
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { trpcReact } from "@/lib/trpc/react";

export function PromoCodeInput() {
	const [code, setCode] = useState("");
	const [message, setMessage] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);

	const redeemMutation = trpcReact.economy.redeemPromoCode.useMutation({
		onSuccess: (data) => {
			if ("alreadyRedeemed" in data && data.alreadyRedeemed) {
				setMessage({ text: data.message, type: "error" });
			} else {
				setMessage({ text: data.message, type: "success" });
				setCode("");
			}
		},
		onError: (error) => {
			setMessage({ text: error.message, type: "error" });
		},
	});

	const handleRedeem = () => {
		if (!code.trim()) return;
		setMessage(null);
		redeemMutation.mutate({ code: code.trim() });
	};

	return (
		<View className="bg-theme-surface-elevated p-4 rounded-lg">
			<Text className="text-lg font-bold mb-2 text-theme-text">
				Redeem Promo Code
			</Text>

			<View className="flex-row gap-2">
				<TextInput
					className="flex-1 bg-theme-surface border border-theme-border rounded px-3 py-2 text-theme-text"
					placeholder="Enter code"
					placeholderTextColor="#A89B7D"
					value={code}
					onChangeText={(text) => setCode(text.toUpperCase())}
					autoCapitalize="characters"
					editable={!redeemMutation.isPending}
					accessibilityLabel="Promo code input"
				/>
				<TouchableOpacity
					className={`bg-theme-warning px-4 py-2 rounded justify-center items-center ${redeemMutation.isPending ? "opacity-50" : ""}`}
					onPress={handleRedeem}
					disabled={redeemMutation.isPending || !code.trim()}
					accessibilityRole="button"
					accessibilityLabel="Redeem promo code"
					accessibilityState={{
						disabled: redeemMutation.isPending || !code.trim(),
					}}
				>
					{redeemMutation.isPending ? (
						<ActivityIndicator color="#FDF8F0" size="small" />
					) : (
						<Text className="text-theme-text-inverse font-bold">Redeem</Text>
					)}
				</TouchableOpacity>
			</View>

			{message && (
				<Text
					className={`mt-2 text-sm ${message.type === "success" ? "text-theme-success" : "text-theme-error"}`}
				>
					{message.text}
				</Text>
			)}
		</View>
	);
}
