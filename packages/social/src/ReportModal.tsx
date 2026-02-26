import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSocialTRPC } from "./trpc-context";

interface ReportModalProps {
	visible: boolean;
	targetType: "game" | "comment" | "user";
	targetId: string;
	onClose: () => void;
}

const REASONS = [
	{ key: "spam" as const, label: "Spam", icon: "mail-outline" as const },
	{
		key: "inappropriate" as const,
		label: "Inappropriate",
		icon: "warning-outline" as const,
	},
	{
		key: "harassment" as const,
		label: "Harassment",
		icon: "alert-circle-outline" as const,
	},
	{
		key: "other" as const,
		label: "Other",
		icon: "ellipsis-horizontal-outline" as const,
	},
];

type ReasonKey = (typeof REASONS)[number]["key"];

const TARGET_LABELS: Record<string, string> = {
	game: "Game",
	comment: "Comment",
	user: "User",
};

export function ReportModal({
	visible,
	targetType,
	targetId,
	onClose,
}: ReportModalProps) {
	const [selectedReason, setSelectedReason] = useState<ReasonKey | null>(null);
	const [description, setDescription] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const trpc = useSocialTRPC();

	const reportMutation = trpc.moderation.report.useMutation({
		onSuccess: () => {
			setSubmitted(true);
		},
	});

	const handleSubmit = () => {
		if (!selectedReason) return;
		reportMutation.mutate({
			targetType,
			targetId,
			reason: selectedReason,
			description: description.trim() || undefined,
		});
	};

	const handleClose = () => {
		setSelectedReason(null);
		setDescription("");
		setSubmitted(false);
		reportMutation.reset();
		onClose();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={handleClose}
		>
			<View className="flex-1 bg-black/60 items-center justify-center px-6">
				<View className="bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-gray-800">
					<View className="flex-row items-center justify-between mb-5">
						<Text className="text-white text-lg font-bold">
							Report {TARGET_LABELS[targetType]}
						</Text>
						<Pressable
							onPress={handleClose}
							className="p-1"
							accessibilityRole="button"
							accessibilityLabel="Close report modal"
						>
							<Ionicons name="close" size={24} color="#9CA3AF" />
						</Pressable>
					</View>

					{submitted ? (
						<View className="items-center py-8">
							<Ionicons name="checkmark-circle" size={48} color="#22C55E" />
							<Text className="text-white text-base font-semibold mt-4">
								Report submitted. Thank you.
							</Text>
							<Text className="text-gray-400 text-sm mt-2 text-center">
								We'll review this report and take appropriate action.
							</Text>
							<Pressable
								onPress={handleClose}
								className="mt-6 bg-indigo-600 px-8 py-3 rounded-xl"
								accessibilityRole="button"
								accessibilityLabel="Done"
							>
								<Text className="text-white font-semibold">Done</Text>
							</Pressable>
						</View>
					) : (
						<>
							<Text className="text-gray-400 text-sm mb-4">
								Select a reason for your report:
							</Text>

							<View className="gap-2 mb-4">
								{REASONS.map((reason) => (
									<Pressable
										key={reason.key}
										onPress={() => setSelectedReason(reason.key)}
										className={`flex-row items-center px-4 py-3 rounded-xl border ${
											selectedReason === reason.key
												? "border-indigo-500 bg-indigo-500/10"
												: "border-gray-700 bg-gray-800"
										}`}
										accessibilityRole="button"
										accessibilityLabel={`Report reason: ${reason.label}`}
										accessibilityState={{
											selected: selectedReason === reason.key,
										}}
									>
										<Ionicons
											name={reason.icon}
											size={20}
											color={
												selectedReason === reason.key ? "#818CF8" : "#9CA3AF"
											}
										/>
										<Text
											className={`ml-3 text-sm font-medium ${
												selectedReason === reason.key
													? "text-indigo-400"
													: "text-gray-300"
											}`}
										>
											{reason.label}
										</Text>
									</Pressable>
								))}
							</View>

							{selectedReason && (
								<View className="mb-4">
									<Text className="text-gray-400 text-sm mb-2">
										Additional details (optional):
									</Text>
									<TextInput
										className="bg-gray-800 px-4 py-3 rounded-xl text-white text-sm border border-gray-700"
										placeholder="Describe the issue..."
										placeholderTextColor="#6B7280"
										value={description}
										onChangeText={setDescription}
										multiline
										numberOfLines={3}
										maxLength={500}
										textAlignVertical="top"
										style={{ minHeight: 80 }}
										accessibilityLabel="Additional details for report"
									/>
									<Text className="text-gray-600 text-xs mt-1 text-right">
										{description.length}/500
									</Text>
								</View>
							)}

							{reportMutation.error && (
								<Text className="text-red-400 text-sm mb-4">
									Failed to submit report. Please try again.
								</Text>
							)}

							<Pressable
								onPress={handleSubmit}
								disabled={!selectedReason || reportMutation.isPending}
								className={`py-3 rounded-xl items-center ${
									selectedReason && !reportMutation.isPending
										? "bg-red-600"
										: "bg-gray-700"
								}`}
								accessibilityRole="button"
								accessibilityLabel="Submit report"
							>
								{reportMutation.isPending ? (
									<ActivityIndicator size="small" color="#FFFFFF" />
								) : (
									<Text
										className={`font-semibold ${
											selectedReason ? "text-white" : "text-gray-500"
										}`}
									>
										Submit Report
									</Text>
								)}
							</Pressable>
						</>
					)}
				</View>
			</View>
		</Modal>
	);
}
