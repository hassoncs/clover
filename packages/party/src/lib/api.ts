import { getPartyRuntimeConfig } from "../config";

interface CreateRoomResponse {
	code: string;
	hostToken: string;
	hostId: string;
}

export async function createPartyRoom(
	template: string,
	minPlayers = 3,
): Promise<CreateRoomResponse> {
	const response = await fetch(`${getPartyRuntimeConfig().apiUrl}/api/party/create`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-brand-id": "amen",
		},
		body: JSON.stringify({ template, minPlayers }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to create room: ${text}`);
	}

	return response.json() as Promise<CreateRoomResponse>;
}
