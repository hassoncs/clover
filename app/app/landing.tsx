import { useState } from "react";
import {
	View,
	Text,
	TextInput,
	Pressable,
	ScrollView,
	Platform,
	Image,
	Linking,
} from "react-native";
import { Redirect } from "expo-router";
import { trpcReact } from "@/lib/trpc/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function LandingPage() {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const joinWaitlist = trpcReact.billing.joinWaitlist.useMutation({
		onSuccess: () => {
			setSubmitted(true);
			setError(null);
		},
		onError: (err: { message: string }) => {
			setError(err.message || "Something went wrong. Please try again.");
		},
	});

	if (Platform.OS !== "web") {
		return <Redirect href="/(tabs)/feed" />;
	}

	const handleSubmit = () => {
		if (!email || !email.includes("@")) {
			setError("Please enter a valid email address.");
			return;
		}
		joinWaitlist.mutate({ email });
	};

	return (
		<View className="flex-1 bg-[#FDF8F0] min-h-screen">
			<ScrollView contentContainerStyle={{ flexGrow: 1 }}>
				<View className="bg-[#1B3A6B] px-6 py-12 md:py-20 items-center">
					<View className="max-w-4xl w-full items-center">
						<Text className="text-[#C9A84C] font-bold text-xl tracking-widest mb-4 uppercase">
							Amen Games
						</Text>
						<Text className="text-white text-4xl md:text-6xl font-bold text-center mb-6 leading-tight">
							Scripture. Fellowship. Fun.
						</Text>
						<Text className="text-gray-300 text-lg md:text-xl text-center max-w-2xl mb-10 leading-relaxed">
							Reverent, educational Christian party games for your church, youth
							group, or family game night.
						</Text>

						<View className="bg-[#C9A84C] px-6 py-2 rounded-full mb-8">
							<Text className="text-[#1B3A6B] font-bold tracking-wide">
								COMING EASTER 2026
							</Text>
						</View>
					</View>
				</View>

				<View className="flex-1 items-center px-6 py-12 md:py-20">
					<View className="max-w-4xl w-full">
						<View className="flex-row flex-wrap justify-center gap-8 mb-20">
							<FeatureCard
								icon="book-outline"
								title="Scripture First"
								description="Every game is rooted in the Bible, designed to teach and inspire while you play."
							/>
							<FeatureCard
								icon="people-outline"
								title="Fellowship"
								description="Built for connection. Perfect for icebreakers, small groups, and community building."
							/>
							<FeatureCard
								icon="happy-outline"
								title="Clean Fun"
								description="High-quality, engaging gameplay that's safe for all ages and denominations."
							/>
						</View>

						<View className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-[#E6DCC8] items-center mb-20">
							<Text className="text-[#1B3A6B] text-3xl font-bold mb-4 text-center">
								Join the Waitlist
							</Text>
							<Text className="text-gray-600 text-center mb-8 max-w-lg">
								Be the first to know when we launch. Early access members get
								exclusive in-game rewards.
							</Text>

							{submitted ? (
								<View className="bg-[#5B7F3B]/10 p-6 rounded-xl items-center w-full max-w-md">
									<Ionicons
										name="checkmark-circle"
										size={48}
										color="#5B7F3B"
									/>
									<Text className="text-[#5B7F3B] font-bold text-xl mt-4 mb-2">
										You're on the list!
									</Text>
									<Text className="text-[#5B7F3B] text-center">
										Thank you for your interest. We'll be in touch soon.
									</Text>
								</View>
							) : (
								<View className="w-full max-w-md">
									<View className="flex-row flex-wrap md:flex-nowrap gap-4">
										<TextInput
											className="flex-1 bg-[#FDF8F0] border border-[#E6DCC8] rounded-lg px-4 py-3 text-[#2D2D2D] text-lg"
											placeholder="pastor@church.org"
											placeholderTextColor="#9CA3AF"
											value={email}
											onChangeText={setEmail}
											autoCapitalize="none"
											keyboardType="email-address"
										/>
										<Pressable
											className={`bg-[#1B3A6B] px-8 py-3 rounded-lg justify-center items-center ${
												joinWaitlist.isPending ? "opacity-70" : ""
											}`}
											onPress={handleSubmit}
											disabled={joinWaitlist.isPending}
										>
											<Text className="text-white font-bold text-lg">
												{joinWaitlist.isPending ? "Joining..." : "Notify Me"}
											</Text>
										</Pressable>
									</View>
									{error && (
										<Text className="text-[#B84233] mt-3 text-center">
											{error}
										</Text>
									)}
								</View>
							)}
						</View>

						<View className="mb-12">
							<Text className="text-[#1B3A6B] text-3xl font-bold mb-4 text-center">
								Church Subscriptions
							</Text>
							<Text className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
								Affordable plans for churches of all sizes. Includes unlimited
								access for all members.
							</Text>

							<View className="flex-row flex-wrap justify-center gap-6">
								<PricingCard
									title="Small Church"
									price="$199"
									period="/year"
									description="For church plants and small congregations."
									features={["Up to 50 members", "All 8 launch games", "Admin dashboard"]}
								/>
								<PricingCard
									title="Medium Church"
									price="$499"
									period="/year"
									description="Perfect for growing churches and youth groups."
									features={["Up to 200 members", "All 8 launch games", "Admin dashboard", "Priority support"]}
									highlighted
								/>
								<PricingCard
									title="Large Church"
									price="$999"
									period="/year"
									description="For established churches with multiple ministries."
									features={["Unlimited members", "All 8 launch games", "Admin dashboard", "Priority support", "Custom branding"]}
								/>
							</View>
						</View>
					</View>
				</View>

				<View className="bg-[#1B3A6B] py-8 items-center">
					<Text className="text-gray-400 text-sm">
						© 2026 Amen Games. All rights reserved.
					</Text>
				</View>
			</ScrollView>
		</View>
	);
}

