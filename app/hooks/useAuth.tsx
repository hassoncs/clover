import { useState, useEffect, useCallback, useRef, useContext, createContext, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  signInWithGoogle,
  sendMagicLink,
  signOut as authSignOut,
  getSession,
} from "@/lib/supabase/auth";
import { trpc } from "@/lib/trpc/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const DEV_USER_STUB = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@localhost',
  app_metadata: {},
  user_metadata: { full_name: 'Dev User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncUserToDatabase(): Promise<void> {
  try {
    await trpc.users.syncFromAuth.mutate();
  } catch (error) {
    console.warn("[Auth] Failed to sync user to database:", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const lastSyncedUserIdRef = useRef<string | null>(null);

  const setAuthenticatedUser = useCallback((user: User, session: Session | null) => {
    setState({ user, session, isLoading: false, isAuthenticated: true });
    if (user.id !== lastSyncedUserIdRef.current) {
      lastSyncedUserIdRef.current = user.id;
      syncUserToDatabase();
    }
  }, []);

  const setUnauthenticated = useCallback(() => {
    setState({ user: null, session: null, isLoading: false, isAuthenticated: false });
    lastSyncedUserIdRef.current = null;
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getSession();
      if (session?.user) {
        setAuthenticatedUser(session.user, session);
        return;
      }
    } catch { }

    if (__DEV__) {
      setAuthenticatedUser(DEV_USER_STUB, null);
      return;
    }

    setUnauthenticated();
  }, [setAuthenticatedUser, setUnauthenticated]);

  useEffect(() => {
    refreshSession();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (!user && __DEV__) return;
      if (user) {
        setAuthenticatedUser(user, session);
      } else {
        setUnauthenticated();
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [refreshSession, setAuthenticatedUser, setUnauthenticated]);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    setUnauthenticated();
  }, [setUnauthenticated]);

  const value: AuthContextValue = {
    ...state,
    signInWithGoogle,
    sendMagicLink,
    signOut: handleSignOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
