import type { SoundAction } from "@slopcade/shared";
import type { RuleContext } from "../types";
import type { ActionExecutor } from "./ActionExecutor";

export class SoundActionExecutor implements ActionExecutor<SoundAction> {
	execute(action: SoundAction, context: RuleContext): void {
		if (!context.playSound) {
			console.warn("[SoundAction] No playSound callback available");
			return;
		}
		context.playSound(action.soundId, action.volume, action.pitch);
	}
}
