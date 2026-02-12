import { useState } from "react";
import {
	Alert,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";

interface Variant {
	id: string;
	key: string;
	description: string;
}

interface VariantGroupEditorProps {
	gameId: string;
	remixId: string;
	sheetId?: string;
	onGenerate?: (jobId: string) => void;
}

export function VariantGroupEditor({
	gameId,
	remixId,
	sheetId = "variants",
	onGenerate,
}: VariantGroupEditorProps) {
	const [basePrompt, setBasePrompt] = useState("");
	const [variants, setVariants] = useState<Variant[]>([
		{ id: "1", key: "default", description: "" },
	]);
	const [isGenerating] = useState(false);

	const addVariant = () => {
		setVariants([
			...variants,
			{
				id: Math.random().toString(36).substring(7),
				key: `variant_${variants.length + 1}`,
				description: "",
			},
		]);
	};

	const removeVariant = (index: number) => {
		if (variants.length <= 1) return;
		const newVariants = [...variants];
		newVariants.splice(index, 1);
		setVariants(newVariants);
	};

	const updateVariant = (
		index: number,
		field: keyof Variant,
		value: string,
	) => {
		const newVariants = [...variants];
		newVariants[index] = { ...newVariants[index], [field]: value };
		setVariants(newVariants);
	};

	const handleGenerate = async () => {
		if (!basePrompt.trim()) {
			Alert.alert("Error", "Please enter a base prompt");
			return;
		}

		if (variants.some((v) => !v.key.trim())) {
			Alert.alert("Error", "All variants must have a key");
			return;
		}

		Alert.alert(
			"Not Available",
			"Variant sheet generation is being migrated to the new asset system.",
		);
	};

	return (
		<View className="bg-gray-800 p-4 rounded-lg">
			<Text className="text-white text-lg font-bold mb-4">
				Variant Sheet Editor
			</Text>

			<View className="mb-4">
				<Text className="text-gray-400 text-sm mb-1">Base Prompt</Text>
				<TextInput
					className="bg-gray-700 text-white p-3 rounded-md min-h-[80px]"
					multiline
					placeholder="Describe the base style and subject..."
					placeholderTextColor="#9CA3AF"
					value={basePrompt}
					onChangeText={setBasePrompt}
				/>
			</View>

			<Text className="text-gray-400 text-sm mb-2">Variants</Text>
			<ScrollView className="max-h-[300px] mb-4">
				{variants.map((variant, index) => (
					<View key={variant.id} className="bg-gray-700 p-3 rounded-md mb-2">
						<View className="flex-row justify-between items-center mb-2">
							<Text className="text-gray-300 text-xs">Variant {index + 1}</Text>
							{variants.length > 1 && (
								<Pressable onPress={() => removeVariant(index)}>
									<Text className="text-red-400 text-xs">Remove</Text>
								</Pressable>
							)}
						</View>

						<TextInput
							className="bg-gray-800 text-white p-2 rounded-sm mb-2 text-sm"
							placeholder="Key (e.g. 'red', 'damaged')"
							placeholderTextColor="#6B7280"
							value={variant.key}
							onChangeText={(text) => updateVariant(index, "key", text)}
						/>

						<TextInput
							className="bg-gray-800 text-white p-2 rounded-sm text-sm"
							placeholder="Description (optional)"
							placeholderTextColor="#6B7280"
							value={variant.description}
							onChangeText={(text) => updateVariant(index, "description", text)}
						/>
					</View>
				))}
			</ScrollView>

			<Pressable
				className="bg-gray-700 p-3 rounded-md items-center mb-4"
				onPress={addVariant}
			>
				<Text className="text-gray-300 font-semibold">+ Add Variant</Text>
			</Pressable>

			<Pressable
				className={`p-4 rounded-md items-center ${isGenerating ? "bg-indigo-700" : "bg-indigo-600"}`}
				onPress={handleGenerate}
				disabled={isGenerating}
			>
				<Text className="text-white font-bold">
					{isGenerating ? "Starting Job..." : "Generate Variants"}
				</Text>
			</Pressable>
		</View>
	);
}
