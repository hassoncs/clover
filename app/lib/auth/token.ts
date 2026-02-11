import { supabase } from '@/lib/supabase/client';

export const DEV_AUTH_TOKEN = 'dev-token';
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

let _devAuthenticated = false;

export function setDevAuthenticated(value: boolean): void {
  _devAuthenticated = value;
}

export function isDevAuthenticated(): boolean {
  return __DEV__ && _devAuthenticated;
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
