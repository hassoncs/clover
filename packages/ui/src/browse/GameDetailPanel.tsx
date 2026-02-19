import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import type { PartyTemplate } from "./types";

interface MetaBadgeProps {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	value: string;
}

function MetaBadge({ icon, label, value }: MetaBadgeProps) {
	return (
		<View
			className="flex-row items-center rounded-full px-3 py-1.5"
			style={{
				backgroundColor: "rgba(99, 102, 241, 0.12)",
				borderWidth: 1,
				borderColor: "rgba(99, 102, 241, 0.35)",
			}}
		>
			<Ionicons
				name={icon}
				size={12}
				color="#A5B4FC"
				style={{ marginRight: 5 }}
			/>
			<Text className="text-xs" style={{ color: "#C4B5FD" }}>
				<Text style={{ opacity: 0.7 }}>{label}: </Text>
				<Text style={{ fontFamily: "Lora-Bold" }}>{value}</Text>
			</Text>
		</View>
	);
}

interface GameDetailPanelProps {
	template: PartyTemplate | null;
	onPlay: () => void;
	onHowToPlay: () => void;
}

export function GameDetailPanel({
	template,
	onPlay,
	onHowToPlay,
}: GameDetailPanelProps) {
	if (!template) {
		return (
			<View
				className="w-full overflow-hidden rounded-t-3xl p-8"
				style={{ backgroundColor: "#12122A" }}
			>
				<View className="items-center justify-center py-12">
					<Text
						className="text-xl"
						style={{
							color: "rgba(255,255,255,0.4)",
							fontFamily: "Lora-Regular",
						}}
					>
						Select a game to begin
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View
			className="w-full overflow-hidden rounded-t-3xl pb-10 pt-6"
			style={{ backgroundColor: "#12122A" }}
		>
			<View className="px-6 pb-4">
				<Text
					className="text-center text-3xl font-bold"
					style={{ color: "#A5B4FC", fontFamily: "Lora-Bold" }}
				>
					{template.title}
				</Text>
				{template.tagline && (
					<Text
						className="mt-1 text-center text-sm italic"
						style={{
							color: "rgba(255,255,255,0.7)",
							fontFamily: "Lora-Regular",
						}}
					>
						{template.tagline}
					</Text>
				)}
			</View>

			<View
				className="mx-6 my-3"
				style={{
					height: 1,
					backgroundColor: "rgba(99, 102, 241, 0.25)",
				}}
			/>

			<View className="flex-row flex-wrap justify-center gap-2 px-4 py-3">
				<MetaBadge
					icon="people-outline"
					label="Players"
					value={`${template.minPlayers}–${template.maxPlayers}`}
				/>
				{template.sessionLength && (
					<MetaBadge
						icon="time-outline"
						label="Time"
						value={template.sessionLength}
					/>
				)}
				{template.formatTag && (
					<MetaBadge
						icon="layers-outline"
						label="Format"
						value={template.formatTag}
					/>
				)}
				{template.contentNote && (
					<MetaBadge
						icon="information-circle-outline"
						label="Note"
						value={template.contentNote}
					/>
				)}
			</View>

			<View className="mt-4 gap-3 px-6">
				<Pressable
					onPress={onPlay}
					className="w-full items-center justify-center rounded-xl py-4 active:opacity-90"
					style={{ backgroundColor: "#6366F1" }}
				>
					<Text
						className="text-lg font-bold text-white"
						style={{ fontFamily: "Lora-Bold", letterSpacing: 2 }}
					>
						PLAY
					</Text>
				</Pressable>

				<Pressable
					onPress={onHowToPlay}
					className="w-full items-center justify-center rounded-xl py-3 active:opacity-90"
					style={{
						borderWidth: 1,
						borderColor: "rgba(99, 102, 241, 0.5)",
						backgroundColor: "transparent",
					}}
				>
					<Text
						className="text-base font-bold"
						style={{ color: "#A5B4FC", fontFamily: "Lora-Bold" }}
					>
						HOW TO PLAY
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
