import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { WireframeModeProvider } from "../wireframe/WireframeModeProvider";
import { WireframePanel } from "./WireframePanel";

vi.mock("@expo/vector-icons", () => ({
	Ionicons: (props: any) => <div data-testid="icon" {...props} />,
}));

vi.mock("../EditorProvider", () => ({
	useEditor: () => ({
		document: {
			party: true,
			world: { bounds: { width: 20, height: 12 } },
			entities: [],
			prefabs: {},
		},
	}),
}));

vi.mock("@/lib/theme", () => ({
	useTheme: () => ({
		editorColors: {
			panelBg: "#fff",
			border: "#ccc",
			text: "#000",
			textSecondary: "#666",
			surface: "#eee",
			surfaceHover: "#ddd",
			accent: "#007AFF",
		},
	}),
}));

describe("WireframePanel", () => {
	it("renders WireframePanel and its title", () => {
		const { getByText } = render(<WireframePanel />);
		expect(getByText("WIREFRAME")).toBeTruthy();
	});

	it("toggles between Structural and Production modes", () => {
		const { getByText, getByRole } = render(<WireframePanel />);

		expect(getByText("Structural")).toBeTruthy();

		const toggleButton = getByRole("button", {
			name: /Switch to Production Mode/i,
		});
		fireEvent.click(toggleButton);

		expect(getByText("Production")).toBeTruthy();

		fireEvent.click(toggleButton);
		expect(getByText("Structural")).toBeTruthy();
	});

	it("navigates between screens", () => {
		const { getByText, getAllByTestId } = render(<WireframePanel />);

		expect(getByText("1 / 3")).toBeTruthy();

		const buttons = getAllByTestId("icon");

		const forwardButton = buttons[1].parentElement;
		fireEvent.click(forwardButton!);

		expect(getByText("2 / 3")).toBeTruthy();

		fireEvent.click(forwardButton!);
		expect(getByText("3 / 3")).toBeTruthy();

		const backButton = buttons[0].parentElement;
		fireEvent.click(backButton!);
		expect(getByText("2 / 3")).toBeTruthy();
	});
});

describe("WireframeModeProvider", () => {
	it("renders children", () => {
		const { getByText } = render(
			<WireframeModeProvider>
				<div>Test Child</div>
			</WireframeModeProvider>,
		);
		expect(getByText("Test Child")).toBeTruthy();
	});
});
