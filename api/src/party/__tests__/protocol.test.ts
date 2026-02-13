import type {
	PartyMessage,
	PartyRoomState,
} from "@slopcade/shared/types/party";
import { describe, expect, it } from "vitest";
import {
	decodeMessage,
	encodeMessage,
	errorMessage,
	inputRequestMessage,
	inputResponseMessage,
	phaseChangeMessage,
	playerJoinedMessage,
	playerLeftMessage,
	playerReconnectMessage,
	stateUpdateMessage,
} from "../protocol";

function makeRoomState(overrides?: Partial<PartyRoomState>): PartyRoomState {
	return {
		phase: "lobby",
		players: [],
		hostId: "host-1",
		sharedData: {},
		currentRound: 0,
		...overrides,
	};
}

describe("protocol", () => {
	describe("encode/decode round-trip", () => {
		it("round-trips state_update message", () => {
			const state = makeRoomState({ phase: "playing" });
			const msg = stateUpdateMessage(state);
			const encoded = encodeMessage(msg);
			const decoded = decodeMessage(encoded);
			expect(decoded).toEqual(msg);
		});

		it("round-trips player_joined message", () => {
			const msg = playerJoinedMessage({
				id: "p1",
				name: "Alice",
				connected: true,
			});
			const encoded = encodeMessage(msg);
			const decoded = decodeMessage(encoded);
			expect(decoded).toEqual(msg);
		});

		it("round-trips player_left message", () => {
			const msg = playerLeftMessage("p1");
			const encoded = encodeMessage(msg);
			const decoded = decodeMessage(encoded);
			expect(decoded).toEqual(msg);
		});

		it("round-trips input_request message", () => {
			const msg = inputRequestMessage("req-1", {
				type: "choice",
				prompt: "Pick one",
				options: ["A", "B", "C"],
				timeLimit: 15,
			});
			const encoded = encodeMessage(msg);
			const decoded = decodeMessage(encoded);
			expect(decoded).toEqual(msg);
		});

		it("round-trips input_response message", () => {
			const msg = inputResponseMessage("req-1", {
				playerId: "p1",
				value: "B",
				timestamp: 12345,
			});
			const encoded = encodeMessage(msg);
			const decoded = decodeMessage(encoded);
			expect(decoded).toEqual(msg);
		});

		it("round-trips phase_change message", () => {
			const msg = phaseChangeMessage("ended", { reason: "timeout" });
			const encoded = encodeMessage(msg);
			const decoded = decodeMessage(encoded);
			expect(decoded).toEqual(msg);
		});

		it("round-trips error message", () => {
			const msg = errorMessage("RATE_LIMITED", "Too many messages");
			const encoded = encodeMessage(msg);
			const decoded = decodeMessage(encoded);
			expect(decoded).toEqual(msg);
		});

		it("round-trips player_reconnect message", () => {
			const msg = playerReconnectMessage("p2");
			const encoded = encodeMessage(msg);
			const decoded = decodeMessage(encoded);
			expect(decoded).toEqual(msg);
		});
	});

	describe("decodeMessage edge cases", () => {
		it("returns null for invalid JSON", () => {
			expect(decodeMessage("not json")).toBeNull();
		});

		it("returns null for missing type field", () => {
			expect(decodeMessage(JSON.stringify({ data: "test" }))).toBeNull();
		});

		it("returns null for unknown message type", () => {
			expect(
				decodeMessage(JSON.stringify({ type: "unknown_type" })),
			).toBeNull();
		});

		it("returns null for non-string type", () => {
			expect(decodeMessage(JSON.stringify({ type: 42 }))).toBeNull();
		});

		it("decodes ArrayBuffer input", () => {
			const msg = errorMessage("TEST", "test error");
			const encoded = encodeMessage(msg);
			const buffer = new TextEncoder().encode(encoded).buffer;
			const decoded = decodeMessage(buffer as ArrayBuffer);
			expect(decoded).toEqual(msg);
		});
	});

	describe("message factory functions", () => {
		it("stateUpdateMessage has correct type", () => {
			const msg = stateUpdateMessage(makeRoomState());
			expect(msg.type).toBe("state_update");
		});

		it("phaseChangeMessage includes optional metadata", () => {
			const msg = phaseChangeMessage("playing", { round: 2 });
			expect(msg.type).toBe("phase_change");
			expect(
				(msg as PartyMessage & { metadata?: Record<string, unknown> }).metadata,
			).toEqual({ round: 2 });
		});

		it("phaseChangeMessage works without metadata", () => {
			const msg = phaseChangeMessage("ended");
			expect(msg.type).toBe("phase_change");
		});
	});
});
