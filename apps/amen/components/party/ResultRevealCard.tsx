import { Text, View } from "react-native";

type ResultRow = {
	label: string;
	detail?: string;
	points?: number;
	highlight?: boolean;
};

type ResultRevealCardProps = {
	title?: string;
	rows: ResultRow[];
	isHost?: boolean;
};

export function ResultRevealCard({
	title,
	rows,
	isHost,
}: ResultRevealCardProps) {
	return (
		<View className="w-full gap-3 items-center">
			{title && (
				<Text
					className={`font-bold text-theme-text mb-2 ${isHost ? "text-3xl" : "text-xl"}`}
				>
					{title}
				</Text>
			)}
			{rows.map((row) => (
				<View
					key={row.label}
					className={`w-full bg-theme-surface rounded-xl border ${
						row.highlight
							? "border-theme-primary bg-theme-primary/10"
							: "border-theme-border"
					} ${isHost ? "p-6 max-w-3xl" : "p-4"}`}
				>
					<View className="flex-row justify-between items-center">
						<View className="flex-1 mr-4">
							<Text
								className={`text-theme-text font-bold ${isHost ? "text-2xl" : "text-base"}`}
							>
								{row.label}
							</Text>
							{row.detail && (
								<Text
									className={`text-theme-text-secondary mt-1 ${isHost ? "text-lg" : "text-sm"}`}
								>
									{row.detail}
								</Text>
							)}
						</View>
						{row.points != null && (
							<Text
								className={`font-bold text-theme-primary ${isHost ? "text-2xl" : "text-base"}`}
							>
								+{row.points}
							</Text>
						)}
					</View>
				</View>
			))}
		</View>
	);
}
