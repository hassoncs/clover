import React from "react";

function flattenStyle(style) {
	if (!style) return undefined;
	if (typeof style === "function")
		return flattenStyle(style({ pressed: false }));
	if (Array.isArray(style)) {
		return Object.assign({}, ...style.map(flattenStyle).filter(Boolean));
	}
	return style;
}

const Animated = {
	Value: class {
		constructor(v) {
			this._value = v;
		}
		setValue(v) {
			this._value = v;
		}
		interpolate(_config) {
			return this._value;
		}
		addListener() {}
		removeListener() {}
		removeAllListeners() {}
	},
	View: ({ children, style, ...props }) =>
		React.createElement(
			"div",
			{ style: flattenStyle(style), ...props },
			children,
		),
	Text: ({ children, style, ...props }) =>
		React.createElement(
			"span",
			{ style: flattenStyle(style), ...props },
			children,
		),
	ScrollView: ({ children, style, ...props }) =>
		React.createElement(
			"div",
			{ style: flattenStyle(style), ...props },
			children,
		),
	Image: ({ style, ...props }) =>
		React.createElement("img", { style: flattenStyle(style), ...props }),
	createAnimatedComponent: (Component) => Component,
	timing: (value, config) => ({
		start: (cb) => {
			if (config?.toValue !== undefined) value._value = config.toValue;
			cb?.({ finished: true });
		},
	}),
	loop: (anim) => ({
		start: (cb) => {
			anim.start(cb);
		},
	}),
	sequence: (anims) => ({
		start: (cb) => {
			anims.forEach((a) => a.start?.());
			cb?.({ finished: true });
		},
	}),
	parallel: (anims) => ({
		start: (cb) => {
			anims.forEach((a) => a.start?.());
			cb?.({ finished: true });
		},
	}),
	spring: (value, config) => ({
		start: (cb) => {
			if (config?.toValue !== undefined) value._value = config.toValue;
			cb?.({ finished: true });
		},
	}),
};

export { Animated };

export const Platform = {
	OS: "web",
	select: (obj) => obj.web ?? obj.default,
};

export const View = ({ children, style, ...props }) =>
	React.createElement(
		"div",
		{ style: flattenStyle(style), ...props },
		children,
	);

export const Text = ({ children, style, ...props }) =>
	React.createElement(
		"span",
		{ style: flattenStyle(style), ...props },
		children,
	);

export const Pressable = ({
	children,
	onPress,
	onPressIn,
	onPressOut,
	testID,
	accessibilityRole,
	accessibilityLabel,
	accessibilityState,
	style,
	...props
}) =>
	React.createElement(
		"button",
		{
			"data-testid": testID,
			role: accessibilityRole,
			"aria-label": accessibilityLabel,
			onClick: onPress,
			onMouseDown: onPressIn,
			onMouseUp: onPressOut,
			style: flattenStyle(style),
			...props,
		},
		typeof children === "function" ? children({ pressed: false }) : children,
	);

export const TextInput = ({
	onChangeText,
	value,
	testID,
	placeholder,
	style,
	...props
}) =>
	React.createElement("input", {
		"data-testid": testID,
		value,
		onChange: (e) => onChangeText?.(e.target.value),
		placeholder,
		style: flattenStyle(style),
		...props,
	});

export const ActivityIndicator = ({ testID, style, ...props }) =>
	React.createElement("div", {
		"data-testid": testID,
		style: flattenStyle(style),
		...props,
	});

export const ScrollView = ({ children, style, ...props }) =>
	React.createElement(
		"div",
		{ style: flattenStyle(style), ...props },
		children,
	);

export const TouchableOpacity = ({
	children,
	onPress,
	testID,
	style,
	...props
}) =>
	React.createElement(
		"button",
		{
			"data-testid": testID,
			onClick: onPress,
			style: flattenStyle(style),
			...props,
		},
		children,
	);

export const Image = ({ testID, style, ...props }) =>
	React.createElement("img", {
		"data-testid": testID,
		style: flattenStyle(style),
		...props,
	});

export const StyleSheet = {
	create: (styles) => styles,
	flatten: flattenStyle,
};

export const useColorScheme = () => "light";
export const useWindowDimensions = () => ({ width: 375, height: 812 });

export const Dimensions = {
	get: () => ({ width: 375, height: 812 }),
	addEventListener: () => ({ remove: () => {} }),
};

export const Alert = {
	alert: () => {},
};

export const Keyboard = {
	dismiss: () => {},
	addListener: () => ({ remove: () => {} }),
};

export const LayoutAnimation = {
	configureNext: () => {},
	Presets: {},
};

export const FlatList = ({ data, renderItem, keyExtractor, style, ...props }) =>
	React.createElement(
		"div",
		{ style: flattenStyle(style), ...props },
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

export const SafeAreaView = ({ children, style, ...props }) =>
	React.createElement(
		"div",
		{ style: flattenStyle(style), ...props },
		children,
	);

export const Modal = ({ children, visible, ...props }) =>
	visible ? React.createElement("div", props, children) : null;

export const Switch = ({ value, onValueChange, testID, ...props }) =>
	React.createElement("input", {
		type: "checkbox",
		checked: value,
		onChange: (e) => onValueChange?.(e.target.checked),
		"data-testid": testID,
		...props,
	});

export default {
	Animated,
	Platform,
	View,
	Text,
	Pressable,
	TextInput,
	ActivityIndicator,
	ScrollView,
	TouchableOpacity,
	Image,
	StyleSheet,
	useColorScheme,
	useWindowDimensions,
	Dimensions,
	Alert,
	Keyboard,
	LayoutAnimation,
	FlatList,
	SafeAreaView,
	Modal,
	Switch,
};
