import { RoundScoreBoard as _RoundScoreBoard } from "@slopcade/ui";
import type React from "react";
import { getAudioManager } from "@/lib/audio/AudioManager";

type Props = Omit<React.ComponentProps<typeof _RoundScoreBoard>, "playSfx">;

export function RoundScoreBoard(props: Props) {
	return (
		<_RoundScoreBoard
			playSfx={(id) => getAudioManager().playSfx(id)}
			{...props}
		/>
	);
}
