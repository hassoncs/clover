export function isLoaded() {
	return true;
}

export function isLoading() {
	return false;
}

export async function loadAsync() {
	return;
}

export function processFontFamily(fontFamily) {
	return fontFamily;
}

export default {
	isLoaded,
	isLoading,
	loadAsync,
	processFontFamily,
};
