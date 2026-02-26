export const useAudioPlayer = () => ({
	play: () => {},
	pause: () => {},
	stop: () => {},
	seek: () => {},
	remove: () => {},
	currentTime: 0,
	duration: 0,
	playing: false,
	muted: false,
	volume: 1,
	loop: false,
	isLoaded: false,
});

export const useAudioPlayerStatus = () => ({
	isLoaded: false,
	isPlaying: false,
	currentTime: 0,
	duration: 0,
	didJustFinish: false,
	error: null,
});

export const createAudioPlayer = () => ({
	play: () => {},
	pause: () => {},
	stop: () => {},
	remove: () => {},
});

export default { useAudioPlayer, useAudioPlayerStatus, createAudioPlayer };
