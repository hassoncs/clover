import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AvatarPicker } from "@/components/party/AvatarPicker";

export default function JoinScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ code?: string; error?: string }>();
	const [code, setCode] = useState(params.code?.toUpperCase() ?? "");
	const [name, setName] = useState("");
	const [avatar, setAvatar] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(params.error ?? null);

	const nameInputRef = useRef<TextInput>(null);

	useEffect(() => {
		if (params.error) setError(params.error);
	}, [params.error]);

	const handleJoin = useCallback(() => {
		const trimmedCode = code.trim().toUpperCase();
		const trimmedName = name.trim();
		if (!trimmedCode || !trimmedName) return;
		setError(null);
		router.push({
			pathname: "/party/play",
			params: {
				code: trimmedCode,
				name: trimmedName,
				avatar: avatar ?? "dove",
				role: "player",
			},
		});
	}, [code, name, avatar, router]);

	useEffect(() => {
		if (code.length === 4 && name.trim().length >= 2) {
			handleJoin();
		} else if (code.length === 4) {
			nameInputRef.current?.focus();
		}
	}, [code, name, handleJoin]);

	const isValid = code.trim().length === 4 && name.trim().length >= 2;

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1 bg-[#1B3A6B]"
			>
				<SafeAreaView className="flex-1 items-center justify-center p-6">
					<View className="items-center mb-12">
						<Text className="text-[#C9A84C] font-bold text-3xl tracking-widest uppercase mb-1">
							Slopbox Games
						</Text>
						<Text className="text-white/60 text-base">
							Scripture. Fellowship. Fun.
						</Text>
					</View>

					<View className="w-full max-w-sm bg-white/10 rounded-3xl p-8 border border-white/20">
						<Text className="text-white text-3xl font-bold text-center mb-2">
							Join a Game
						</Text>
						<Text className="text-white/60 text-center text-base mb-8">
							Enter the room code shown on your host's screen
						</Text>

						{error && (
							<View className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl mb-4">
								<Text className="text-red-300 text-center font-medium">
									{error}
								</Text>
							</View>
						)}

						<View className="mb-5">
							<Text className="text-white/70 font-semibold mb-2 text-sm uppercase tracking-wide">
								Room Code
							</Text>
							<TextInput
								value={code}
								onChangeText={(t) => {
									setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""));
									setError(null);
								}}
								placeholder="1234"
								placeholderTextColor="rgba(255,255,255,0.25)"
								maxLength={4}
								autoFocus
								inputMode="numeric"
								keyboardType="number-pad"
								autoCapitalize="characters"
								autoCorrect={false}
								className="bg-white/10 text-white text-5xl font-black text-center tracking-[16px] py-5 rounded-2xl border border-white/20"
							/>
						</View>

						<View className="mb-8">
							<Text className="text-white/70 font-semibold mb-2 text-sm uppercase tracking-wide">
								Your Name
							</Text>
							<TextInput
								ref={nameInputRef}
								value={name}
								onChangeText={(t) => {
									setName(t);
									setError(null);
								}}
								placeholder="Enter your name"
								placeholderTextColor="rgba(255,255,255,0.25)"
								maxLength={12}
								autoCorrect={false}
								returnKeyType="done"
								className="bg-white/10 text-white text-xl py-4 px-4 rounded-2xl border border-white/20 text-center"
							/>
						</View>

						<View className="mb-8">
							<Text className="text-white/70 font-semibold mb-4 text-sm uppercase tracking-wide text-center">
								Choose Your Icon
							</Text>
							<AvatarPicker selectedId={avatar} onSelect={setAvatar} />
						</View>

						<Pressable
							onPress={handleJoin}
							disabled={!isValid}
							className={`w-full bg-[#C9A84C] py-5 rounded-2xl items-center active:opacity-80 ${!isValid ? "opacity-40" : ""}`}
						>
							<Text className="text-[#1B3A6B] text-xl font-black tracking-wide">
								Join Party
							</Text>
						</Pressable>
					</View>

					<Pressable
						onPress={() => router.replace("/landing")}
						className="mt-8"
					>
						<Text className="text-white/40 text-sm">← Back to slopbox.tv</Text>
					</Pressable>
				</SafeAreaView>
			</KeyboardAvoidingView>
		</>
	);
}
