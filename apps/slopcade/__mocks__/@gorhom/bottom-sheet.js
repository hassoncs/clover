import React from "react";

const BottomSheet = React.forwardRef(({ children, ...props }, _ref) =>
	React.createElement("div", props, children),
);
BottomSheet.displayName = "BottomSheet";

export default BottomSheet;

export const BottomSheetView = ({ children, ...props }) =>
	React.createElement("div", props, children);

export const BottomSheetScrollView = ({ children, ...props }) =>
	React.createElement("div", props, children);

export const BottomSheetFlatList = ({
	data,
	renderItem,
	keyExtractor,
	...props
}) =>
	React.createElement(
		"div",
		props,
		data?.map((item, index) => renderItem({ item, index })),
	);

export const BottomSheetTextInput = ({
	onChangeText,
	value,
	testID,
	placeholder,
	...props
}) =>
	React.createElement("input", {
		"data-testid": testID,
		value,
		onChange: (e) => onChangeText?.(e.target.value),
		placeholder,
		...props,
	});

export const BottomSheetModal = React.forwardRef(
	({ children, ...props }, _ref) => React.createElement("div", props, children),
);
BottomSheetModal.displayName = "BottomSheetModal";

export const BottomSheetModalProvider = ({ children }) => children;

export const useBottomSheet = () => ({
	expand: () => {},
	collapse: () => {},
	close: () => {},
	snapToIndex: () => {},
	snapToPosition: () => {},
	forceClose: () => {},
	animatedIndex: { value: 0 },
	animatedPosition: { value: 0 },
});

export const useBottomSheetModal = () => ({
	present: () => {},
	dismiss: () => {},
	dismissAll: () => {},
});
