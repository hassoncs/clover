import {
	createEmptyDesignDocument,
	type DesignDocument,
} from "@slopcade/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignDocument } from "../useDesignDocument";

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

	it("round-trip: v1.1 document with new element types preserves all elements through load/save", async () => {
		const docWithNewElements: DesignDocument = {
			...serverDocument,
			frames: [
				{
					id: "frame-1",
					title: "Frame 1",
					width: 1920,
					height: 1080,
					position: { x: 0, y: 0 },
					elements: [
						{
							type: "circle",
							id: "c1",
							x: 10,
							y: 10,
							width: 80,
							height: 80,
							zIndex: 1,
						},
						{
							type: "line",
							id: "l1",
							x1: 0,
							y1: 0,
							x2: 100,
							y2: 100,
							zIndex: 2,
						},
						{
							type: "path",
							id: "p1",
							x: 50,
							y: 50,
							data: "M 0 0 L 40 40",
							zIndex: 3,
						},
						{
							type: "group",
							id: "g1",
							x: 0,
							y: 0,
							width: 200,
							height: 200,
							childIds: [],
							zIndex: 4,
						},
					],
				},
			],
		};
		serverDocument = docWithNewElements;
		queryState.data = { content: JSON.stringify(docWithNewElements) };

		const { result } = renderHook(() => useDesignDocument("game-1"));

		await waitFor(() => {
			expect(result.current.designDocument).not.toBeNull();
		});

		const loadedDoc = result.current.designDocument!;
		const loadedElements = loadedDoc.frames[0].elements;
		expect(loadedElements).toHaveLength(4);
		expect(loadedElements[0].type).toBe("circle");
		expect(loadedElements[1].type).toBe("line");
		expect(loadedElements[2].type).toBe("path");
		expect(loadedElements[3].type).toBe("group");

		await act(async () => {
			await result.current.saveDesignDocument(loadedDoc);
		});

		await act(async () => {
			vi.advanceTimersByTime(350);
			await Promise.resolve();
		});

		expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		const mutationInput = mutateAsyncMock.mock.calls[0]?.[0] as {
			content: string;
		};
		const savedDoc = JSON.parse(mutationInput.content) as DesignDocument;
		const savedElements = savedDoc.frames[0].elements;
		expect(savedElements).toHaveLength(4);
		expect(savedElements[0].type).toBe("circle");
		expect(savedElements[0].id).toBe("c1");
		expect(savedElements[1].type).toBe("line");
		expect(savedElements[1].id).toBe("l1");
		expect(savedElements[2].type).toBe("path");
		expect(savedElements[2].id).toBe("p1");
		expect(savedElements[3].type).toBe("group");
		expect(savedElements[3].id).toBe("g1");
		expect(result.current.saveError).toBeNull();
	});
});
