---
name: editor-browser-testing
description: Use when testing the editor UI via agent-browser, debugging editor chat, running E2E tests on the game editor, or automating browser interactions with the editor page. Covers dev auth, accessibility landmarks, content mirrors, chat flow, and common issues.
---

# Editor Browser Testing

> **Skill for AI Agents**: Testing the editor UI via agent-browser automation

## When to Use This Skill

Load when: testing editor UI, debugging editor chat, using agent-browser with the editor, E2E testing game creation flow

## Dev Auth

The dev user auto-authenticates via `Bearer dev-token` → user ID `00000000-0000-0000-0000-000000000000`.

**Games must be owned by this user** to open the editor. The editor checks `game.userId === auth.user.id` and blocks access otherwise.

### Creating a test game as the dev user

```bash
curl -s -X POST "http://localhost:8789/trpc/games.create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{"title":"Test Game","definition":"{\"metadata\":{\"title\":\"Test Game\"},\"world\":{\"gravity\":{\"x\":0,\"y\":9.8},\"bounds\":{\"width\":20,\"height\":12},\"pixelsPerMeter\":50},\"entities\":{},\"templates\":{},\"scenes\":{\"main\":{\"entities\":[]}},\"globalVariables\":{},\"rules\":[]}","isPublic":false}'
```

Extract the `id` from the response and navigate to `/editor/{id}`.

**System user** (`00000000-0000-0000-0000-000000000001`) owns auto-seeded games from R2. These are NOT editable by the dev user.

## Editor URL

```
http://localhost:8085/editor/{gameId}
```

## Accessibility Landmarks (Snapshot Reference)

These labels appear in `agent-browser snapshot` output:

| Element | Snapshot appearance | How to find |
|---------|-------------------|-------------|
| File explorer | `tree "File Tree"` | Always visible when Explorer panel is open |
| File tree items | `treeitem "filename" [selected]` | `[selected]` marks the active file |
| File tabs | `tab "filename"` in `tablist` | `accessibilityState: selected` marks active tab |
| Code editor | `region "Code editor"` | Contains the CodeMirror instance |
| Chat message list | `list:` | Contains all chat messages |
| User messages | `region "User message"` | Includes message text inline |
| Assistant messages | `region "Assistant message"` | Includes response text inline |
| Message input | `textbox "Message input"` | Always at bottom of chat panel |
| Send button | `button "Send message"` | Disabled when input is empty |
| Preview tab | `tab "Preview"` | Switches to game preview |

### Panel testIDs

| Panel | testID |
|-------|--------|
| Chat sidebar | `editor-chat-panel` |
| File explorer | `editor-explorer-panel` |
| File viewer | `file-viewer` |
| Code editor | `file-viewer-editor` |
| Stage area | `stage-area` |
| Preview tab | `preview-tab` |
| Chat message list | `chat-message-list` |

## Reading File Content

CodeMirror content is invisible to the accessibility tree. Use the **hidden content mirror**:

```bash
agent-browser eval 'document.querySelector("[data-testid=code-content-mirror]")?.textContent'
```

This `<pre>` element mirrors the current file's content and updates when you switch tabs.

**Do NOT use** `document.querySelector(".cm-content")?.textContent` — fragile, depends on CodeMirror internals.

## Chat Testing Flow

```bash
# 1. Find the input (always labeled)
agent-browser snapshot -i | grep "Message input"
# → textbox "Message input" [ref=eXX]

# 2. Type and send
agent-browser fill eXX "Your message here"
agent-browser click eYY  # Send message button ref

# 3. Wait for response (15-20s for GPT-4o with tool calls)
sleep 20

# 4. Check response
agent-browser snapshot | grep 'region "Assistant message"' | tail -3
# → Shows assistant response text inline

# 5. Verify file changes via content mirror
agent-browser click eZZ  # Click file in tree
agent-browser eval 'document.querySelector("[data-testid=code-content-mirror]")?.textContent'
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| 403 on sendMessage | Game not owned by dev user | Create game with `Bearer dev-token` |
| Editor shows "You don't own this game" | Same ownership issue | Use a game created by dev user |
| 0 output tokens, empty response | `gpt-oss-120b:nitro` model broken with tools | Default is now `balanced` (GPT-4o) |
| Metro crashed after file edit | Hot reload failure | `devmux start web` |
| Chat error invisible | tRPC error silently swallowed | Error banner now shows in chat panel |

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /trpc/chatThreads.sendMessage` | Send chat message, returns `streamUrl` |
| `GET /api/chat/stream?threadId=X&token=Y` | SSE stream for agent response |
| `GET /trpc/games.get?input={"id":"X"}` | Get game details |
| `POST /trpc/games.create` | Create new game |

## Services Required

```bash
devmux start web   # Metro on :8085
devmux start api   # API on :8789
```

Check with `devmux status`. API must be running for chat to work.
