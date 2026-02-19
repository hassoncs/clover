import { AnswerRevealSequence as _AnswerRevealSequence } from "@slopcade/ui";
import type React from "react";
import { getAudioManager } from "@/lib/audio/AudioManager";

type Props = Omit<
	React.ComponentProps<typeof _AnswerRevealSequence>,
	"playSfx"
>;

export function AnswerRevealSequence(props: Props) {
	return (
		<_AnswerRevealSequence
			playSfx={(id) => getAudioManager().playSfx(id)}
			{...props}
		/>
	);
}
