import type { Session, User } from "@supabase/supabase-js";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { supabase } from "./supabase";

const DEV_BYPASS_KEY = "admin_dev_bypass";
const DEV_EMAIL = "hassoncs@gmail.com";

export function setDevBypass(active: boolean) {
	if (active) localStorage.setItem(DEV_BYPASS_KEY, "1");
	else localStorage.removeItem(DEV_BYPASS_KEY);
}

export function isDevBypassActive() {
	return import.meta.env.DEV && localStorage.getItem(DEV_BYPASS_KEY) === "1";
}

type AuthState = {
	user: User | null;
	session: Session | null;
	isLoading: boolean;
};

const AuthContext = createContext<AuthState>({
	user: null,
	session: null,
	isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<AuthState>({
		user: null,
		session: null,
		isLoading: true,
	});

	useEffect(() => {
		if (isDevBypassActive()) {
			setState({
				user: { email: DEV_EMAIL } as User,
				session: null,
				isLoading: false,
			});
			return;
		}

		supabase.auth.getSession().then(({ data }) => {
			setState({
				user: data.session?.user ?? null,
				session: data.session,
				isLoading: false,
			});
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setState({ user: session?.user ?? null, session, isLoading: false });
		});

		return () => subscription.unsubscribe();
	}, []);

	return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	return useContext(AuthContext);
}

export async function getAuthToken(): Promise<string | null> {
	if (isDevBypassActive()) return "dev-token";
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? null;
}
