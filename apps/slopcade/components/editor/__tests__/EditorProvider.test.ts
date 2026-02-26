import {
	EditorConfigProvider,
	EditorProvider,
	useEditor,
} from "@slopcade/editor";
import type { GameDefinition } from "@slopcade/shared";
import { act, renderHook } from "@testing-library/react";
import React from "react";

jest.mock("@/lib/utils/storage", () => ({
	getStorageItem: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/trpc/client", () => ({ trpc: {} }));
jest.mock("@/lib/supabase/client", () => ({ supabase: null }));
jest.mock("@/lib/auth/token", () => ({ getAuthToken: jest.fn() }));

const minimalDefinition: GameDefinition = {
	metadata: { id: "test", title: "Test", version: "1.0.0" },
	world: {
		gravity: { x: 0, y: 9.8 },
		pixelsPerMeter: 50,
		bounds: { width: 10, height: 10 },
	},
	prefabs: {},
	entities: [],
	variables: {},
} as unknown as GameDefinition;

function makeMockTrpc() {
	return {
		packageReadiness: {
			get: {
				useQuery: jest.fn(() => ({
					data: undefined,
					isFetching: false,
					refetch: jest.fn(),
				})),
			},
		},
		packageCompiler: {
			compile: {
				useMutation: jest.fn(() => ({
					mutate: jest.fn(),
					isPending: false,
				})),
			},
		},
		chatThreads: {
			readWorkspaceFile: {
				useQuery: jest.fn(() => ({
					data: undefined,
					isLoading: false,
					isError: false,
					isSuccess: false,
					refetch: jest.fn(),
				})),
			},
			writeWorkspaceFile: {
				useMutation: jest.fn(() => ({ mutateAsync: jest.fn() })),
			},
		},
		useUtils: jest.fn(() => ({
			chatThreads: {
				readWorkspaceFile: { setData: jest.fn() },
			},
		})),
	} as any;
}

function makeMockEditorConfig() {
	return {
		trpc: makeMockTrpc(),
		chat: {
			useChatEventSubscription: jest.fn(),
		} as any,
		getStorageItem: jest.fn().mockResolvedValue(null),
		setStorageItem: jest.fn().mockResolvedValue(undefined),
	};
}

function makeWrapper(gameId = "game-1") {
	const config = makeMockEditorConfig();
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(
			EditorConfigProvider,
			{ config },
			React.createElement(EditorProvider, {
				gameId,
				initialDefinition: minimalDefinition,
				children,
			}),
		);
}

describe("EditorProvider — design selection state", () => {
	it("initial state has all design fields as null/idle", async () => {
		const { result } = renderHook(() => useEditor(), {
			wrapper: makeWrapper(),
		});
		await act(async () => {});

		expect(result.current.selectedDesignFrameId).toBeNull();
		expect(result.current.selectedDesignElementId).toBeNull();
		expect(result.current.designMode).toBe("idle");
	});

	it("SELECT_DESIGN_FRAME sets frameId and clears elementId", async () => {
		const { result } = renderHook(() => useEditor(), {
			wrapper: makeWrapper(),
		});
		await act(async () => {});

		act(() => {
			result.current.selectDesignElement("el-1", "frame-A");
		});

		expect(result.current.selectedDesignElementId).toBe("el-1");

		act(() => {
			result.current.selectDesignFrame("frame-B");
		});

		expect(result.current.selectedDesignFrameId).toBe("frame-B");
		expect(result.current.selectedDesignElementId).toBeNull();
	});

	it("SELECT_DESIGN_ELEMENT sets both frameId and elementId", async () => {
		const { result } = renderHook(() => useEditor(), {
			wrapper: makeWrapper(),
		});
		await act(async () => {});

		act(() => {
			result.current.selectDesignElement("el-2", "frame-C");
		});

		expect(result.current.selectedDesignFrameId).toBe("frame-C");
		expect(result.current.selectedDesignElementId).toBe("el-2");
	});

	it("CLEAR_DESIGN_SELECTION resets both ids to null and mode to idle", async () => {
		const { result } = renderHook(() => useEditor(), {
			wrapper: makeWrapper(),
		});
		await act(async () => {});

		act(() => {
			result.current.selectDesignElement("el-3", "frame-D");
			result.current.setDesignMode("select");
		});

		expect(result.current.selectedDesignFrameId).toBe("frame-D");
		expect(result.current.selectedDesignElementId).toBe("el-3");
		expect(result.current.designMode).toBe("select");

		act(() => {
			result.current.clearDesignSelection();
		});

		expect(result.current.selectedDesignFrameId).toBeNull();
		expect(result.current.selectedDesignElementId).toBeNull();
		expect(result.current.designMode).toBe("idle");
	});

	it("SET_DESIGN_MODE updates designMode", async () => {
		const { result } = renderHook(() => useEditor(), {
			wrapper: makeWrapper(),
		});
		await act(async () => {});

		act(() => {
			result.current.setDesignMode("pan");
		});

		expect(result.current.designMode).toBe("pan");

		act(() => {
			result.current.setDesignMode("select");
		});

		expect(result.current.designMode).toBe("select");
	});

	it("SET_DESIGN_PHASE updates designPhase", async () => {
		const { result } = renderHook(() => useEditor(), {
			wrapper: makeWrapper(),
		});
		await act(async () => {});

		expect(result.current.designPhase).toBe("idle");

		act(() => {
			result.current.setDesignPhase("designing");
		});

		expect(result.current.designPhase).toBe("designing");

		act(() => {
			result.current.setDesignPhase("approved");
		});

		expect(result.current.designPhase).toBe("approved");

		act(() => {
			result.current.setDesignPhase("implementing");
		});

		expect(result.current.designPhase).toBe("implementing");
	});

	it("mode transition live → author preserves design selection", async () => {
		const { result } = renderHook(() => useEditor(), {
			wrapper: makeWrapper(),
		});
		await act(async () => {});

		act(() => {
			result.current.selectDesignFrame("frame-E");
			result.current.setDesignMode("select");
		});

		act(() => {
			result.current.setMode("live");
		});

		expect(result.current.mode).toBe("live");
		expect(result.current.selectedDesignFrameId).toBe("frame-E");
		expect(result.current.designMode).toBe("select");

		act(() => {
			result.current.setMode("author");
		});

		expect(result.current.mode).toBe("author");
		expect(result.current.selectedDesignFrameId).toBe("frame-E");
		expect(result.current.designMode).toBe("select");
	});

	it("design selection does not appear in undo stack", async () => {
		const { result } = renderHook(() => useEditor(), {
			wrapper: makeWrapper(),
		});
		await act(async () => {});

		expect(result.current.canUndo).toBe(false);

		act(() => {
			result.current.selectDesignFrame("frame-F");
			result.current.selectDesignElement("el-4", "frame-F");
			result.current.setDesignMode("pan");
		});

		expect(result.current.canUndo).toBe(false);
	});
});
