# Crowd Comedy — Testing Guide

## Prerequisites

1. **API running locally**: `pnpm dev` from repo root (starts Metro + API on :8789)
2. **3+ devices/tabs** to simulate players (browser tabs work fine)

---

## Quick Smoke Test (CLI only, no app UI)

You can test the entire game flow using just `curl` + `websocat` (WebSocket CLI tool).

### 1. Install websocat (if needed)
```bash
brew install websocat
```

### 2. Create a room
```bash
curl -s -X POST http://localhost:8789/api/party/create \
  -H "Content-Type: application/json" \
  -d '{"template":"crowd-comedy","minPlayers":3}' | jq .
```
Response:
```json
{ "code": "ABCD", "hostToken": "uuid-here", "hostId": "uuid-here" }
```
Save the `code` and `hostToken`.

### 3. Connect host
```bash
websocat "ws://localhost:8789/api/party/ABCD/ws?role=host&token=YOUR_HOST_TOKEN"
```
You'll receive a `state_update` message with the lobby state.

### 4. Connect players (in separate terminals)
```bash
# Player 1
websocat "ws://localhost:8789/api/party/ABCD/ws?role=player&name=Alice"

# Player 2
websocat "ws://localhost:8789/api/party/ABCD/ws?role=player&name=Bob"

# Player 3
websocat "ws://localhost:8789/api/party/ABCD/ws?role=player&name=Charlie"
```

### 5. Start the game (from host terminal)
```json
{"type":"start_game"}
```

### 6. Respond to ready check (each player terminal)
When you see `input_request` with `requestId: "ready-check"`:
```json
{"type":"input_response","requestId":"ready-check","response":{"playerId":"","value":"ready","timestamp":1234567890}}
```

### 7. Submit answers (each player)
When you see `input_request` with `requestId: "answer-r1"`:
```json
{"type":"input_response","requestId":"answer-r1","response":{"playerId":"","value":"My funny answer","timestamp":1234567890}}
```

### 8. Vote (each player)
When you see `input_request` with `requestId: "vote-r1"`, vote for an answer ID from the `voteOptionsJson`:
```json
{"type":"input_response","requestId":"vote-r1","response":{"playerId":"","value":"ANSWER_ID_HERE","timestamp":1234567890}}
```

### 9. Watch the game flow
The host terminal will receive `state_update` messages showing each phase:
- `answering` → `reveal` → `voting` → `round_results` → `scores` → (repeat) → `winner`

---

## App UI Test (Full Experience)

### 1. Start the dev environment
```bash
pnpm dev
```

### 2. Open the app
- **Web**: http://localhost:8085
- **iOS**: `pnpm ios`

### 3. Host a game
1. Navigate to `/party`
2. Tap "Host Game"
3. A room code appears (e.g., "ABCD")
4. Share this code with players

### 4. Join as players
Open 2+ more browser tabs or devices:
1. Navigate to `/party`
2. Tap "Join Game"
3. Enter the room code and a name
4. You should see "Waiting for game to start..."

### 5. Start and play
1. Host taps "Start Game" (needs 3+ players)
2. Each round:
   - **Players see**: prompt + text input → type answer → submit
   - **Host sees**: "Players are answering..." (spectator)
   - All answers appear anonymously
   - Players vote for their favorite
   - Results shown with author names + scores
3. After 5 rounds, winner is announced

---

## What to Verify

| Check | Expected |
|-------|----------|
| Room creation | Returns 4-char code |
| Player join | Shows in host's player list |
| Min players | Can't start with < 3 players |
| Answer phase | 30s timer, text input works |
| Anonymous reveal | Answers shown without author names |
| Voting | Can tap an answer to vote, can't vote for own |
| Self-vote rejection | If somehow sent, server ignores it |
| Scoring | 100 pts per vote, +50 clean sweep |
| Scoreboard | Sorted by score descending |
| Winner | Highest score player announced |
| Reconnection | Closing and reopening browser reconnects within 60s |
| Timeout | If a player doesn't answer, "(no answer)" appears |

---

## Automated Tests

```bash
# Run template unit tests
pnpm --filter api test -- --run api/src/party/templates/__tests__/crowd-comedy.test.ts

# Run all party tests
pnpm --filter api test -- --run api/src/party/

# Type check
pnpm --filter api tsc --noEmit
pnpm --filter @slopcade/app tsc --noEmit
```

---

## Architecture Reference

```
Host Device (TV/laptop)          Player Devices (phones)
┌──────────────────────┐        ┌──────────────────────┐
│  /party/host         │        │  /party/play         │
│  Shows room code     │        │  Answer prompts      │
│  Player list         │        │  Vote on favorites   │
│  Game state          │        │  See scores          │
│  Scoreboard          │        │                      │
└──────────┬───────────┘        └──────────┬───────────┘
           │ WebSocket                      │ WebSocket
           └──────────┬────────────────────┘
                      │
              ┌───────▼───────┐
              │ PartyRoomDO   │  (Cloudflare Durable Object)
              │ crowd-comedy  │  (template runner)
              │ template      │
              └───────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `api/src/party/templates/crowd-comedy.ts` | Server game logic |
| `api/src/party/PartyRoomDO.ts` | Room/WebSocket management |
| `api/src/party/content/quiplash-prompts.json` | 64 fill-in-the-blank prompts |
| `app/lib/party/usePartyConnection.ts` | Client WebSocket hook |
| `app/lib/party/api.ts` | Room creation API client |
| `app/app/party/*.tsx` | UI screens |
| `app/components/party/*.tsx` | Reusable UI components |
