import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { SpeechToTextError } from "@/lib/speech/types";
import { MicButton } from "../MicButton";

vi.mock("react-native", () => ({
	Pressable: ({
		onPressIn,
		onPressOut,
		onPress,
		children,
		testID,
		accessibilityRole,
		accessibilityLabel,
		...props
	}: any) => (
		<div
			{...props}
			data-testid={testID}
			role={accessibilityRole}
			aria-label={accessibilityLabel}
			onMouseDown={onPressIn}
			onMouseUp={onPressOut}
			onClick={onPress}
		>
			{children}
		</div>
	),
	ActivityIndicator: ({ testID, ...props }: any) => (
		<div data-testid={testID} {...props} />
	),
	StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
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

vi.mock("@expo/vector-icons", () => ({
	Ionicons: (props: any) => <div data-testid="mic-icon" {...props} />,
}));

describe("MicButton", () => {
	const defaultProps = {
		isRecording: false,
		isConnecting: false,
		error: null,
		mode: "toggle" as const,
	};

	it("renders mic icon in idle state", () => {
		const { getByTestId } = render(<MicButton {...defaultProps} />);
		expect(getByTestId("mic-button")).toBeTruthy();
		expect(getByTestId("mic-icon")).toBeTruthy();
	});

	it("renders active/recording state when isRecording=true", () => {
		const { getByTestId } = render(
			<MicButton {...defaultProps} isRecording={true} />,
		);
		expect(getByTestId("mic-button")).toBeTruthy();
		expect(getByTestId("mic-icon")).toBeTruthy();
	});

	it("renders connecting state when isConnecting=true", () => {
		const { getByTestId } = render(
			<MicButton {...defaultProps} isConnecting={true} />,
		);
		expect(getByTestId("loading-indicator")).toBeTruthy();
	});

	it("renders error state when error is set", () => {
		const error: SpeechToTextError = {
			code: "NETWORK_ERROR",
			message: "Network error",
		};
		const { getByTestId } = render(
			<MicButton {...defaultProps} error={error} />,
		);
		expect(getByTestId("mic-button")).toBeTruthy();
	});

	it("calls onPressIn when pressed (for hold mode)", () => {
		const onPressIn = vi.fn();
		const { getByTestId } = render(
			<MicButton {...defaultProps} mode="hold" onPressIn={onPressIn} />,
		);
		fireEvent.mouseDown(getByTestId("mic-button"), { buttons: 1 });
		expect(onPressIn).toHaveBeenCalled();
	});

	it("calls onPressOut when released (for hold mode)", () => {
		const onPressOut = vi.fn();
		const { getByTestId } = render(
			<MicButton {...defaultProps} mode="hold" onPressOut={onPressOut} />,
		);
		fireEvent.mouseDown(getByTestId("mic-button"), { buttons: 1 });
		fireEvent.mouseUp(getByTestId("mic-button"));
		expect(onPressOut).toHaveBeenCalled();
	});

	it("calls onPress when tapped (for toggle mode)", () => {
		const onPress = vi.fn();
		const { getByTestId } = render(
			<MicButton {...defaultProps} mode="toggle" onPress={onPress} />,
		);
		fireEvent.click(getByTestId("mic-button"));
		expect(onPress).toHaveBeenCalled();
	});

	it("has accessibilityLabel and accessibilityRole", () => {
		const { getByRole } = render(<MicButton {...defaultProps} />);
		const button = getByRole("button");
		expect(button).toBeTruthy();
	});
});
