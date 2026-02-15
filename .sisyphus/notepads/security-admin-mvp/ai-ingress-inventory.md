# AI Ingress Inventory & Moderation Policy Baseline

## AI Ingress Points

| File Path | Function/Endpoint | Prompt Input Location | AI Provider | Model |
|-----------|-------------------|-----------------------|-------------|-------|
| `api/src/trpc/routes/games.ts` | `generate` | `input.prompt` | OpenRouter | `openai/gpt-4o` (default) |
| `api/src/trpc/routes/games.ts` | `refine` | `input.request` | OpenRouter | `openai/gpt-4o` (default) |
| `api/src/trpc/routes/chat-threads.ts` | `sendMessage` | `input.text` | OpenRouter | `anthropic/claude-sonnet-4` (via `chat-handler.ts`) |
| `api/src/trpc/routes/asset-system/generation-jobs.ts` | `createGenerationJob` | `input.promptDefaults.themePrompt` | OpenRouter | `anthropic/claude-sonnet-4` (via `theme-planner.ts`) |
| `api/src/trpc/routes/asset-system/generation-jobs.ts` | `processGenerationJob` | `task.compiled_prompt` | Scenario / Modal | Scenario (default) |

## MVP Blocked Categories (Baseline)

The following categories are blocked for the MVP. This is a small, explicit list intended for keyword/regex matching.

### 1. Violence & Gore
- **Rationale**: Slopcade is intended for children ages 6-14.
- **Keywords**: kill, murder, blood, gore, decapitate, torture, slaughter, suicide, self-harm.

### 2. Sexual Content
- **Rationale**: Safety and compliance with app store policies for minors.
- **Keywords**: sex, porn, naked, nude, erotic, hentai, genitals, breast, penis, vagina.

### 3. Hate Speech & Harassment
- **Rationale**: Community safety and toxicity prevention.
- **Keywords**: [Common slurs], nazi, hitler, racist, sexist, homophobic, transphobic.

### 4. Illegal Activities
- **Rationale**: Legal compliance and safety.
- **Keywords**: drugs, cocaine, heroin, meth, bomb, explosive, terrorist, hacking, stolen.

## Implementation Strategy (Wave 2)

- **Keyword Matching**: Simple case-insensitive keyword check on ingress.
- **Regex**: Use word boundaries `\bkeyword\b` to avoid false positives (e.g., "button" containing "butt").
- **Versioned List**: Store the list in a central configuration file (e.g., `api/src/security/blocked-keywords.ts`).
- **Error Response**: Return a standard `TRPCError` with code `BAD_REQUEST` and a message like "Your prompt contains content that violates our safety guidelines."
