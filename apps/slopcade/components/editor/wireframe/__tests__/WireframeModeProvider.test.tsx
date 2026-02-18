// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
	useWireframeMode,
	WireframeModeProvider,
} from "../WireframeModeProvider";

vi.mock("../../EditorProvider", () => ({
	useEditor: () => ({
		document: {
			party: true,
			world: { bounds: { width: 20, height: 12 } },
			entities: [],
			prefabs: {},
		},
	}),
}));

describe("WireframeModeProvider", () => {
	it("defaults to structural mode", () => {
		const { result } = renderHook(() => useWireframeMode(), {
			wrapper: WireframeModeProvider,
		});

		expect(result.current.mode).toBe("structural");
	});

	it("toggles between structural and production modes", () => {
		const { result } = renderHook(() => useWireframeMode(), {
			wrapper: WireframeModeProvider,
		});

		act(() => {
			result.current.toggleMode();
		});
		expect(result.current.mode).toBe("production");

		act(() => {
			result.current.toggleMode();
		});
		expect(result.current.mode).toBe("structural");
	});

	it("sets mode explicitly", () => {
		const { result } = renderHook(() => useWireframeMode(), {
			wrapper: WireframeModeProvider,
		});

		act(() => {
			result.current.setMode("production");
		});
		expect(result.current.mode).toBe("production");
	});

	it("updates selectedScreenIndex", () => {
		const { result } = renderHook(() => useWireframeMode(), {
			wrapper: WireframeModeProvider,
		});

		expect(result.current.selectedScreenIndex).toBe(0);

		act(() => {
			result.current.setSelectedScreenIndex(1);
		});
		expect(result.current.selectedScreenIndex).toBe(1);
	});

	it("derives totalScreens from document (party=true)", () => {
		const { result } = renderHook(() => useWireframeMode(), {
			wrapper: WireframeModeProvider,
		});

		expect(result.current.totalScreens).toBe(3);
	});
});
