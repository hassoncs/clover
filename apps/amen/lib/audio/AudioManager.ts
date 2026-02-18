import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export type SoundType = "sfx" | "music";

export interface SoundConfig {
	url: string;
	type: SoundType;
	loop?: boolean;
	defaultVolume?: number;
}

export interface AudioManagerConfig {
	maxCacheSize?: number;
	sfxVolume?: number;
	musicVolume?: number;
	masterVolume?: number;
}

interface CachedSound {
	url: string;
	localPath?: string;
	type: SoundType;
	loop: boolean;
	volume: number;
	lastAccess: number;
}

interface WebAudioElement {
	audio: HTMLAudioElement;
	type: SoundType;
}

const DEFAULT_MAX_CACHE_SIZE = 50;
const CROSSFADE_DURATION_MS = 500;
const CROSSFADE_STEP_MS = 16;

function hashUrl(url: string): string {
	let hash = 0;
	for (let i = 0; i < url.length; i++) {
		hash = (hash << 5) - hash + url.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash).toString(36);
}

class AudioManagerClass {
	private cache = new Map<string, CachedSound>();
	private webAudioElements = new Map<string, WebAudioElement>();
	private currentMusic: string | null = null;
	private config: Required<AudioManagerConfig>;
	private muted = false;
	private fadeTimer: ReturnType<typeof setInterval> | null = null;

	constructor(config: AudioManagerConfig = {}) {
		this.config = {
			maxCacheSize: config.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE,
			sfxVolume: config.sfxVolume ?? 1.0,
			musicVolume: config.musicVolume ?? 0.7,
			masterVolume: config.masterVolume ?? 1.0,
		};
	}

	async preload(soundId: string, config: SoundConfig): Promise<boolean> {
		if (this.cache.has(soundId)) {
			return true;
		}

		try {
			let localPath: string | undefined;

			if (Platform.OS !== "web") {
				const filename = `audio_${hashUrl(config.url)}.cache`;
				localPath = `${FileSystem.cacheDirectory}${filename}`;

				const info = await FileSystem.getInfoAsync(localPath);
				if (!info.exists) {
					const result = await FileSystem.downloadAsync(config.url, localPath);
					if (result.status !== 200) {
						console.warn(
							`[AudioManager] Failed to download sound: ${config.url}`,
						);
						return false;
					}
				}
			} else {
				await this.preloadWebAudio(soundId, config);
			}

			this.cache.set(soundId, {
				url: config.url,
				localPath,
				type: config.type,
				loop: config.loop ?? false,
				volume: config.defaultVolume ?? 1.0,
				lastAccess: Date.now(),
			});

			this.evictOldEntries();
			return true;
		} catch (error) {
			console.warn(`[AudioManager] Preload failed for ${soundId}:`, error);
			return false;
		}
	}

