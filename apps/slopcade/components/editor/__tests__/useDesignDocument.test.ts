import { useDesignDocument } from "@slopcade/editor";
import {
	createEmptyDesignDocument,
	type DesignDocument,
} from "@slopcade/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const saveCacheSetDataMock = vi.fn();
const mutateAsyncMock = vi.fn();

let serverDocument: DesignDocument;

const queryState = {
	isLoading: false,
	isError: false,
	isSuccess: true,
	data: { content: "" },
	refetch: vi.fn(async () => ({
		data: { content: JSON.stringify(serverDocument) },
	})),
};

vi.mock("@/lib/trpc/react", () => ({
	trpcReact: {
		chatThreads: {
			readWorkspaceFile: {
				useQuery: vi.fn(() => queryState),
			},
			writeWorkspaceFile: {
				useMutation: vi.fn(() => ({ mutateAsync: mutateAsyncMock })),
			},
		},
		useUtils: vi.fn(() => ({
			chatThreads: {
				readWorkspaceFile: {
					setData: saveCacheSetDataMock,
				},
			},
		})),
	},
}));

function buildServerDocument(updatedAt: number): DesignDocument {
	const doc = createEmptyDesignDocument("game-1", "Design");
	doc.metadata.updatedAt = updatedAt;
	doc.frames = [
		{
			id: "frame-1",
			title: "Frame 1",
			width: 1920,
			height: 1080,
			position: { x: 0, y: 0 },
			elements: [],
		},
	];
	return doc;
}

describe("useDesignDocument optimistic concurrency", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		serverDocument = buildServerDocument(100);
		queryState.data = { content: JSON.stringify(serverDocument) };
		mutateAsyncMock.mockResolvedValue(undefined);
	});

	it("rejects stale saves when server document version has advanced", async () => {
		const { result } = renderHook(() => useDesignDocument("game-1"));

		await waitFor(() => {
			expect(result.current.designDocument).not.toBeNull();
		});

		const localDoc = result.current.designDocument!;

		serverDocument = {
			...serverDocument,
			metadata: {
				...serverDocument.metadata,
				updatedAt: 250,
			},
		};

		await act(async () => {
			await result.current.saveDesignDocument({
				...localDoc,
				metadata: { ...localDoc.metadata },
			});
		});

		await act(async () => {
			vi.advanceTimersByTime(350);
			await Promise.resolve();
		});

		expect(mutateAsyncMock).not.toHaveBeenCalled();
		expect(result.current.saveError).toBe(
			"Document was modified by another source. Please refresh and retry.",
		);
	});

	it("writes successfully when local document version is current", async () => {
		const { result } = renderHook(() => useDesignDocument("game-1"));

		await waitFor(() => {
			expect(result.current.designDocument).not.toBeNull();
		});

		const localDoc = result.current.designDocument!;

		await act(async () => {
			await result.current.saveDesignDocument({
				...localDoc,
				metadata: { ...localDoc.metadata },
			});
		});

		await act(async () => {
			vi.advanceTimersByTime(350);
			await Promise.resolve();
		});

		expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		const mutationInput = mutateAsyncMock.mock.calls[0]?.[0] as {
			content: string;
		};
		const savedDocument = JSON.parse(mutationInput.content) as DesignDocument;
		expect(savedDocument.metadata.updatedAt).toBeGreaterThan(100);
		expect(result.current.saveError).toBeNull();
	});
});
