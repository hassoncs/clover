import { VoteTally as _VoteTally } from "@slopcade/ui";
import type React from "react";
import { getAudioManager } from "@/lib/audio/AudioManager";

type Props = Omit<React.ComponentProps<typeof _VoteTally>, "playSfx">;

export function VoteTally(props: Props) {
	return (
		<_VoteTally playSfx={(id) => getAudioManager().playSfx(id)} {...props} />
	);
}
