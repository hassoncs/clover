import { useState, useEffect, useCallback, useRef } from "react";
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

interface UseAuthReturn extends AuthState {
  signInWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

async function syncUserToDatabase(): Promise<void> {
  try {
    await trpc.users.syncFromAuth.mutate();
  } catch (error) {
    console.warn("[Auth] Failed to sync user to database:", error);
  }
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const lastSyncedUserIdRef = useRef<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getSession();
      const user = session?.user ?? null;
      
      setState({
        user,
        session,
        isLoading: false,
        isAuthenticated: !!user,
      });

      if (user && user.id !== lastSyncedUserIdRef.current) {
        lastSyncedUserIdRef.current = user.id;
        syncUserToDatabase();
      }
    } catch {
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshSession();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      
      setState({
        user,
        session,
        isLoading: false,
        isAuthenticated: !!user,
      });

      if (user && user.id !== lastSyncedUserIdRef.current) {
        lastSyncedUserIdRef.current = user.id;
        syncUserToDatabase();
      } else if (!user) {
        lastSyncedUserIdRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  return {
    ...state,
    signInWithGoogle,
    sendMagicLink,
    signOut: handleSignOut,
    refreshSession,
  };
}
