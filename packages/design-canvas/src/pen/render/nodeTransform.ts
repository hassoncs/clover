type TransformItem =
	| { translateX: number }
	| { translateY: number }
	| { scaleX: number }
	| { scaleY: number };

export function buildNodeTransform(
	x: number,
	y: number,
	width: number,
	height: number,
	flipX?: boolean,
	flipY?: boolean,
): TransformItem[] {
	if (!flipX && !flipY) {
		return [{ translateX: x }, { translateY: y }];
	}
	return [
		{ translateX: x + width / 2 },
		{ translateY: y + height / 2 },
		{ scaleX: flipX ? -1 : 1 },
		{ scaleY: flipY ? -1 : 1 },
		{ translateX: -width / 2 },
		{ translateY: -height / 2 },
	];
}
