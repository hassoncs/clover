import { getAuthToken } from "@/lib/auth/token";

export async function getTrpcHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		"x-brand-id": "slopbox",
	};

	const token = await getAuthToken();
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	return headers;
}
