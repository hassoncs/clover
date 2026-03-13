import { parsePenDocument } from "@slopcade/protocol/pen";
import { describe, expect, it } from "vitest";

import type { PencilFileRef, PencilHostAdapter } from "./contracts";

describe("pencil-core contracts", () => {
	it("re-exports protocol-owned contract types", () => {
		const fileRef: PencilFileRef = {
			session: {
				id: "session:demo",
				project: { root: "/tmp/pencil" },
			},
			path: "canvas.pen",
		};

		const document = parsePenDocument({ version: 1, children: [] });
		const hostAdapter: PencilHostAdapter = {
			getDocumentStore: () => null,
		};

		expect(fileRef.path).toBe("canvas.pen");
		expect(document).toEqual({ version: 1, children: [] });
		expect(hostAdapter.getDocumentStore()).toBeNull();
	});
});
