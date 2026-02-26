import React from "react";

export const FlashList = ({
	data,
	renderItem,
	keyExtractor,
	style,
	...props
}) =>
	React.createElement(
		"div",
		{ style, ...props },
		data?.map((item, index) =>
			renderItem({
				item,
				index,
				separators: {
					highlight: () => {},
					unhighlight: () => {},
					updateProps: () => {},
				},
			}),
		),
	);

export const AnimatedFlashList = FlashList;

export default { FlashList, AnimatedFlashList };
