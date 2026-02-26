import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
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
});
