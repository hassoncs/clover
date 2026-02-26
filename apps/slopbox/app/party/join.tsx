import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PartyJoinScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ error?: string }>();
	const insets = useSafeAreaInsets();
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(params.error ?? null);

	const nameInputRef = useRef<TextInput>(null);

	useEffect(() => {
		if (params.error) {
			setError(params.error);
		}
	}, [params.error]);

	const handleJoin = useCallback(() => {
		if (!code || !name) return;
		setError(null);
		router.push({
			pathname: "/party/play",
			params: { code: code.toUpperCase(), name, role: "player" },
		});
	}, [code, name, router]);

	useEffect(() => {
		if (code.length === 4) {
			if (name.length >= 2) {
				handleJoin();
			} else {
				nameInputRef.current?.focus();
			}
		}
	}, [code, name.length, handleJoin]);

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-theme-background"
		>
			<View
				className="flex-1 items-center justify-center p-6"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				<View
					className="absolute top-4 left-4 z-10"
					style={{ top: insets.top + 16 }}
				>
					<Pressable
						onPress={() => router.back()}
						className="p-2 rounded-full bg-theme-surface active:opacity-80"
					>
						<Ionicons name="arrow-back" size={24} color="white" />
					</Pressable>
				</View>

				<View className="w-full max-w-sm gap-6">
					<View className="items-center mb-4">
						<Text className="text-3xl font-bold text-theme-text">
							Join Game
						</Text>
					</View>

					{error && (
						<View className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl mb-2">
							<Text className="text-red-500 text-center font-medium">
								{error}
							</Text>
						</View>
					)}

					<View className="gap-2">
						<Text className="text-theme-text-secondary font-medium ml-1">
							Room Code
						</Text>
						<TextInput
							value={code}
							onChangeText={(text) => setCode(text.toUpperCase())}
							placeholder="ABCD"
							placeholderTextColor="#666"
							maxLength={4}
							autoFocus={true}
							inputMode="numeric"
							keyboardType="number-pad"
							autoCapitalize="characters"
							autoCorrect={false}
							className="bg-theme-surface text-theme-text p-4 rounded-xl text-4xl font-bold text-center tracking-[12px] border border-theme-border"
						/>
					</View>

					<View className="gap-2">
						<Text className="text-theme-text-secondary font-medium ml-1">
							Your Name
						</Text>
						<TextInput
							ref={nameInputRef}
							value={name}
							onChangeText={setName}
							placeholder="Enter your name"
							placeholderTextColor="#666"
							maxLength={12}
							autoCorrect={false}
							className="bg-theme-surface text-theme-text p-4 rounded-xl text-lg border border-theme-border"
							onSubmitEditing={handleJoin}
						/>
					</View>

					<Pressable
						onPress={handleJoin}
						disabled={!code || !name}
						className={`w-full bg-theme-primary p-4 rounded-xl items-center mt-4 active:opacity-90 ${!code || !name ? "opacity-50" : ""}`}
					>
						<Text className="text-white text-xl font-bold">Join Party</Text>
					</Pressable>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}
