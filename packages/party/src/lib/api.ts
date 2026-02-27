interface CreateRoomResponse {
	code: string;
	hostToken: string;
	hostId: string;
}

export interface CreatePartyRoomOptions {
	template: string;
	minPlayers?: number;
	brandId: string;
	apiUrl: string;
}

export async function createPartyRoom(
	opts: CreatePartyRoomOptions,
): Promise<CreateRoomResponse> {
	const { template, minPlayers = 3, brandId, apiUrl } = opts;
	const response = await fetch(`${apiUrl}/api/party/create`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-brand-id": brandId,
		},
		body: JSON.stringify({ template, minPlayers }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to create room: ${text}`);
	}

	return response.json() as Promise<CreateRoomResponse>;
}
