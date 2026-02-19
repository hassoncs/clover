import { useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";

interface BuyGemsModalProps {
	visible: boolean;
	onClose: () => void;
}

interface GemPack {
	id: string;
	name: string;
	gems: number;
	price: string;
	bonus?: string;
	popular?: boolean;
}

const GEM_PACKS: GemPack[] = [
	{ id: "starter", name: "Starter Pack", gems: 100, price: "$0.99" },
	{ id: "basic", name: "Basic Pack", gems: 500, price: "$4.99" },
	{
		id: "popular",
		name: "Popular Pack",
		gems: 1200,
		price: "$9.99",
		bonus: "+200 bonus",
		popular: true,
	},
	{
		id: "mega",
		name: "Mega Pack",
		gems: 2500,
		price: "$19.99",
		bonus: "+500 bonus",
	},
	{
		id: "ultimate",
		name: "Ultimate Pack",
		gems: 6000,
		price: "$49.99",
		bonus: "+1500 bonus",
	},
];

export function BuyGemsModal({ visible, onClose }: BuyGemsModalProps) {
	const [promoCode, setPromoCode] = useState("");
	const [promoMessage, setPromoMessage] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);

	const redeemPromoMutation = trpcReact.economy.redeemPromoCode.useMutation({
		onSuccess: (data) => {
			if ("alreadyRedeemed" in data && data.alreadyRedeemed) {
				setPromoMessage({ text: data.message, type: "error" });
			} else {
				setPromoMessage({ text: data.message, type: "success" });
				setPromoCode("");
			}
		},
		onError: (error) => {
			setPromoMessage({ text: error.message, type: "error" });
		},
	});

	const handleRedeemPromo = () => {
		if (!promoCode.trim()) return;
		setPromoMessage(null);
		redeemPromoMutation.mutate({ code: promoCode.trim() });
	};

	const handlePurchasePack = (pack: GemPack) => {
		console.log("Purchase pack:", pack.id);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<SafeAreaView className="flex-1 bg-theme-background">
				<View className="flex-row justify-between items-center px-4 py-3 border-b border-theme-border">
					<Text className="text-xl font-bold text-theme-text">Buy Gems 💎</Text>
					<Pressable
						onPress={onClose}
						accessibilityRole="button"
						accessibilityLabel="Close"
					>
						<Text className="text-theme-text-secondary text-lg">✕</Text>
					</Pressable>
				</View>

				<ScrollView className="flex-1">
					<View className="p-4">
						<Text className="text-theme-text-secondary text-center mb-6">
							Premium currency for exclusive items, boosts, and cosmetics
						</Text>

						{GEM_PACKS.map((pack) => (
							<Pressable
								key={pack.id}
								className={`bg-theme-surface-elevated border rounded-xl p-4 mb-3 active:opacity-80 ${
									pack.popular ? "border-theme-primary" : "border-theme-border"
								}`}
								onPress={() => handlePurchasePack(pack)}
								accessibilityRole="button"
								accessibilityLabel={`Buy ${pack.name}, ${pack.gems} gems for ${pack.price}`}
							>
								{pack.popular && (
									<View className="absolute -top-2 left-1/2 -ml-12 bg-theme-primary px-3 py-1 rounded-full">
										<Text className="text-theme-text-inverse text-xs font-bold">
											POPULAR
										</Text>
									</View>
								)}

								<View className="flex-row items-center justify-between">
									<View className="flex-1">
										<Text className="text-theme-text font-bold text-lg">
											{pack.name}
										</Text>
										<View className="flex-row items-baseline mt-1">
											<Text className="text-theme-primary font-bold text-2xl">
												{pack.gems}
											</Text>
											<Text className="text-theme-text-secondary ml-1">
												gems
											</Text>
											{pack.bonus && (
												<View className="bg-theme-success/20 px-2 py-0.5 rounded-full ml-2">
													<Text className="text-theme-success text-xs font-bold">
														{pack.bonus}
													</Text>
												</View>
											)}
										</View>
									</View>

									<View className="bg-theme-primary px-6 py-3 rounded-lg">
										<Text className="text-theme-text-inverse font-bold text-lg">
											{pack.price}
										</Text>
									</View>
								</View>
							</Pressable>
						))}

						<View className="mt-6 bg-theme-surface-elevated/50 p-4 rounded-xl border border-theme-border">
							<Text className="text-theme-text font-semibold mb-3">
								Have a Promo Code?
							</Text>

							<View className="flex-row gap-2">
								<TextInput
									className="flex-1 bg-theme-surface border border-theme-border rounded-xl px-4 py-3 text-theme-text"
									placeholder="Enter promo code"
									placeholderTextColor="#6B7280"
									value={promoCode}
									onChangeText={(text) => {
										setPromoCode(text.toUpperCase());
										setPromoMessage(null);
									}}
									autoCapitalize="characters"
									editable={!redeemPromoMutation.isPending}
									accessibilityLabel="Promo code input"
								/>
								<TouchableOpacity
									className={`bg-theme-warning px-4 py-3 rounded-xl justify-center items-center ${
										redeemPromoMutation.isPending || !promoCode.trim()
											? "opacity-50"
											: ""
									}`}
									onPress={handleRedeemPromo}
									disabled={redeemPromoMutation.isPending || !promoCode.trim()}
									accessibilityRole="button"
									accessibilityLabel="Redeem promo code"
									accessibilityState={{
										disabled:
											redeemPromoMutation.isPending || !promoCode.trim(),
									}}
								>
									{redeemPromoMutation.isPending ? (
										<ActivityIndicator color="#FDF8F0" size="small" />
									) : (
										<Text className="text-theme-text-inverse font-bold">
											Redeem
										</Text>
									)}
								</TouchableOpacity>
							</View>

							{promoMessage && (
								<Text
									className={`mt-2 text-sm ${promoMessage.type === "success" ? "text-theme-success" : "text-theme-error"}`}
								>
									{promoMessage.text}
								</Text>
							)}
						</View>

						<View className="mt-6 p-4 bg-theme-surface-elevated/30 rounded-xl">
							<Text className="text-theme-text-tertiary text-center text-xs">
								Gems are premium currency used for exclusive content.
								{"\n"}Purchases are processed securely through your app store.
							</Text>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</Modal>
	);
}
