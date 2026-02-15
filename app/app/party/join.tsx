import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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
	const insets = useSafeAreaInsets();
	const [code, setCode] = useState("");
	const [name, setName] = useState("");

	const handleJoin = () => {
		if (!code || !name) return;
		router.push({
			pathname: "/party/play",
			params: { code: code.toUpperCase(), name, role: "player" },
		});
	};

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
							autoCapitalize="characters"
							autoCorrect={false}
							className="bg-theme-surface text-theme-text p-4 rounded-xl text-2xl font-bold text-center tracking-widest border border-theme-border"
						/>
					</View>

					<View className="gap-2">
						<Text className="text-theme-text-secondary font-medium ml-1">
							Your Name
						</Text>
						<TextInput
							value={name}
							onChangeText={setName}
							placeholder="Enter your name"
							placeholderTextColor="#666"
							maxLength={12}
							className="bg-theme-surface text-theme-text p-4 rounded-xl text-lg border border-theme-border"
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
