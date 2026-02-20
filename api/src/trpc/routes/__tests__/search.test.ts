/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import { createPublicContext } from "../../../__fixtures__/test-utils";
import { appRouter } from "../../router";

describe("Search Router", () => {
	it("returns results for a matching query", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				icons: ["mdi:star", "mdi:star-outline"],
				total: 2,
				limit: 2,
				start: 0,
				collections: {
					mdi: {
						name: "Material Design Icons",
						license: { title: "Apache-2.0" },
					},
				},
			}),
		});

		try {
			const caller = appRouter.createCaller(createPublicContext());
			const result = await caller.search.query({
				query: "star",
				limit: 2,
				start: 0,
			});

			expect(result.results).toHaveLength(2);
			expect(result.total).toBe(2);
			expect(result.hasMore).toBe(true);
		} finally {
			globalThis.fetch = originalFetch;
			void env;
		}
	});

	it("returns empty results for non-matching query", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				icons: [],
				total: 0,
				limit: 64,
				start: 0,
				collections: {},
			}),
		});

		try {
			const caller = appRouter.createCaller(createPublicContext());
			const result = await caller.search.query({
				query: "nope",
				limit: 64,
				start: 0,
			});

			expect(result.results).toHaveLength(0);
			expect(result.total).toBe(0);
		} finally {
			globalThis.fetch = originalFetch;
			void env;
		}
	});
});
