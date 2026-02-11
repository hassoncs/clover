import { supabase } from '@/lib/supabase/client';
import { getStorageItem, setStorageItem } from '@/lib/utils/storage';

export const DEV_AUTH_TOKEN = 'dev-token';
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

const DEV_AUTH_STORAGE_KEY = 'dev_authenticated';

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

  return null;
}
