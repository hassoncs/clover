// @ts-nocheck - Cloudflare Workers types conflict with standard Response/Request in tests
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitService } from "../GitService";

type DurableObjectNamespace =
	import("@cloudflare/workers-types").DurableObjectNamespace;
type DurableObjectId = import("@cloudflare/workers-types").DurableObjectId;
type DurableObjectStub = import("@cloudflare/workers-types").DurableObjectStub;

describe("GitService", () => {
	let mockStub: DurableObjectStub;
	let mockNamespace: DurableObjectNamespace;
	let service: GitService;

	beforeEach(() => {
		mockStub = {
			fetch: vi.fn(),
		} as unknown as DurableObjectStub;

		mockNamespace = {
			idFromName: vi.fn(() => ({}) as DurableObjectId),
			get: vi.fn(() => mockStub),
		} as unknown as DurableObjectNamespace;

		service = new GitService(mockNamespace);
	});

	describe("initRepo", () => {
		it("should send POST /init with gameId", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 }) as never,
			);

			await service.initRepo("game-123");

			expect(mockNamespace.idFromName).toHaveBeenCalledWith("game-123");
			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/init",
					method: "POST",
				}),
			);

			const request = vi.mocked(mockStub.fetch).mock
				.calls[0][0] as unknown as Request;
			expect(request.headers.get("X-Game-Id")).toBe("game-123");
			expect(request.headers.get("Content-Type")).toBe("application/json");

			const body = await request.json();
			expect(body).toEqual({ gameId: "game-123" });
		});

		it("should throw on error response", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "Init failed" }), {
					status: 500,
				}) as never,
			);

			await expect(service.initRepo("game-123")).rejects.toThrow("Init failed");
		});
	});

	describe("commitFiles", () => {
		it("should send POST /commit with files, message, and author", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ sha: "abc123" }), {
					status: 200,
				}) as never,
			);

			const files = [
				{ path: "file1.txt", content: "content1" },
				{ path: "file2.txt", content: "content2" },
			];
			const author = { name: "Test User", email: "test@example.com" };

			const sha = await service.commitFiles(
				"game-123",
				files,
				"Test commit",
				author,
			);

			expect(sha).toBe("abc123");
			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/commit",
					method: "POST",
				}),
			);

			const request = vi.mocked(mockStub.fetch).mock
				.calls[0][0] as unknown as Request;
			const body = await request.json();
			expect(body).toEqual({
				files,
				message: "Test commit",
				author,
			});
		});

		it("should throw on error response", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "Commit failed" }), {
					status: 400,
				}) as never,
			);

			await expect(
				service.commitFiles(
					"game-123",
					[{ path: "file.txt", content: "content" }],
					"message",
					{ name: "User", email: "user@example.com" },
				),
			).rejects.toThrow("Commit failed");
		});
	});

	describe("readFile", () => {
		it("should send GET /read/{path} with optional ref", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ content: "file content" }), {
					status: 200,
				}),
			);

			const content = await service.readFile("game-123", "path/to/file.txt");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/read/path/to/file.txt",
					method: "GET",
				}),
			);

			expect(content).toEqual(new TextEncoder().encode("file content"));
		});

		it("should include ref query param when provided", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ content: "file content" }), {
					status: 200,
				}),
			);

			await service.readFile("game-123", "file.txt", "main");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/read/file.txt?ref=main",
				}),
			);
		});

		it("should return null for 404 responses", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "Not found" }), { status: 404 }),
			);

			const content = await service.readFile("game-123", "missing.txt");

			expect(content).toBeNull();
		});

		it("should throw on other error responses", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "Read failed" }), { status: 500 }),
			);

			await expect(service.readFile("game-123", "file.txt")).rejects.toThrow(
				"Read failed",
			);
		});
	});

	describe("listFiles", () => {
		it("should send GET /tree with optional ref", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						files: ["file1.txt", "file2.txt", "dir/file3.txt"],
					}),
					{ status: 200 },
				),
			);

			const files = await service.listFiles("game-123");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/tree",
					method: "GET",
				}),
			);

			expect(files).toEqual(["file1.txt", "file2.txt", "dir/file3.txt"]);
		});

		it("should include ref query param when provided", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ files: [] }), { status: 200 }),
			);

			await service.listFiles("game-123", "develop");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/tree?ref=develop",
				}),
			);
		});

		it("should throw on error response", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "List failed" }), { status: 500 }),
			);

			await expect(service.listFiles("game-123")).rejects.toThrow(
				"List failed",
			);
		});
	});

	describe("log", () => {
		it("should send GET /log with optional depth", async () => {
			const commits = [
				{
					oid: "abc123",
					message: "Commit 1",
					author: { name: "User", email: "user@example.com", timestamp: 123 },
				},
				{
					oid: "def456",
					message: "Commit 2",
					author: { name: "User", email: "user@example.com", timestamp: 456 },
				},
			];

			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ commits }), { status: 200 }),
			);

			const result = await service.log("game-123");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/log",
					method: "GET",
				}),
			);

			expect(result).toEqual(commits);
		});

		it("should include depth query param when provided", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ commits: [] }), { status: 200 }),
			);

			await service.log("game-123", 10);

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/log?depth=10",
				}),
			);
		});

		it("should throw on error response", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "Log failed" }), { status: 500 }),
			);

			await expect(service.log("game-123")).rejects.toThrow("Log failed");
		});
	});

	describe("createBranch", () => {
		it("should send POST /branch with name and optional ref", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);

			await service.createBranch("game-123", "feature-branch");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/branch",
					method: "POST",
				}),
			);

			const request = vi.mocked(mockStub.fetch).mock.calls[0][0] as Request;
			const body = await request.json();
			expect(body).toEqual({ name: "feature-branch", ref: undefined });
		});

		it("should include ref when provided", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);

			await service.createBranch("game-123", "feature-branch", "main");

			const request = vi.mocked(mockStub.fetch).mock.calls[0][0] as Request;
			const body = await request.json();
			expect(body).toEqual({ name: "feature-branch", ref: "main" });
		});

		it("should throw on error response", async () => {
			// @ts-expect-error - Cloudflare Workers Response type mismatch in tests
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "Init failed" }), {
					status: 500,
				}),
			);

			await expect(service.initRepo("game-123")).rejects.toThrow("Init failed");
		});
	});

	describe("createTag", () => {
		it("should send POST /tag with name and optional ref", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);

			await service.createTag("game-123", "v1.0.0");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/tag",
					method: "POST",
				}),
			);

			const request = vi.mocked(mockStub.fetch).mock.calls[0][0] as Request;
			const body = await request.json();
			expect(body).toEqual({ name: "v1.0.0", ref: undefined });
		});

		it("should include ref when provided", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), { status: 200 }),
			);

			await service.createTag("game-123", "v1.0.0", "abc123");

			const request = vi.mocked(mockStub.fetch).mock.calls[0][0] as Request;
			const body = await request.json();
			expect(body).toEqual({ name: "v1.0.0", ref: "abc123" });
		});

		it("should throw on error response", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "Tag failed" }), { status: 400 }),
			);

			await expect(service.createTag("game-123", "v1.0.0")).rejects.toThrow(
				"Tag failed",
			);
		});
	});

	describe("diffTrees", () => {
		it("should send GET /diff with refA and refB", async () => {
			const changes = [
				{ path: "file1.txt", type: "add" as const },
				{ path: "file2.txt", type: "modify" as const },
				{ path: "file3.txt", type: "delete" as const },
			];

			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ changes }), { status: 200 }),
			);

			const result = await service.diffTrees("game-123", "main", "develop");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/diff?refA=main&refB=develop",
					method: "GET",
				}),
			);

			expect(result).toEqual(changes);
		});

		it("should URL-encode ref parameters", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ changes: [] }), { status: 200 }),
			);

			await service.diffTrees("game-123", "feature/test", "main");

			expect(mockStub.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://git-repo/diff?refA=feature%2Ftest&refB=main",
				}),
			);
		});

		it("should throw on error response", async () => {
			vi.mocked(mockStub.fetch).mockResolvedValue(
				new Response(JSON.stringify({ error: "Diff failed" }), { status: 500 }),
			);

			await expect(
				service.diffTrees("game-123", "main", "develop"),
			).rejects.toThrow("Diff failed");
		});
	});
});
