import {
	configureGameRuntime,
	type GameRuntimeConfig,
} from "@slopcade/game-runtime";
import { hasTunables, TuningPanel } from "@/components/game";
import { DevToolbar } from "@/components/game/DevToolbar";
import { GameDialog } from "@/components/game/GameDialog";
import { getAuthToken } from "@/lib/auth/token";
import { env } from "@/lib/config/env";
import { getStorageItem, setStorageItem } from "@/lib/utils/storage";

const config: GameRuntimeConfig = {
	apiUrl: env.apiUrl,
	getAuthToken,
	getStorageItem,
	setStorageItem,
	DevToolbar,
	GameDialog,
	TuningPanel,
	hasTunables,
};

configureGameRuntime(config);
