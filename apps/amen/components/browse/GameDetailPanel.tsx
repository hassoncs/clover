import { AmenGrainOverlay, MotifDivider } from "@slopcade/ui/amen";
import React from "react";
import { Pressable, Text, View } from "react-native";
import type { PartyTemplate } from "../../lib/party/template-types";
import { GameMetaBadge } from "./GameMetaBadge";

interface GameDetailPanelProps {
	template: PartyTemplate | null;
	onPlay: () => void;
	onHowToPlay: () => void;
	onPreview?: () => void;
}

export function GameDetailPanel({
	template,
	onPlay,
	onHowToPlay,
	onPreview,
}: GameDetailPanelProps) {
	if (!template) {
		return (
			<View className="w-full overflow-hidden rounded-t-3xl bg-[#1B3A6B] p-8">
				<AmenGrainOverlay opacity={0.2} />
				<View className="items-center justify-center py-12">
					<Text className="font-lora text-xl text-[#FFFDF7] opacity-50">
						Select a game to begin
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View className="w-full overflow-hidden rounded-t-3xl bg-[#1B3A6B] pb-10 pt-6">
			<AmenGrainOverlay opacity={0.2} />

			<View className="px-6 pb-4">
				<Text className="text-center font-lora text-3xl font-bold text-[#C9A84C]">
					{template.title}
				</Text>
				{template.tagline && (
					<Text className="mt-1 text-center font-inter text-sm italic text-[#FFFDF7] opacity-80">
						{template.tagline}
					</Text>
				)}
			</View>

			<View className="my-2">
				<MotifDivider
					icon="cross"
					color="#C9A84C"
					lineColor="rgba(201, 168, 76, 0.3)"
				/>
			</View>

			<View className="flex-row flex-wrap justify-center gap-2 px-4 py-4">
				<GameMetaBadge
					icon="halo"
					label="Players"
					value={`${template.minPlayers}–${template.maxPlayers}`}
				/>
				{template.sessionLength && (
					<GameMetaBadge
						icon="clock"
						label="Time"
						value={template.sessionLength}
					/>
				)}
				{template.formatTag && (
					<GameMetaBadge
						icon="scroll"
						label="Format"
						value={template.formatTag}
					/>
				)}
				{template.contentNote && (
					<GameMetaBadge
						icon="alert"
						label="Note"
						value={template.contentNote}
					/>
				)}
			</View>

			<View className="mt-4 gap-3 px-6">
				<Pressable
					onPress={onPlay}
					className="w-full items-center justify-center rounded-xl bg-[#C9A84C] py-4 active:opacity-90"
				>
					<Text className="font-lora text-lg font-bold text-[#1B3A6B]">
						PLAY
					</Text>
				</Pressable>

				<Pressable
					onPress={onHowToPlay}
					className="w-full items-center justify-center rounded-xl border border-[#C9A84C] bg-transparent py-3 active:opacity-90"
				>
					<Text className="font-lora text-base font-bold text-[#FFFDF7]">
						HOW TO PLAY
					</Text>
				</Pressable>

				{onPreview && (
					<Pressable
						onPress={onPreview}
						className="w-full items-center justify-center py-2 active:opacity-70"
					>
						<Text className="font-inter text-sm font-medium text-[#FFFDF7] opacity-60">
							PREVIEW
						</Text>
					</Pressable>
				)}
			</View>

			<View className="my-2">
				<MotifDivider
					icon="cross"
					color="#C9A84C"
					lineColor="rgba(201, 168, 76, 0.3)"
				/>
			</View>

			{/* Meta Badges */}
			<View className="flex-row flex-wrap justify-center gap-2 px-4 py-4">
				<GameMetaBadge
					icon="halo"
					label="Players"
					value={`${template.minPlayers}–${template.maxPlayers}`}
				/>
				{template.sessionLength && (
					<GameMetaBadge
						icon="clock"
						label="Time"
						value={template.sessionLength}
					/>
				)}
				{template.formatTag && (
					<GameMetaBadge
						icon="scroll"
						label="Format"
						value={template.formatTag}
					/>
				)}
				{template.contentNote && (
					<GameMetaBadge
						icon="alert"
						label="Note"
						value={template.contentNote}
					/>
				)}
			</View>

			{/* Actions */}
			<View className="mt-4 gap-3 px-6">
				<Pressable
					onPress={onPlay}
					className="w-full items-center justify-center rounded-xl bg-[#C9A84C] py-4 active:opacity-90"
				>
					<Text className="font-lora text-lg font-bold text-[#1B3A6B]">
						PLAY
					</Text>
				</Pressable>

				<Pressable
					onPress={onHowToPlay}
					className="w-full items-center justify-center rounded-xl border border-[#C9A84C] bg-transparent py-3 active:opacity-90"
				>
					<Text className="font-lora text-base font-bold text-[#FFFDF7]">
						HOW TO PLAY
					</Text>
				</Pressable>

				{onPreview && (
					<Pressable
						onPress={onPreview}
						className="w-full items-center justify-center py-2 active:opacity-70"
					>
						<Text className="font-inter text-sm font-medium text-[#FFFDF7] opacity-60">
							PREVIEW
						</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
}