	private async preloadWebAudio(
		soundId: string,
		config: SoundConfig,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const audio = new Audio();
			audio.preload = "auto";
			audio.loop = config.loop ?? false;
			audio.volume = this.getEffectiveVolume(
				config.type,
				config.defaultVolume ?? 1.0,
			);

			audio.oncanplaythrough = () => {
				this.webAudioElements.set(soundId, { audio, type: config.type });
				resolve();
			};

			audio.onerror = () => {
				reject(new Error(`Failed to load web audio: ${config.url}`));
			};

			audio.src = config.url;
			audio.load();
		});
	}

	async preloadAll(sounds: Record<string, SoundConfig>): Promise<{
		loaded: string[];
		failed: string[];
	}> {
		const loaded: string[] = [];
		const failed: string[] = [];

		const entries = Object.entries(sounds);

		for (const [soundId, config] of entries) {
			const success = await this.preload(soundId, config);
			if (success) {
				loaded.push(soundId);
			} else {
				failed.push(soundId);
			}
		}

		return { loaded, failed };
	}

	async playSfx(soundId: string, volume?: number): Promise<void> {
		if (this.muted) return;

		const cached = this.cache.get(soundId);
		if (!cached) {
			console.warn(`[AudioManager] Sound not preloaded: ${soundId}`);
			return;
		}

		cached.lastAccess = Date.now();
		const effectiveVolume = this.getEffectiveVolume(
			"sfx",
			volume ?? cached.volume,
		);

		if (Platform.OS === "web") {
			const webAudio = this.webAudioElements.get(soundId);
			if (webAudio) {
				const clone = webAudio.audio.cloneNode() as HTMLAudioElement;
				clone.volume = effectiveVolume;
				clone.play().catch(() => {});
			}
		}
	}

	async playMusic(soundId: string, volume?: number): Promise<void> {
		if (this.currentMusic === soundId) return;

		await this.stopMusic();

		const cached = this.cache.get(soundId);
		if (!cached) {
			console.warn(`[AudioManager] Music not preloaded: ${soundId}`);
			return;
		}

		this.currentMusic = soundId;
		cached.lastAccess = Date.now();
		const effectiveVolume = this.getEffectiveVolume(
			"music",
			volume ?? cached.volume,
		);

		if (Platform.OS === "web") {
			const webAudio = this.webAudioElements.get(soundId);
			if (webAudio) {
				webAudio.audio.volume = effectiveVolume;
				webAudio.audio.loop = cached.loop;
				webAudio.audio.currentTime = 0;
				webAudio.audio.play().catch(() => {});
			}
		}
	}

	async crossfadeTo(soundId: string, volume?: number): Promise<void> {
		if (this.currentMusic === soundId) return;

		this.clearFadeTimer();

		const cached = this.cache.get(soundId);
		if (!cached) {
			console.warn(`[AudioManager] Music not preloaded: ${soundId}`);
			return;
		}

		const targetVolume = this.getEffectiveVolume(
			"music",
			volume ?? cached.volume,
		);

		if (Platform.OS === "web") {
			const outgoing = this.currentMusic
				? this.webAudioElements.get(this.currentMusic)
				: null;
			const incoming = this.webAudioElements.get(soundId);

			if (!incoming) {
				console.warn(`[AudioManager] No web audio element for: ${soundId}`);
				return;
			}

			const outgoingStartVolume = outgoing?.audio.volume ?? 0;
			incoming.audio.volume = 0;
			incoming.audio.loop = cached.loop;
			incoming.audio.currentTime = 0;
			incoming.audio.play().catch(() => {});

			const previousMusic = this.currentMusic;
			this.currentMusic = soundId;

			const steps = Math.max(
				1,
				Math.round(CROSSFADE_DURATION_MS / CROSSFADE_STEP_MS),
			);
			let step = 0;

			this.fadeTimer = setInterval(() => {
				step++;
				const progress = Math.min(1, step / steps);

				if (outgoing) {
					outgoing.audio.volume = outgoingStartVolume * (1 - progress);
				}
				incoming.audio.volume = targetVolume * progress;

				if (progress >= 1) {
					this.clearFadeTimer();
					if (outgoing && previousMusic) {
						outgoing.audio.pause();
						outgoing.audio.currentTime = 0;
					}
				}
			}, CROSSFADE_STEP_MS);
		} else {
			await this.stopMusic();
			await this.playMusic(soundId, volume);
		}
	}

	async fadeOut(durationMs: number = CROSSFADE_DURATION_MS): Promise<void> {
		if (!this.currentMusic) return;
		this.clearFadeTimer();

		if (Platform.OS === "web") {
			const webAudio = this.webAudioElements.get(this.currentMusic);
			if (!webAudio) {
				this.currentMusic = null;
				return;
			}

			const startVolume = webAudio.audio.volume;
			const musicId = this.currentMusic;
			const steps = Math.max(1, Math.round(durationMs / CROSSFADE_STEP_MS));
			let step = 0;

			return new Promise((resolve) => {
				this.fadeTimer = setInterval(() => {
					step++;
					const progress = Math.min(1, step / steps);
					webAudio.audio.volume = startVolume * (1 - progress);

					if (progress >= 1) {
						this.clearFadeTimer();
						webAudio.audio.pause();
						webAudio.audio.currentTime = 0;
						if (this.currentMusic === musicId) {
							this.currentMusic = null;
						}
						resolve();
					}
				}, CROSSFADE_STEP_MS);
			});
		} else {
			await this.stopMusic();
		}
	}

	async stopMusic(): Promise<void> {
		if (!this.currentMusic) return;
		this.clearFadeTimer();

		if (Platform.OS === "web") {
			const webAudio = this.webAudioElements.get(this.currentMusic);
			if (webAudio) {
				webAudio.audio.pause();
				webAudio.audio.currentTime = 0;
			}
		}

		this.currentMusic = null;
	}

	private clearFadeTimer(): void {
		if (this.fadeTimer) {
			clearInterval(this.fadeTimer);
			this.fadeTimer = null;
		}
	}

	getCurrentMusic(): string | null {
		return this.currentMusic;
	}

	setVolume(channel: "sfx" | "music" | "master", volume: number): void {
		const clampedVolume = Math.max(0, Math.min(1, volume));

		switch (channel) {
			case "sfx":
				this.config.sfxVolume = clampedVolume;
				break;
			case "music":
				this.config.musicVolume = clampedVolume;
				this.updateMusicVolume();
				break;
			case "master":
				this.config.masterVolume = clampedVolume;
				this.updateMusicVolume();
				break;
		}
	}

	getVolume(channel: "sfx" | "music" | "master"): number {
		switch (channel) {
			case "sfx":
				return this.config.sfxVolume;
			case "music":
				return this.config.musicVolume;
			case "master":
				return this.config.masterVolume;
		}
	}

	mute(): void {
		this.muted = true;
		this.updateMusicVolume();
	}

	unmute(): void {
		this.muted = false;
		this.updateMusicVolume();
	}

	isMuted(): boolean {
		return this.muted;
	}

	private getEffectiveVolume(type: SoundType, baseVolume: number): number {
		if (this.muted) return 0;
		const channelVolume =
			type === "sfx" ? this.config.sfxVolume : this.config.musicVolume;
		return baseVolume * channelVolume * this.config.masterVolume;
	}

	private updateMusicVolume(): void {
		if (!this.currentMusic) return;

		const cached = this.cache.get(this.currentMusic);
		if (!cached) return;

		const effectiveVolume = this.getEffectiveVolume("music", cached.volume);

		if (Platform.OS === "web") {
			const webAudio = this.webAudioElements.get(this.currentMusic);
			if (webAudio) {
				webAudio.audio.volume = effectiveVolume;
			}
		}
	}

	private evictOldEntries(): void {
		if (this.cache.size <= this.config.maxCacheSize) return;

		const entries = Array.from(this.cache.entries()).sort(
			(a, b) => a[1].lastAccess - b[1].lastAccess,
		);

		const toRemove = entries.slice(
			0,
			this.cache.size - this.config.maxCacheSize,
		);
		for (const [soundId] of toRemove) {
			if (soundId !== this.currentMusic) {
				this.cache.delete(soundId);
				this.webAudioElements.delete(soundId);
			}
		}
	}

	unload(soundId: string): void {
		if (soundId === this.currentMusic) {
			this.stopMusic();
		}
		this.cache.delete(soundId);
		this.webAudioElements.delete(soundId);
	}

	unloadAll(): void {
		this.stopMusic();
		this.cache.clear();
		this.webAudioElements.clear();
	}

	isPreloaded(soundId: string): boolean {
		return this.cache.has(soundId);
	}

	getPreloadedCount(): number {
		return this.cache.size;
	}
}

let instance: AudioManagerClass | null = null;

export function getAudioManager(
	config?: AudioManagerConfig,
): AudioManagerClass {
	if (!instance) {
		instance = new AudioManagerClass(config);
	}
	return instance;
}

export function resetAudioManager(): void {
	if (instance) {
		instance.unloadAll();
		instance = null;
	}
}

export type { AudioManagerClass as AudioManager };
