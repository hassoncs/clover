import { DashPathEffect, Group, Paint, Rect } from "@shopify/react-native-skia";
import type React from "react";
import { useEffect } from "react";
import {
	useDerivedValue,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import type { LayoutNode } from "../layout";

const FRESH_THRESHOLD_MS = 2000;
const BORDER_COLOR = "#06b6d4";
const BORDER_WIDTH = 2;
const DASH_TOTAL = 20;

interface BuildChromeProps {
	layoutNode: LayoutNode;
	children: React.ReactNode;
}

export function BuildChrome({
	layoutNode,
	children,
}: BuildChromeProps): React.ReactNode {
	const node = layoutNode.node as { createdAt?: number };
	const { x, y, width, height } = layoutNode.rect;

	const isFresh =
		typeof node.createdAt === "number" &&
		Date.now() - node.createdAt < FRESH_THRESHOLD_MS;

	const scale = useSharedValue(isFresh ? 0.985 : 1);
	const opacity = useSharedValue(isFresh ? 0 : 1);
	const dashPhase = useSharedValue(0);
	const borderOpacity = useSharedValue(isFresh ? 0.85 : 0);

	useEffect(() => {
		if (!isFresh) return;

		scale.value = withTiming(1, { duration: 400 });
		opacity.value = withTiming(1, { duration: 300 });

		dashPhase.value = withRepeat(
			withTiming(DASH_TOTAL, { duration: 400 }),
			-1,
			false,
		);

		const timer = setTimeout(() => {
			borderOpacity.value = withTiming(0, { duration: 200 });
		}, 1800);

		return () => clearTimeout(timer);
	}, [isFresh, scale, opacity, dashPhase, borderOpacity]);

	const cx = x + width / 2;
	const cy = y + height / 2;
	const transform = useDerivedValue(() => [
		{ translateX: cx },
		{ translateY: cy },
		{ scale: scale.value },
		{ translateX: -cx },
		{ translateY: -cy },
	]);

	if (!isFresh) {
		return <>{children}</>;
	}

	return (
		<Group transform={transform} opacity={opacity}>
			{children}
			<Group opacity={borderOpacity}>
				<Rect
					x={x - 1}
					y={y - 1}
					width={width + 2}
					height={height + 2}
					color="transparent"
				>
					<Paint style="stroke" strokeWidth={BORDER_WIDTH} color={BORDER_COLOR}>
						<DashPathEffect intervals={[6, 4]} phase={dashPhase} />
					</Paint>
				</Rect>
			</Group>
		</Group>
	);
}
