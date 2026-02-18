import { getSupabase } from "./client";

const REDIRECT_URL_WEB =
  typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";

function getRedirectUrl(): string {
  return REDIRECT_URL_WEB;
}

export async function sendMagicLink(email: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  });

  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getRedirectUrl(),
      queryParams: {
        prompt: "consent",
        access_type: "offline",
      },
    },
  });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function handleNativeAuthCallback(_url: string): Promise<boolean> {
  return false;
}
