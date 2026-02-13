import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useEditor } from "./EditorProvider";

export function DiagnosticsPanel() {
	const { readiness } = useEditor();
	const [expanded, setExpanded] = React.useState(true);

	if (
		!readiness ||
		(readiness.errors.length === 0 && readiness.warnings.length === 0)
	) {
		return null;
	}

	return (
		<View className="bg-secondary-800 border-t border-secondary-700 max-h-[200px]">
			<TouchableOpacity
				onPress={() => setExpanded(!expanded)}
				className="flex-row items-center justify-between p-2 bg-secondary-900"
			>
				<View className="flex-row items-center gap-2">
					<Ionicons
						name={expanded ? "chevron-down" : "chevron-forward"}
						size={16}
						color="#9CA3AF"
					/>
					<Text className="text-secondary-300 text-xs font-semibold uppercase">
						Diagnostics
					</Text>
				</View>
				<View className="flex-row gap-2">
					{readiness.errors.length > 0 && (
						<View
							className="px-1.5 py-0.5 rounded"
							style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
						>
							<Text className="text-error text-[10px] font-semibold">
								{readiness.errors.length} Errors
							</Text>
						</View>
					)}
					{readiness.warnings.length > 0 && (
						<View
							className="px-1.5 py-0.5 rounded"
							style={{ backgroundColor: "rgba(245, 158, 11, 0.2)" }}
						>
							<Text className="text-warning text-[10px] font-semibold">
								{readiness.warnings.length} Warnings
							</Text>
						</View>
					)}
				</View>
			</TouchableOpacity>

			{expanded && (
				<ScrollView className="p-2" nestedScrollEnabled>
					{readiness.errors.map((error, i) => (
						<View
							key={`err-${i}-${error.code || "unknown"}`}
							className="flex-row mb-2 gap-2"
						>
							<Ionicons
								name="close-circle"
								size={14}
								color="#EF4444"
								className="mt-0.5"
							/>
							<View className="flex-1">
								<Text className="text-secondary-300 text-xs">
									{error.message}
								</Text>
								{error.path && (
									<Text className="text-secondary-500 text-[10px] mt-0.5 font-mono">
										{error.path}
									</Text>
								)}
							</View>
						</View>
					))}
					{readiness.warnings.map((warning, i) => (
						<View
							key={`warn-${i}-${warning.code || "unknown"}`}
							className="flex-row mb-2 gap-2"
						>
							<Ionicons
								name="warning"
								size={14}
								color="#F59E0B"
								className="mt-0.5"
							/>
							<View className="flex-1">
								<Text className="text-secondary-300 text-xs">
									{warning.message}
								</Text>
								{warning.path && (
									<Text className="text-secondary-500 text-[10px] mt-0.5 font-mono">
										{warning.path}
									</Text>
								)}
							</View>
						</View>
					))}
				</ScrollView>
			)}
		</View>
	);
}
