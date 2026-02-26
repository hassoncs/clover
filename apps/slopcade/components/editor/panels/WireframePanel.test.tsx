import {
	EditorConfigProvider,
	EditorProvider,
	WireframePanel,
} from "@slopcade/editor";
import type { GameDefinition } from "@slopcade/shared";
import { render } from "@testing-library/react";
import React from "react";

jest.mock("@expo/vector-icons", () => ({
	Ionicons: (props: any) => <div data-testid="icon" {...props} />,
}));

jest.mock("@/lib/theme", () => ({
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

jest.mock("@/lib/utils/storage", () => ({
	getStorageItem: jest.fn().mockResolvedValue(null),
	setStorageItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/trpc/client", () => ({ trpc: {} }));
jest.mock("@/lib/supabase/client", () => ({ supabase: null }));
jest.mock("@/lib/auth/token", () => ({ getAuthToken: jest.fn() }));

const minimalDefinition: GameDefinition = {
	metadata: { id: "test", title: "Test", version: "1.0.0" },
	world: {
		gravity: { x: 0, y: 9.8 },
		pixelsPerMeter: 50,
		bounds: { width: 20, height: 12 },
	},
	prefabs: {},
	entities: [],
	variables: {},
} as unknown as GameDefinition;

const mockEditorConfig = {
	trpc: {
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
	} as any,
	chat: {
		useChatEventSubscription: jest.fn(),
	} as any,
	getStorageItem: jest.fn().mockResolvedValue(null),
	setStorageItem: jest.fn().mockResolvedValue(undefined),
};

function Wrapper({ children }: { children: React.ReactNode }) {
	return React.createElement(
		EditorConfigProvider,
		{ config: mockEditorConfig },
		React.createElement(
			EditorProvider,
			{ gameId: "test", initialDefinition: minimalDefinition },
			children,
		),
	);
}

describe("WireframePanel", () => {
	it("renders WireframePanel and its title", () => {
		const { getByText } = render(<WireframePanel />, { wrapper: Wrapper });
		expect(getByText("WIREFRAME")).toBeTruthy();
	});
});
