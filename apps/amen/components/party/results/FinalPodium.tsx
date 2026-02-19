import { FinalPodium as _FinalPodium } from "@slopcade/ui";
import type React from "react";
import { getAudioManager } from "@/lib/audio/AudioManager";

type Props = Omit<React.ComponentProps<typeof _FinalPodium>, "playSfx">;

export function FinalPodium(props: Props) {
	return (
		<_FinalPodium playSfx={(id) => getAudioManager().playSfx(id)} {...props} />
	);
}
