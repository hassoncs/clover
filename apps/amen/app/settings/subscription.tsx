import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StripeCheckout } from "@/components/billing/StripeCheckout";
import SubscriptionStatus from "@/components/billing/SubscriptionStatus";
import { useAuth } from "@/hooks/useAuth";
import { useProStatus } from "@/hooks/useProStatus";
import { trpc } from "@/lib/trpc/client";
import { trpcReact } from "@/lib/trpc/react";

export default function SubscriptionScreen() {
	const router = useRouter();
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const { isPro, proUntil, source, isLoading: proLoading } = useProStatus();
	const utils = trpcReact.useUtils();
	const [error, setError] = useState<string | null>(null);
	const [checkoutSuccess, setCheckoutSuccess] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
		"monthly",
	);

	const isWeb = Platform.OS === "web";

	const handleManage = async () => {
		if (!isWeb) return;
		try {
			const returnUrl =
				typeof window !== "undefined" ? window.location.href : "";
			const result = await trpc.billing.createPortalSession.mutate({
				returnUrl,
			});
			if (result.url) {
				Linking.openURL(result.url);
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to open billing portal",
			);
		}
	};

	const handleCheckoutSuccess = () => {
		setCheckoutSuccess(true);
		utils.billing.getSubscriptionStatus.invalidate();
	};

	const handleCheckoutError = (msg: string) => {
		setError(msg);
	};

	if (authLoading || proLoading) {
		return (
			<SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
				<ActivityIndicator size="large" color="#818CF8" />
			</SafeAreaView>
		);
	}

	if (!isAuthenticated) {
		return (
			<SafeAreaView className="flex-1 bg-gray-900">
				<View className="flex-row items-center px-4 py-3 border-b border-gray-800">
					<Pressable
						onPress={() => router.back()}
						className="mr-3"
						accessibilityLabel="Go back"
						accessibilityRole="button"
					>
						<Ionicons name="arrow-back" size={24} color="#E4E4E7" />
					</Pressable>
					<Text className="text-white font-semibold text-lg">Subscription</Text>
				</View>
				<View className="flex-1 items-center justify-center px-6">
					<Ionicons name="lock-closed-outline" size={48} color="#6B7280" />
					<Text className="text-gray-400 text-center mt-4 text-base">
						Sign in to manage your subscription
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-gray-900">
			<View className="flex-row items-center px-4 py-3 border-b border-gray-800">
				<Pressable
					onPress={() => router.back()}
					className="mr-3"
					accessibilityLabel="Go back"
					accessibilityRole="button"
				>
					<Ionicons name="arrow-back" size={24} color="#E4E4E7" />
				</Pressable>
				<Text className="text-white font-semibold text-lg flex-1">
					Subscription
				</Text>
			</View>

			<ScrollView
				className="flex-1 px-4 pt-6"
				contentContainerStyle={{ paddingBottom: 40 }}
			>
				{checkoutSuccess && (
					<View className="bg-green-900/30 p-4 rounded-xl border border-green-700 mb-4">
						<Text className="text-green-400 text-center font-medium">
							Welcome to Amen+!
						</Text>
					</View>
				)}

				{error && (
					<View
						className="bg-red-900/30 p-4 rounded-xl border border-red-700 mb-4"
						accessibilityLiveRegion="polite"
					>
						<Text className="text-red-400 text-center">{error}</Text>
						<Pressable
							onPress={() => setError(null)}
							className="mt-2"
							accessibilityLabel="Dismiss error"
							accessibilityRole="button"
						>
							<Text className="text-red-500 text-center text-sm underline">
								Dismiss
							</Text>
						</Pressable>
					</View>
				)}

				<SubscriptionStatus
					isPro={isPro}
					proUntil={proUntil}
					source={source}
					onManage={handleManage}
				/>

				{!isPro && isWeb && (
					<View className="mt-6">
						<Text className="text-white font-semibold text-lg mb-4">
							Upgrade to Amen+
						</Text>

						<View className="flex-row mb-4 bg-gray-800 p-1 rounded-lg">
							<Pressable
								onPress={() => setSelectedPlan("monthly")}
								className={`flex-1 py-2 rounded-md items-center ${
									selectedPlan === "monthly" ? "bg-gray-700" : ""
								}`}
								accessibilityLabel="Monthly plan, $4.99 per month"
								accessibilityRole="button"
								accessibilityState={{ selected: selectedPlan === "monthly" }}
							>
								<Text
									className={`font-medium ${
										selectedPlan === "monthly" ? "text-white" : "text-gray-400"
									}`}
								>
									Monthly ($4.99)
								</Text>
							</Pressable>
							<Pressable
								onPress={() => setSelectedPlan("yearly")}
								className={`flex-1 py-2 rounded-md items-center ${
									selectedPlan === "yearly" ? "bg-gray-700" : ""
								}`}
								accessibilityLabel="Yearly plan, $39.99 per year"
								accessibilityRole="button"
								accessibilityState={{ selected: selectedPlan === "yearly" }}
							>
								<Text
									className={`font-medium ${
										selectedPlan === "yearly" ? "text-white" : "text-gray-400"
									}`}
								>
									Yearly ($39.99)
								</Text>
							</Pressable>
						</View>

						<StripeCheckout
							priceId={
								selectedPlan === "monthly"
									? "amen_plus_monthly"
									: "amen_plus_yearly"
							}
							priceDisplay={
								selectedPlan === "monthly" ? "$4.99/mo" : "$39.99/yr"
							}
							onSuccess={handleCheckoutSuccess}
							onError={handleCheckoutError}
						/>
					</View>
				)}

				{!isPro && !isWeb && (
					<View className="mt-6 bg-gray-800 p-4 rounded-xl border border-gray-700">
						<Text className="text-gray-400 text-center text-sm">
							Subscription management is available on the web.
						</Text>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}
