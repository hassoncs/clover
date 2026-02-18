import type { Session, User } from "@supabase/supabase-js";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	DEV_USER_ID,
	isDevAuthenticated,
	loadDevAuthState,
	setDevAuthenticated,
} from "@/lib/auth/token";
import {
	signOut as authSignOut,
	getSession,
	sendMagicLink,
	signInWithGoogle,
} from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
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
	signInAsDev: () => Promise<void>;
	signOut: () => Promise<void>;
	refreshSession: () => Promise<void>;
}

const DEV_USER_STUB = {
	id: DEV_USER_ID,
	email: "dev@localhost",
	app_metadata: {},
	user_metadata: { full_name: "Dev" },
	aud: "authenticated",
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
	const authInitializedRef = useRef(false);

	const setAuthenticatedUser = useCallback(
		(user: User, session: Session | null) => {
			setState({ user, session, isLoading: false, isAuthenticated: true });
			if (user.id !== lastSyncedUserIdRef.current) {
				lastSyncedUserIdRef.current = user.id;
				syncUserToDatabase();
			}
		},
		[],
	);

	const setUnauthenticated = useCallback(() => {
		setState({
			user: null,
			session: null,
			isLoading: false,
			isAuthenticated: false,
		});
		lastSyncedUserIdRef.current = null;
	}, []);

	const refreshSession = useCallback(async () => {
		try {
			const session = await getSession();
			if (session?.user) {
				setAuthenticatedUser(session.user, session);
				return;
			}
		} catch {}

		const wasDevAuth = await loadDevAuthState();
		if (wasDevAuth) {
			setAuthenticatedUser(DEV_USER_STUB, null);
			return;
		}

		setUnauthenticated();
	}, [setAuthenticatedUser, setUnauthenticated]);

	useEffect(() => {
		let subscription: { unsubscribe: () => void } | undefined;

		async function init() {
			await refreshSession();
			authInitializedRef.current = true;

			if (!supabase) return;

			const { data } = supabase.auth.onAuthStateChange((_event, session) => {
				const user = session?.user ?? null;
				if (user) {
					void setDevAuthenticated(false);
					setAuthenticatedUser(user, session);
				} else if (authInitializedRef.current && !isDevAuthenticated()) {
					setUnauthenticated();
				}
			});
			subscription = data.subscription;
		}

		init();

		return () => {
			subscription?.unsubscribe();
		};
	}, [refreshSession, setAuthenticatedUser, setUnauthenticated]);

	const signInAsDev = useCallback(async () => {
		if (!__DEV__) return;
		await setDevAuthenticated(true);
		setAuthenticatedUser(DEV_USER_STUB, null);
	}, [setAuthenticatedUser]);

	const handleSignOut = useCallback(async () => {
		setDevAuthenticated(false);
		await authSignOut();
		setUnauthenticated();
	}, [setUnauthenticated]);

	const value: AuthContextValue = {
		...state,
		signInWithGoogle,
		sendMagicLink,
		signInAsDev,
		signOut: handleSignOut,
		refreshSession,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
