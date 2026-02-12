import { describe, expect, it, vi } from "vitest";

import type { ArtifactService } from "../../../agent/artifact-service";
import { createChatTools } from "../../../chat/chat-tools";

type ExecutableTool<TInput, TOutput> = {
	execute: (input: TInput) => Promise<TOutput>;
};

type ReadSkillInput = {
	skillId: string;
};

type ReadSkillOutput =
	| {
			ok: true;
			id: string;
			name: string;
			content: string;
	  }
	| {
			ok: false;
			error: string;
	  };

const GAME_ID = "test-game-id";

function createArtifactServiceMock() {
	return {
		listWorkspaceFileMeta: vi.fn<ArtifactService["listWorkspaceFileMeta"]>(),
		readWorkspaceFiles: vi.fn<ArtifactService["readWorkspaceFiles"]>(),
	} as unknown as ArtifactService;
}

describe("readSkill tool", () => {
	it("returns skill content for valid skill id", async () => {
		const artifactService = createArtifactServiceMock();
		const tools = createChatTools({ gameId: GAME_ID, artifactService });
		const readSkillTool = tools.readSkill as unknown as ExecutableTool<
			ReadSkillInput,
			ReadSkillOutput
		>;

		const result = await readSkillTool.execute({ skillId: "game-design" });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.id).toBe("game-design");
			expect(result.name).toBe("Game Design");
			expect(result.content).toContain("expert game designer");
		}
	});

	it("returns skill content for sprite-art skill", async () => {
		const artifactService = createArtifactServiceMock();
		const tools = createChatTools({ gameId: GAME_ID, artifactService });
		const readSkillTool = tools.readSkill as unknown as ExecutableTool<
			ReadSkillInput,
			ReadSkillOutput
		>;

		const result = await readSkillTool.execute({ skillId: "sprite-art" });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.id).toBe("sprite-art");
			expect(result.name).toBe("Sprite Art & Visual Design");
			expect(result.content).toContain("2D game art");
		}
	});

	it("returns skill content for scripting skill", async () => {
		const artifactService = createArtifactServiceMock();
		const tools = createChatTools({ gameId: GAME_ID, artifactService });
		const readSkillTool = tools.readSkill as unknown as ExecutableTool<
			ReadSkillInput,
			ReadSkillOutput
		>;

		const result = await readSkillTool.execute({ skillId: "scripting" });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.id).toBe("scripting");
			expect(result.name).toBe("Custom Scripting");
			expect(result.content).toContain("QuickJS sandbox");
		}
	});

	it("returns error for unknown skill id", async () => {
		const artifactService = createArtifactServiceMock();
		const tools = createChatTools({ gameId: GAME_ID, artifactService });
		const readSkillTool = tools.readSkill as unknown as ExecutableTool<
			ReadSkillInput,
			ReadSkillOutput
		>;

		const result = await readSkillTool.execute({ skillId: "nonexistent" });

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe("Unknown skill: nonexistent");
		}
	});

	it("returns error for empty skill id", async () => {
		const artifactService = createArtifactServiceMock();
		const tools = createChatTools({ gameId: GAME_ID, artifactService });
		const readSkillTool = tools.readSkill as unknown as ExecutableTool<
			ReadSkillInput,
			ReadSkillOutput
		>;

		const result = await readSkillTool.execute({ skillId: "" });

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe("Unknown skill: ");
		}
	});
});
