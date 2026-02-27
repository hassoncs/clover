import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("react-native", () => ({
	Platform: { OS: "web" },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
	},
}));

const { mockGetStorageItem, mockSetStorageItem } = vi.hoisted(() => ({
	mockGetStorageItem: vi.fn(),
	mockSetStorageItem: vi.fn(),
}));

vi.mock("../../contexts/GameRuntimeConfig", () => ({
	getGameRuntimeConfig: () => ({
		getStorageItem: mockGetStorageItem,
		setStorageItem: mockSetStorageItem,
	}),
}));

import { GameProgressManager } from "../GameProgressManager";

describe("GameProgressManager", () => {
	const testSchema = z.object({
		version: z.number(),
		currentLevel: z.number(),
		highScore: z.number(),
		lastPlayedAt: z.number().optional(),
	});

	type TestProgress = z.infer<typeof testSchema>;

	const defaultProgress: TestProgress = {
		version: 1,
		currentLevel: 1,
		highScore: 0,
	};

	let manager: GameProgressManager<TestProgress>;

	beforeEach(() => {
		vi.clearAllMocks();

		manager = new GameProgressManager({
			gameId: "test-game",
			config: {
				version: 1,
				schema: testSchema,
				defaultProgress,
				storageKey: "test-game-progress",
			},
		});
	});

	describe("loadProgress", () => {
		it("should return defaults when no data exists", async () => {
			mockGetStorageItem.mockResolvedValue(null);

			const result = await manager.loadProgress();

			expect(result.success).toBe(true);
			expect(result.data).toEqual(defaultProgress);
			expect(result.migrated).toBe(false);
			expect(mockGetStorageItem).toHaveBeenCalledWith(
				"test-game-progress",
				null,
			);
		});

		it("should load and validate stored progress", async () => {
			const storedProgress: TestProgress = {
				version: 1,
				currentLevel: 5,
				highScore: 1000,
				lastPlayedAt: Date.now(),
			};
			mockGetStorageItem.mockResolvedValue(storedProgress);

			const result = await manager.loadProgress();

			expect(result.success).toBe(true);
			expect(result.data).toEqual(storedProgress);
			expect(result.migrated).toBe(false);
		});

		it("should reset to defaults when data is corrupted", async () => {
			const corruptedData = {
				version: 1,
				currentLevel: "invalid", // Should be number
				highScore: "also-invalid",
			};
			mockGetStorageItem.mockResolvedValue(corruptedData);

			const result = await manager.loadProgress();

			expect(result.success).toBe(false);
			expect(result.data).toEqual(defaultProgress);
			expect(result.errors).toBeDefined();
			expect(result.errors!.length).toBeGreaterThan(0);
		});

		it("should handle storage errors gracefully", async () => {
			mockGetStorageItem.mockRejectedValue(new Error("Storage unavailable"));

			const result = await manager.loadProgress();

			expect(result.success).toBe(false);
			expect(result.data).toEqual(defaultProgress);
			expect(result.errors).toContain("Storage unavailable");
		});

		it("should migrate old schema versions", async () => {
			const oldProgress = {
				version: 0,
				currentLevel: 3,
				highScore: 500,
			};
			mockGetStorageItem.mockResolvedValue(oldProgress);

			const result = await manager.loadProgress();

			expect(result.success).toBe(true);
			expect(result.migrated).toBe(true);
			expect(result.data.version).toBe(1);
		});
	});

	describe("saveProgress", () => {
		beforeEach(async () => {
			mockGetStorageItem.mockResolvedValue(null);
			await manager.loadProgress();
		});

		it("should persist progress to storage", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);

			const success = await manager.saveProgress({
				currentLevel: 10,
				highScore: 5000,
			});

			expect(success).toBe(true);
			expect(mockSetStorageItem).toHaveBeenCalledWith(
				"test-game-progress",
				expect.objectContaining({
					version: 1,
					currentLevel: 10,
					highScore: 5000,
					lastPlayedAt: expect.any(Number),
				}),
			);
		});

		it("should update lastPlayedAt timestamp", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);
			const beforeSave = Date.now();

			await manager.saveProgress();

			const savedData = mockSetStorageItem.mock.calls[0][1] as TestProgress;
			expect(savedData.lastPlayedAt).toBeGreaterThanOrEqual(beforeSave);
		});

		it("should handle save errors", async () => {
			mockSetStorageItem.mockRejectedValue(new Error("Write failed"));

			const success = await manager.saveProgress();

			expect(success).toBe(false);
		});

		it("should merge partial updates with current progress", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);

			// Set initial progress
			manager.updateProgress({ currentLevel: 5, highScore: 1000 });

			// Save partial update
			await manager.saveProgress({ currentLevel: 6 });

			const savedData = mockSetStorageItem.mock.calls[0][1] as TestProgress;
			expect(savedData.currentLevel).toBe(6);
			expect(savedData.highScore).toBe(1000); // Should retain previous value
		});
	});

	describe("resetProgress", () => {
		it("should reset to default progress", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);

			manager.updateProgress({ currentLevel: 10, highScore: 5000 });
			await manager.resetProgress();

			const progress = manager.getProgress();
			expect(progress.currentLevel).toBe(1);
			expect(progress.highScore).toBe(0);
			expect(mockSetStorageItem).toHaveBeenCalled();
		});
	});

	describe("getProgress", () => {
		it("should return current progress synchronously", () => {
			const progress = manager.getProgress();

			expect(progress).toEqual(defaultProgress);
		});

		it("should return a copy to prevent mutations", () => {
			const progress1 = manager.getProgress();
			progress1.currentLevel = 999;

			const progress2 = manager.getProgress();
			expect(progress2.currentLevel).toBe(1); // Should still be default
		});
	});

	describe("updateProgress", () => {
		it("should update progress fields", () => {
			manager.updateProgress({ currentLevel: 5 });

			const progress = manager.getProgress();
			expect(progress.currentLevel).toBe(5);
		});

		it("should mark progress as dirty", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);

			manager.updateProgress({ currentLevel: 5 });
			manager.startAutoSave(100);

			// Wait for auto-save interval
			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(mockSetStorageItem).toHaveBeenCalled();
			manager.stopAutoSave();
		});
	});

	describe("auto-save", () => {
		it("should auto-save dirty progress at intervals", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);

			manager.startAutoSave(100);
			manager.updateProgress({ currentLevel: 5 });

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(mockSetStorageItem).toHaveBeenCalled();
			manager.stopAutoSave();
		});

		it("should not save if progress is not dirty", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);

			manager.startAutoSave(100);

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(mockSetStorageItem).not.toHaveBeenCalled();
			manager.stopAutoSave();
		});

		it("should stop auto-save when requested", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);

			manager.startAutoSave(100);
			manager.updateProgress({ currentLevel: 5 });
			manager.stopAutoSave();

			await new Promise((resolve) => setTimeout(resolve, 150));

			// Should not have saved after stopping
			expect(mockSetStorageItem).not.toHaveBeenCalled();
		});
	});

	describe("dispose", () => {
		it("should stop auto-save and save dirty progress", async () => {
			mockSetStorageItem.mockResolvedValue(undefined);

			manager.startAutoSave(1000);
			manager.updateProgress({ currentLevel: 5 });
			manager.dispose();

			expect(mockSetStorageItem).toHaveBeenCalled();
		});
	});
});
