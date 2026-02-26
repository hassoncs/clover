import { render } from "@testing-library/react";
import React from "react";

jest.mock("react-native", () => ({
	View: (props: any) => <div {...props} />,
	Text: (props: any) => <span {...props} />,
	Pressable: ({ onPress, children, testID, ...props }: any) => (
		<button data-testid={testID} onClick={onPress} {...props}>
			{children}
		</button>
	),
	TextInput: ({ onChangeText, value, testID, ...props }: any) => (
		<input
			data-testid={testID}
			value={value}
			onChange={(e: any) => onChangeText?.(e.target.value)}
			{...props}
		/>
	),
	StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
	Platform: { OS: "web", select: (obj: any) => obj.web ?? obj.default },
	ActivityIndicator: ({ testID, ...props }: any) => (
		<div data-testid={testID} {...props} />
	),
	Animated: {
		Value: class {
			_value: number;
			constructor(v: number) {
				this._value = v;
			}
			setValue(v: number) {
				this._value = v;
			}
			interpolate(_config: any) {
				return this._value;
			}
			addListener() {}
			removeListener() {}
			removeAllListeners() {}
		},
		View: ({ children, style, ...props }: any) => (
			<div style={style} {...props}>
				{children}
			</div>
		),
	},
}));

jest.mock("@expo/vector-icons", () => ({
	Ionicons: (props: any) => <div data-testid="mic-icon" {...props} />,
}));

describe("debug", () => {
	it("imports MicButton", () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { MicButton } = require("@slopcade/ui");
		console.log("MicButton:", MicButton);
		const { container } = render(
			<MicButton
				isRecording={false}
				isConnecting={false}
				error={null}
				mode="toggle"
			/>,
		);
		console.log("DOM:", container.innerHTML);
	});
});
