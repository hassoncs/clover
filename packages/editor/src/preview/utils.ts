import { resolveAssetUrl } from "../config/env";

export type BinaryFileType = "audio" | "image" | "unknown";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".webm", ".m4a"];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

export function isBinaryFile(filename: string): boolean {
	return getFileType(filename) !== "unknown";
}

export function getFileType(filename: string): BinaryFileType {
	const lowerName = filename.toLowerCase();

	if (AUDIO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
		return "audio";
	}

	if (IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
		return "image";
	}

	return "unknown";
}

export function getAssetUrl(filename: string): string {
	if (filename.startsWith("http")) {
		return filename;
	}

	let path = filename;
	if (!path.startsWith("/")) {
		path = "/" + path;
	}

	return resolveAssetUrl(path) || filename;
}