function FeatureCard({
	icon,
	title,
	description,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	title: string;
	description: string;
}) {
	return (
		<View className="bg-white p-6 rounded-xl shadow-sm border border-[#E6DCC8] w-full md:w-80 items-center">
			<View className="bg-[#FDF8F0] p-4 rounded-full mb-4">
				<Ionicons name={icon} size={32} color="#1B3A6B" />
			</View>
			<Text className="text-[#1B3A6B] font-bold text-xl mb-2">{title}</Text>
			<Text className="text-gray-600 text-center leading-relaxed">
				{description}
			</Text>
		</View>
	);
}

function PricingCard({
	title,
	price,
	period,
	description,
	features,
	highlighted = false,
}: {
	title: string;
	price: string;
	period: string;
	description: string;
	features: string[];
	highlighted?: boolean;
}) {
	return (
		<View
			className={`p-8 rounded-2xl w-full md:w-80 border ${
				highlighted
					? "bg-[#1B3A6B] border-[#1B3A6B]"
					: "bg-white border-[#E6DCC8]"
			}`}
		>
			<Text
				className={`font-bold text-xl mb-2 ${
					highlighted ? "text-[#C9A84C]" : "text-[#1B3A6B]"
				}`}
			>
				{title}
			</Text>
			<View className="flex-row items-baseline mb-4">
				<Text
					className={`text-4xl font-bold ${
						highlighted ? "text-white" : "text-[#2D2D2D]"
					}`}
				>
					{price}
				</Text>
				<Text
					className={`ml-1 ${highlighted ? "text-gray-300" : "text-gray-500"}`}
				>
					{period}
				</Text>
			</View>
			<Text
				className={`mb-6 leading-relaxed ${
					highlighted ? "text-gray-300" : "text-gray-600"
				}`}
			>
				{description}
			</Text>

			<View className="gap-3">
				{features.map((feature) => (
					<View key={feature} className="flex-row items-center">
						<Ionicons
							name="checkmark"
							size={20}
							color={highlighted ? "#C9A84C" : "#5B7F3B"}
						/>
						<Text
							className={`ml-3 ${
								highlighted ? "text-gray-200" : "text-gray-700"
							}`}
						>
							{feature}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}
