import { getAuthToken } from "@/lib/auth/token";
import { activeBrand } from "@/lib/brand";

export async function getTrpcHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		"x-brand-id": activeBrand.id,
	};

	const token = await getAuthToken();
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	return headers;
}
