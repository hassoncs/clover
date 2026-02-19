import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Image,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	useWindowDimensions,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";

export default function LandingPage() {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { width } = useWindowDimensions();
	const isMobile = width < 768;

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

	const scrollToWaitlist = () => {
		const emailInput = document.getElementById("email-input");
		if (emailInput) {
			emailInput.scrollIntoView({ behavior: "smooth" });
			emailInput.focus();
		}
	};

	return (
		<View className="flex-1 bg-[#FDF8F0]">
			<Stack.Screen options={{ headerShown: false }} />
			<ScrollView contentContainerStyle={{ flexGrow: 1 }}>
				{/* Hero Section */}
				<View className="bg-[#0A0A1A] px-6 py-16 md:py-32 items-center">
					<View className="max-w-6xl w-full items-center">
						<Text
							className="text-[#6366F1] font-bold text-lg md:text-xl tracking-[0.2em] mb-6 uppercase text-center"
							accessibilityRole="header"
						>
							Slopcade
						</Text>
						<Text
							className="text-white text-5xl md:text-7xl font-bold text-center mb-8 leading-tight"
							accessibilityRole="header"
						>
							The Arcade. Party Games for Everyone.
						</Text>
						<Text className="text-gray-200 text-xl md:text-2xl text-center max-w-3xl mb-12 leading-relaxed font-light">
							Reverent, educational Christian party games designed to bring your
							church, youth group, and family closer together.
						</Text>

						<Pressable
							onPress={scrollToWaitlist}
							className="bg-[#C9A84C] px-10 py-4 rounded-full shadow-lg hover:bg-[#D4B65C] transition-colors"
						>
							<Text className="text-[#1B3A6B] font-bold text-xl tracking-wide">
								Get Started Free
							</Text>
						</Pressable>

						<View className="mt-16 flex-row gap-8 opacity-80">
							<View className="items-center">
								<Ionicons name="people" size={32} color="#C9A84C" />
								<Text className="text-white mt-2 font-medium">Multiplayer</Text>
							</View>
							<View className="items-center">
								<Ionicons name="book" size={32} color="#C9A84C" />
								<Text className="text-white mt-2 font-medium">Biblical</Text>
							</View>
							<View className="items-center">
								<Ionicons name="phone-portrait" size={32} color="#C9A84C" />
								<Text className="text-white mt-2 font-medium">
									Mobile First
								</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Game Showcase Section */}
				<View className="bg-white py-20 px-6 items-center">
					<View className="max-w-6xl w-full">
						<View className="items-center mb-16">
							<Text className="text-[#1B3A6B] font-bold text-sm tracking-widest uppercase mb-3">
								Our Collection
							</Text>
							<Text className="text-[#2D2D2D] text-4xl md:text-5xl font-bold text-center">
								Games for Every Gathering
							</Text>
						</View>

						<View className="flex-row flex-wrap justify-center gap-6">
							<GameCard
								emoji="🏛️"
								title="The Great Hall of Wisdom"
								description="Test your biblical knowledge in this fast-paced trivia challenge."
							/>
							<GameCard
								emoji="🥖"
								title="The Fellowship Table"
								description="Hilarious fill-in-the-blank fun for the whole congregation."
							/>
							<GameCard
								emoji="📜"
								title="Scrolls of Truth"
								description="Discern fact from fiction in this test of scriptural literacy."
							/>
							<GameCard
								emoji="⏳"
								title="The Book of Ages"
								description="Place biblical events in the correct chronological order."
							/>
							<GameCard
								emoji="⚖️"
								title="The Council"
								description="Rank, discuss, and debate lighthearted topics together."
							/>
							<GameCard
								emoji="🛤️"
								title="The Crossroads"
								description="Navigate moral dilemmas and see how your choices compare."
							/>
							<GameCard
								emoji="🎨"
								title="Illustrated Scripture"
								description="Draw and guess biblical scenes in this creative classic."
							/>
							<GameCard
								emoji="👑"
								title="Who Am I?"
								description="Guess the biblical figure from a series of clever clues."
							/>
						</View>
					</View>
				</View>

				{/* How It Works Section */}
				<View className="bg-[#FDF8F0] py-20 px-6 items-center border-t border-[#E6DCC8]">
					<View className="max-w-6xl w-full">
						<View className="items-center mb-16">
							<Text className="text-[#1B3A6B] font-bold text-sm tracking-widest uppercase mb-3">
								Simple & Easy
							</Text>
							<Text className="text-[#2D2D2D] text-4xl md:text-5xl font-bold text-center">
								How It Works
							</Text>
						</View>

						<View className="flex-col md:flex-row justify-center items-start gap-12 md:gap-8">
							<StepCard
								number="1"
								title="Create Account"
								description="Sign up for free and get instant access to our starter games."
							/>
							<View className="hidden md:flex h-full pt-12">
								<Ionicons name="arrow-forward" size={32} color="#C9A84C" />
							</View>
							<StepCard
								number="2"
								title="Share Code"
								description="Launch a game and share the 4-digit join code with your group."
							/>
							<View className="hidden md:flex h-full pt-12">
								<Ionicons name="arrow-forward" size={32} color="#C9A84C" />
							</View>
							<StepCard
								number="3"
								title="Play Together"
								description="Everyone plays on their own phone. No app download required."
							/>
						</View>
					</View>
				</View>

				{/* Pricing Section */}
				<View className="bg-[#1B3A6B] py-24 px-6 items-center">
					<View className="max-w-6xl w-full">
						<View className="items-center mb-16">
							<Text className="text-[#C9A84C] font-bold text-sm tracking-widest uppercase mb-3">
								Membership
							</Text>
							<Text className="text-white text-4xl md:text-5xl font-bold text-center mb-6">
								Plans for Everyone
							</Text>
							<Text className="text-gray-300 text-xl text-center max-w-2xl">
								Whether you're a family, a small group, or a whole church, we
								have a plan for you.
							</Text>
						</View>

						<View className="flex-row flex-wrap justify-center gap-8 items-stretch">
							<PricingCard
								title="Free"
								price="$0"
								period="/forever"
								description="Perfect for trying out Slopcade."
								features={[
									"2 Free games per week",
									"Up to 8 players",
									"Standard support",
								]}
								buttonText="Play for Free"
								variant="light"
							/>
							<PricingCard
								title="Slopcade+"
								price="$4.99"
								period="/month"
								description="For families and small groups."
								features={[
									"Unlimited access to all games",
									"Up to 20 players",
									"Priority support",
									"No ads",
								]}
								buttonText="Start Trial"
								highlighted
								variant="gold"
							/>
							<PricingCard
								title="Church"
								price="$199+"
								period="/year"
								description="For youth groups and congregations."
								features={[
									"Unlimited members",
									"Admin dashboard",
									"Custom branding",
									"Presentation mode",
								]}
								buttonText="Contact Sales"
								variant="light"
							/>
						</View>
					</View>
				</View>

				{/* Email Capture / Waitlist Section */}
				<View className="bg-white py-24 px-6 items-center">
					<View className="max-w-3xl w-full bg-[#FDF8F0] p-8 md:p-16 rounded-3xl border border-[#E6DCC8] items-center text-center shadow-sm">
						<Text className="text-[#1B3A6B] text-3xl md:text-4xl font-bold mb-4">
							Be the First to Know
						</Text>
						<Text className="text-gray-600 text-lg mb-10 max-w-lg">
							We're launching Easter 2026. Join the waitlist to get early access
							and exclusive founder rewards.
						</Text>

						{submitted ? (
							<View className="bg-[#5B7F3B]/10 p-8 rounded-2xl items-center w-full">
								<Ionicons name="checkmark-circle" size={56} color="#5B7F3B" />
								<Text className="text-[#5B7F3B] font-bold text-2xl mt-4 mb-2">
									You're on the list!
								</Text>
								<Text className="text-[#5B7F3B] text-lg">
									Thank you for your interest. We'll be in touch soon.
								</Text>
							</View>
						) : (
							<View className="w-full max-w-md">
								<View className="flex-col gap-4">
									<TextInput
										id="email-input"
										className="w-full bg-white border border-[#E6DCC8] rounded-xl px-6 py-4 text-[#2D2D2D] text-lg shadow-sm"
										placeholder="pastor@church.org"
										placeholderTextColor="#9CA3AF"
										value={email}
										onChangeText={setEmail}
										autoCapitalize="none"
										keyboardType="email-address"
									/>
									<Pressable
										className={`bg-[#1B3A6B] w-full py-4 rounded-xl justify-center items-center shadow-md hover:bg-[#2A4A80] transition-colors ${
											joinWaitlist.isPending ? "opacity-70" : ""
										}`}
										onPress={handleSubmit}
										disabled={joinWaitlist.isPending}
									>
										{joinWaitlist.isPending ? (
											<ActivityIndicator color="white" />
										) : (
											<Text className="text-white font-bold text-xl">
												Join Waitlist
											</Text>
										)}
									</Pressable>
								</View>
								{error && (
									<Text className="text-[#B84233] mt-4 font-medium">
										{error}
									</Text>
								)}
							</View>
						)}
					</View>
				</View>

				{/* Footer */}
				<View className="bg-[#0D1C33] py-16 px-6 border-t border-[#1B3A6B]">
					<View className="max-w-6xl w-full mx-auto flex-col md:flex-row justify-between items-center md:items-start gap-8">
						<View className="items-center md:items-start">
							<Text className="text-[#6366F1] font-bold text-2xl tracking-widest uppercase mb-4">
								Slopcade
							</Text>
							<Text className="text-gray-400 text-sm max-w-xs text-center md:text-left">
								The Arcade. Party games for everyone.
							</Text>
						</View>

						<View className="flex-row gap-8">
							<FooterLink href="https://slopcade.com/terms" text="Terms" />
							<FooterLink href="https://slopcade.com/privacy" text="Privacy" />
							<FooterLink
								href="mailto:support@slopcade.com"
								text="support@slopcade.com"
							/>
						</View>
					</View>
					<View className="max-w-6xl w-full mx-auto mt-12 pt-8 border-t border-[#1B3A6B]/50 text-center">
						<Text className="text-gray-500 text-sm text-center">
							© 2026 Slopcade. All rights reserved.
						</Text>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}

