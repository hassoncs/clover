import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { trpcReact } from "@/lib/trpc/react";

export default function LandingPage() {
	const router = useRouter();
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
		return <Redirect href="/(tabs)/browse" />;
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
		<View className="flex-1 bg-[#0D1117]">
			<Stack.Screen options={{ headerShown: false }} />
			<ScrollView contentContainerStyle={{ flexGrow: 1 }}>
				{/* Hero Section */}
				<View className="bg-[#0D1117] px-6 py-16 md:py-32 items-center border-b border-zinc-800">
					<View className="max-w-6xl w-full items-center">
						<Text
							className="text-[#22c55e] font-bold text-lg md:text-xl tracking-[0.2em] mb-6 uppercase text-center"
							accessibilityRole="header"
						>
							Slopbox Games
						</Text>
						<Text
							className="text-white text-5xl md:text-7xl font-bold text-center mb-8 leading-tight"
							accessibilityRole="header"
						>
							Fast. Fun. Chaotic.
						</Text>
						<Text className="text-zinc-300 text-xl md:text-2xl text-center max-w-3xl mb-12 leading-relaxed font-light">
							Outrageous party games that turn any gathering into a memorable,
							chaotic good time.
						</Text>

						<View className="flex-col md:flex-row gap-4 items-center">
							<Pressable
								onPress={scrollToWaitlist}
								className="bg-[#22c55e] px-10 py-4 rounded-full shadow-lg hover:bg-[#16a34a] transition-colors"
							>
								<Text className="text-[#0D1117] font-bold text-xl tracking-wide">
									Get Started Free
								</Text>
							</Pressable>
							<Pressable
								onPress={() => router.push("/join")}
								className="bg-white/5 border border-zinc-700 px-10 py-4 rounded-full hover:bg-zinc-800 transition-colors"
							>
								<Text className="text-white font-bold text-xl tracking-wide">
									Join a Game →
								</Text>
							</Pressable>
						</View>

						<View className="mt-16 flex-row gap-8 opacity-80">
							<View className="items-center">
								<Ionicons name="people" size={32} color="#22c55e" />
								<Text className="text-white mt-2 font-medium">Multiplayer</Text>
							</View>
							<View className="items-center">
								<Ionicons name="flash" size={32} color="#22c55e" />
								<Text className="text-white mt-2 font-medium">
									Instant Play
								</Text>
							</View>
							<View className="items-center">
								<Ionicons name="phone-portrait" size={32} color="#22c55e" />
								<Text className="text-white mt-2 font-medium">
									Mobile First
								</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Game Showcase Section */}
				<View className="bg-zinc-900 py-20 px-6 items-center border-b border-zinc-800">
					<View className="max-w-6xl w-full">
						<View className="items-center mb-16">
							<Text className="text-[#3b82f6] font-bold text-sm tracking-widest uppercase mb-3">
								Our Collection
							</Text>
							<Text className="text-white text-4xl md:text-5xl font-bold text-center">
								Games for Every Gathering
							</Text>
						</View>

						<View className="flex-row flex-wrap justify-center gap-6">
							<GameCard
								emoji="🧠"
								title="Trivia Blitz"
								description="Rapid-fire trivia rounds with escalating chaos and bonus twists."
							/>
							<GameCard
								emoji="📝"
								title="Blank Check"
								description="Fill in outrageous prompts and vote for the funniest answer."
							/>
							<GameCard
								emoji="🎤"
								title="Hot Takes"
								description="Guess who said what and roast your friends with confidence."
							/>
							<GameCard
								emoji="⏱️"
								title="Time Bomb"
								description="Beat the clock in intense mini-challenges built for loud rooms."
							/>
							<GameCard
								emoji="🗳️"
								title="Vote or Roast"
								description="Rank, discuss, and debate lighthearted topics together."
							/>
							<GameCard
								emoji="🎯"
								title="Would You Rather?"
								description="Make impossible choices and see who in your group is unhinged."
							/>
							<GameCard
								emoji="🎨"
								title="Sketch Panic"
								description="Draw bizarre prompts while everyone yells their guesses at once."
							/>
							<GameCard
								emoji="👑"
								title="Who Said That?"
								description="Unmask fake quotes, inside jokes, and perfect impersonations."
							/>
						</View>
					</View>
				</View>

				{/* How It Works Section */}
				<View className="bg-[#0D1117] py-20 px-6 items-center border-t border-zinc-800">
					<View className="max-w-6xl w-full">
						<View className="items-center mb-16">
							<Text className="text-[#3b82f6] font-bold text-sm tracking-widest uppercase mb-3">
								Simple & Easy
							</Text>
							<Text className="text-white text-4xl md:text-5xl font-bold text-center">
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
								<Ionicons name="arrow-forward" size={32} color="#3b82f6" />
							</View>
							<StepCard
								number="2"
								title="Share Code"
								description="Launch a game and share the 4-digit join code with your group."
							/>
							<View className="hidden md:flex h-full pt-12">
								<Ionicons name="arrow-forward" size={32} color="#3b82f6" />
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
				<View className="bg-zinc-900 py-24 px-6 items-center border-t border-zinc-800">
					<View className="max-w-6xl w-full">
						<View className="items-center mb-16">
							<Text className="text-[#22c55e] font-bold text-sm tracking-widest uppercase mb-3">
								Membership
							</Text>
							<Text className="text-white text-4xl md:text-5xl font-bold text-center mb-6">
								Plans for Everyone
							</Text>
							<Text className="text-zinc-300 text-xl text-center max-w-2xl">
								Whether you're a friend group, a family, or a full team event,
								there's a plan that fits.
							</Text>
						</View>

						<View className="flex-row flex-wrap justify-center gap-8 items-stretch">
							<PricingCard
								title="Free"
								price="$0"
								period="/forever"
								description="Perfect for trying out Slopbox Games."
								features={[
									"2 Free games per week",
									"Up to 8 players",
									"Standard support",
								]}
								buttonText="Play for Free"
								variant="light"
							/>
							<PricingCard
								title="Slopbox+"
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
								variant="accent"
							/>
							<PricingCard
								title="Organizations"
								price="$199+"
								period="/year"
								description="For teams, offices, and large groups."
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
				<View className="bg-[#0D1117] py-24 px-6 items-center">
					<View className="max-w-3xl w-full bg-zinc-900 p-8 md:p-16 rounded-3xl border border-zinc-700 items-center text-center shadow-sm">
						<Text className="text-white text-3xl md:text-4xl font-bold mb-4">
							Be the First to Know
						</Text>
						<Text className="text-zinc-300 text-lg mb-10 max-w-lg">
							We're launching soon. Join the waitlist to get early access and
							exclusive founder rewards.
						</Text>

						{submitted ? (
							<View className="bg-[#22c55e]/10 p-8 rounded-2xl items-center w-full border border-[#22c55e]/30">
								<Ionicons name="checkmark-circle" size={56} color="#22c55e" />
								<Text className="text-[#22c55e] font-bold text-2xl mt-4 mb-2">
									You're on the list!
								</Text>
								<Text className="text-[#22c55e] text-lg">
									Thank you for your interest. We'll be in touch soon.
								</Text>
							</View>
						) : (
							<View className="w-full max-w-md">
								<View className="flex-col gap-4">
									<TextInput
										id="email-input"
										className="w-full bg-[#0D1117] border border-zinc-700 rounded-xl px-6 py-4 text-white text-lg shadow-sm"
										placeholder="you@example.com"
										placeholderTextColor="#9CA3AF"
										value={email}
										onChangeText={setEmail}
										autoCapitalize="none"
										keyboardType="email-address"
									/>
									<Pressable
										className={`bg-[#3b82f6] w-full py-4 rounded-xl justify-center items-center shadow-md hover:bg-[#2563eb] transition-colors ${
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
				<View className="bg-black py-16 px-6 border-t border-zinc-800">
					<View className="max-w-6xl w-full mx-auto flex-col md:flex-row justify-between items-center md:items-start gap-8">
						<View className="items-center md:items-start">
							<Text className="text-[#22c55e] font-bold text-2xl tracking-widest uppercase mb-4">
								Slopbox Games
							</Text>
							<Text className="text-gray-400 text-sm max-w-xs text-center md:text-left">
								Making every party unforgettable.
							</Text>
						</View>

						<View className="flex-row gap-8">
							<FooterLink href="https://slopbox.tv/terms" text="Terms" />
							<FooterLink href="https://slopbox.tv/privacy" text="Privacy" />
							<FooterLink
								href="mailto:support@slopbox.tv"
								text="support@slopbox.tv"
							/>
						</View>
					</View>
					<View className="max-w-6xl w-full mx-auto mt-12 pt-8 border-t border-zinc-800 text-center">
						<Text className="text-gray-500 text-sm text-center">
							© 2026 Slopbox Games. All rights reserved.
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
		<View className="bg-[#0D1117] p-6 rounded-2xl border border-zinc-700 w-full md:w-[280px] hover:shadow-md transition-shadow">
			<Text className="text-4xl mb-4">{emoji}</Text>
			<Text className="text-white font-bold text-lg mb-2 leading-tight">
				{title}
			</Text>
			<Text className="text-zinc-300 text-sm leading-relaxed">
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
			<View className="w-16 h-16 rounded-full bg-[#3b82f6] justify-center items-center mb-6 shadow-lg">
				<Text className="text-white font-bold text-2xl">{number}</Text>
			</View>
			<Text className="text-white font-bold text-2xl mb-3">{title}</Text>
			<Text className="text-zinc-300 text-center text-lg leading-relaxed">
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
	variant = "light",
}: {
	title: string;
	price: string;
	period: string;
	description: string;
	features: string[];
	buttonText: string;
	variant?: "light" | "accent";
}) {
	const isAccent = variant === "accent";

	return (
		<View
			className={`p-8 rounded-3xl w-full md:w-[340px] flex-col ${
				isAccent
					? "bg-[#22c55e] shadow-xl transform md:-translate-y-4 border-none"
					: "bg-[#0D1117] border border-zinc-700 shadow-sm"
			}`}
		>
			<View className="flex-1">
				<Text
					className={`font-bold text-xl mb-2 uppercase tracking-wider ${
						isAccent ? "text-[#0D1117]" : "text-white"
					}`}
				>
					{title}
				</Text>
				<View className="flex-row items-baseline mb-4">
					<Text
						className={`text-5xl font-bold ${
							isAccent ? "text-[#0D1117]" : "text-white"
						}`}
					>
						{price}
					</Text>
					<Text
						className={`ml-1 text-lg ${
							isAccent ? "text-[#0D1117]/70" : "text-zinc-400"
						}`}
					>
						{period}
					</Text>
				</View>
				<Text
					className={`mb-8 text-lg leading-relaxed ${
						isAccent ? "text-[#0D1117]/80" : "text-zinc-300"
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
								color={isAccent ? "#0D1117" : "#22c55e"}
							/>
							<Text
								className={`ml-3 text-base flex-1 ${
									isAccent ? "text-[#0D1117]" : "text-zinc-200"
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
					isAccent ? "bg-[#0D1117]" : "bg-zinc-800 border border-zinc-700"
				}`}
			>
				<Text
					className={`font-bold text-lg ${
						isAccent ? "text-white" : "text-[#22c55e]"
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
			<Text className="text-gray-400 hover:text-[#22c55e] transition-colors">
				{text}
			</Text>
		</Pressable>
	);
}
