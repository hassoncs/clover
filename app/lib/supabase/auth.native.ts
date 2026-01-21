import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { getSupabase } from "./client";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getWindowOrigin = () => {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }
  return "https://cloverapp.com";
};

const REDIRECT_URL_WEB = getWindowOrigin() + "/auth/callback";
const REDIRECT_URL_NATIVE = "clover://auth/callback";

function getRedirectUrl(): string {
  return Platform.OS === "web" ? REDIRECT_URL_WEB : REDIRECT_URL_NATIVE;
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

  if (Platform.OS === "web") {
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
  } else {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
        skipBrowserRedirect: true,
        queryParams: {
          prompt: "consent",
          access_type: "offline",
        },
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error("No OAuth URL returned");

    const result = await WebBrowser.openAuthSessionAsync(data.url, getRedirectUrl());

    if (result.type === "success" && result.url) {
      const url = new URL(result.url);
      const params = new URLSearchParams(url.hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) throw sessionError;
      } else {
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
      }
    } else if (result.type === "cancel") {
      throw new Error("Sign in was cancelled");
    }
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();

  if (Platform.OS !== "web") {
    try {
      await SecureStore.deleteItemAsync("supabase_session_key");
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter((k) => k.startsWith("supabase_session_data_"));
      if (sessionKeys.length > 0) {
        await AsyncStorage.multiRemove(sessionKeys);
      }
    } catch (error) {
      console.warn("Failed to clear native auth storage:", error);
    }
  }

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

export async function handleNativeAuthCallback(url: string): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === "auth" && parsedUrl.pathname === "/callback") {
      const supabase = getSupabase();

      const hashParams = new URLSearchParams(parsedUrl.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;
        return true;
      }

      const code = parsedUrl.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        return true;
      }

      const errorParam = parsedUrl.searchParams.get("error");
      if (errorParam) {
        const errorDescription = parsedUrl.searchParams.get("error_description");
        throw new Error(errorDescription || errorParam);
      }
    }
  } catch (error) {
    console.error("Failed to handle auth callback:", error);
    throw error;
  }

  return false;
}
