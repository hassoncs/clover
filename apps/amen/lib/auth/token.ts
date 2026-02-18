import { Platform } from "react-native";
import { supabase } from "@/lib/supabase/client";
import { getStorageItem, setStorageItem } from "@/lib/utils/storage";

export const DEV_AUTH_TOKEN = "dev-token";
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

const DEV_AUTH_STORAGE_KEY = "dev_authenticated";

let _devAuthenticated = false;

export async function setDevAuthenticated(value: boolean): Promise<void> {
	_devAuthenticated = value;
	if (__DEV__) {
		await setStorageItem(DEV_AUTH_STORAGE_KEY, value);
	}
}

export function isDevAuthenticated(): boolean {
	return __DEV__ && _devAuthenticated;
}

export async function loadDevAuthState(): Promise<boolean> {
	if (!__DEV__) return false;
	_devAuthenticated = await getStorageItem(DEV_AUTH_STORAGE_KEY, false);
	if (!_devAuthenticated && Platform.OS === "web") {
		_devAuthenticated = true;
		await setStorageItem(DEV_AUTH_STORAGE_KEY, true);
	}
	return _devAuthenticated;
}

export async function getAuthToken(): Promise<string | null> {
	if (supabase) {
		try {
			const { data } = await supabase.auth.getSession();
			if (data.session?.access_token) return data.session.access_token;
		} catch {}
	}

	if (isDevAuthenticated()) return DEV_AUTH_TOKEN;

	// After HMR the module-level _devAuthenticated resets to false before
	// AuthProvider has a chance to call loadDevAuthState(). Recover by
	// reading from persistent storage before giving up.
	if (__DEV__) {
		const restored = await loadDevAuthState();
		if (restored) return DEV_AUTH_TOKEN;
	}

	return null;
}