function GameCard({
	emoji,
	title,
	description,
}: {
	emoji: string;
	title: string;
	description: string;
}) {
	return (
		<View className="bg-[#FDF8F0] p-6 rounded-2xl border border-[#E6DCC8] w-full md:w-[280px] hover:shadow-md transition-shadow">
			<Text className="text-4xl mb-4">{emoji}</Text>
			<Text className="text-[#1B3A6B] font-bold text-lg mb-2 leading-tight">
				{title}
			</Text>
			<Text className="text-gray-600 text-sm leading-relaxed">
				{description}
			</Text>
		</View>
	);
}

function StepCard({
	number,
	title,
	description,
}: {
	number: string;
	title: string;
	description: string;
}) {
	return (
		<View className="items-center max-w-[280px]">
			<View className="w-16 h-16 rounded-full bg-[#1B3A6B] justify-center items-center mb-6 shadow-lg">
				<Text className="text-[#C9A84C] font-bold text-2xl">{number}</Text>
			</View>
			<Text className="text-[#1B3A6B] font-bold text-2xl mb-3">{title}</Text>
			<Text className="text-gray-600 text-center text-lg leading-relaxed">
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
	buttonText,
	highlighted = false,
	variant = "light",
}: {
	title: string;
	price: string;
	period: string;
	description: string;
	features: string[];
	buttonText: string;
	highlighted?: boolean;
	variant?: "light" | "gold";
}) {
	const isGold = variant === "gold";

	return (
		<View
			className={`p-8 rounded-3xl w-full md:w-[340px] flex-col ${
				isGold
					? "bg-[#C9A84C] shadow-xl transform md:-translate-y-4 border-none"
					: "bg-white border border-gray-200 shadow-sm"
			}`}
		>
			<View className="flex-1">
				<Text
					className={`font-bold text-xl mb-2 uppercase tracking-wider ${
						isGold ? "text-[#1B3A6B]" : "text-[#1B3A6B]"
					}`}
				>
					{title}
				</Text>
				<View className="flex-row items-baseline mb-4">
					<Text
						className={`text-5xl font-bold ${
							isGold ? "text-[#1B3A6B]" : "text-[#2D2D2D]"
						}`}
					>
						{price}
					</Text>
					<Text
						className={`ml-1 text-lg ${
							isGold ? "text-[#1B3A6B]/70" : "text-gray-500"
						}`}
					>
						{period}
					</Text>
				</View>
				<Text
					className={`mb-8 text-lg leading-relaxed ${
						isGold ? "text-[#1B3A6B]/80" : "text-gray-600"
					}`}
				>
					{description}
				</Text>

				<View className="gap-4 mb-8">
					{features.map((feature) => (
						<View key={feature} className="flex-row items-start">
							<Ionicons
								name="checkmark-circle"
								size={24}
								color={isGold ? "#1B3A6B" : "#5B7F3B"}
							/>
							<Text
								className={`ml-3 text-base flex-1 ${
									isGold ? "text-[#1B3A6B]" : "text-gray-700"
								}`}
							>
								{feature}
							</Text>
						</View>
					))}
				</View>
			</View>

			<Pressable
				className={`w-full py-4 rounded-xl justify-center items-center ${
					isGold ? "bg-[#1B3A6B]" : "bg-[#FDF8F0] border border-[#E6DCC8]"
				}`}
			>
				<Text
					className={`font-bold text-lg ${
						isGold ? "text-white" : "text-[#1B3A6B]"
					}`}
				>
					{buttonText}
				</Text>
			</Pressable>
		</View>
	);
}

function FooterLink({ href, text }: { href: string; text: string }) {
	return (
		<Pressable onPress={() => Linking.openURL(href)}>
			<Text className="text-gray-400 hover:text-[#C9A84C] transition-colors">
				{text}
			</Text>
		</Pressable>
	);
}
