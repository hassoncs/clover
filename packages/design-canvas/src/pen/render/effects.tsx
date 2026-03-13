import { BackdropFilter, Blur, Shadow } from "@shopify/react-native-skia";
import type { PenEffect } from "@slopcade/shared/types/pen";
import type React from "react";

interface EffectsProps {
	effects: PenEffect[] | undefined;
}

export function PenEffectsRenderer({ effects }: EffectsProps): React.ReactNode {
	if (!effects || effects.length === 0) return null;

	const elements: React.ReactNode[] = [];

	for (const effect of effects) {
		if (effect.enabled === false) continue;

		if (effect.shadow && effect.shadow.enabled !== false) {
			const s = effect.shadow;
			elements.push(
				<Shadow
					key={`shadow-${elements.length}`}
					dx={s.offsetX}
					dy={s.offsetY}
					blur={s.blur}
					color={s.color}
					inner={s.inner ?? false}
				/>,
			);
		}

		if (effect.blur != null) {
			elements.push(
				<Blur
					key={`blur-${elements.length}`}
					blur={effect.blur / 2}
					mode="clamp"
				/>,
			);
		}

		if (effect.background_blur != null) {
			elements.push(
				<BackdropFilter
					key={`bg-blur-${elements.length}`}
					filter={<Blur blur={effect.background_blur / 2} mode="clamp" />}
				/>,
			);
		}
	}

	return elements.length > 0 ? <>{elements}</> : null;
}
