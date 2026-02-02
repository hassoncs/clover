import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameDefinition, LevelDefinition } from '@slopcade/shared';
import baseGame from './game';
import { generateAngryBurnsLevel } from '@slopcade/shared';
import { removeFromFavorites } from './favoritesStorage';

const PACK_ID = 'angry-burns-endless';

interface AngryBurnsGameState {
  difficulty01: number;
  seed: string;
  levelIndex: number;
  currentLevel: LevelDefinition | null;
  gameDefinition: GameDefinition | null;
  isLoading: boolean;
  runtimeKey: number;
  godotReady: boolean;
  loadingDismissed: boolean;
}

interface UseAngryBurnsGameReturn extends AngryBurnsGameState {
  setDifficulty01: React.Dispatch<React.SetStateAction<number>>;
  setSeed: React.Dispatch<React.SetStateAction<string>>;
  setLevelIndex: React.Dispatch<React.SetStateAction<number>>;
  generateNewLevel: () => void;
  loadFavoriteLevel: (level: LevelDefinition) => void;
  removeFavorite: (levelId: string) => Promise<boolean>;
  handleReset: () => void;
  handleGodotReady: () => void;
}

export function useAngryBurnsGame(): UseAngryBurnsGameReturn {
  const [difficulty01, setDifficulty01] = useState(0.5);
  const [seed, setSeed] = useState('start');
  const [levelIndex, setLevelIndex] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<LevelDefinition | null>(null);
  const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [runtimeKey, setRuntimeKey] = useState(0);
  const [godotReady, setGodotReady] = useState(false);
  const [loadingDismissed, setLoadingDismissed] = useState(false);

  const loadingOpacity = useRef<number>(1);

  const mergeLevelWithGame = useCallback(
    (level: LevelDefinition): GameDefinition => {
      const angryBurnsOverrides = level.overrides?.angryBurns;

      if (!angryBurnsOverrides) {
        return baseGame;
      }

      return {
        ...baseGame,
        metadata: {
          ...baseGame.metadata,
          title: level.title ?? baseGame.metadata.title,
          description: level.description ?? baseGame.metadata.description,
        },
        entities: [
          ...baseGame.entities.filter(
            (e) => e.id !== 'ground' && e.id !== 'wall-right' && e.id !== 'cannon'
          ),
          ...(angryBurnsOverrides.entities ?? []),
        ],
        variables: {
          ...baseGame.variables,
          lives: level.difficulty?.lives ?? baseGame.variables?.lives ?? 3,
        },
      };
    },
    []
  );

  const generateNewLevel = useCallback(() => {
    setIsLoading(true);
    try {
      const level = generateAngryBurnsLevel({
        seed: seed,
        packId: PACK_ID,
        levelId: `level-${levelIndex}`,
        difficulty01: difficulty01,
        levelIndex: levelIndex,
      });
      setCurrentLevel(level);
      const mergedGame = mergeLevelWithGame(level);
      setGameDefinition(mergedGame);
    } catch (error) {
      console.error('Failed to generate level:', error);
    } finally {
      setIsLoading(false);
    }
  }, [difficulty01, seed, levelIndex, mergeLevelWithGame]);

  const loadFavoriteLevel = useCallback(
    (level: LevelDefinition) => {
      setIsLoading(true);
      try {
        setCurrentLevel(level);
        const mergedGame = mergeLevelWithGame(level);
        setGameDefinition(mergedGame);

        // Extract seed and difficulty from the favorite level
        if (level.seed) {
          setSeed(level.seed);
        }
        const generatorParams = level.generatorParams as Record<string, unknown> | undefined;
        if (generatorParams?.difficulty01 !== undefined) {
          setDifficulty01(generatorParams.difficulty01 as number);
        }
        setLevelIndex(0);
      } catch (error) {
        console.error('Failed to load favorite level:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [mergeLevelWithGame]
  );

  const removeFavorite = useCallback(async (levelId: string): Promise<boolean> => {
    try {
      const success = await removeFromFavorites(levelId);
      return success;
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return false;
    }
  }, []);

  const handleReset = useCallback(() => {
    setGodotReady(false);
    setLoadingDismissed(false);
    loadingOpacity.current = 1;
    setRuntimeKey((k) => k + 1);
  }, []);

  const handleGodotReady = useCallback(() => {
    setGodotReady(true);
    loadingOpacity.current = 0;
    setLoadingDismissed(true);
  }, []);

  // Generate initial level on mount
  useEffect(() => {
    generateNewLevel();
  }, [generateNewLevel]);

  return {
    difficulty01,
    seed,
    levelIndex,
    currentLevel,
    gameDefinition,
    isLoading,
    runtimeKey,
    godotReady,
    loadingDismissed,
    setDifficulty01,
    setSeed,
    setLevelIndex,
    generateNewLevel,
    loadFavoriteLevel,
    removeFavorite,
    handleReset,
    handleGodotReady,
  };
}
