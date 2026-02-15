# MVP Moderation Policy Baseline

This document defines the initial blocked categories and keyword/regex patterns for user-facing AI ingress points.

## 1. Policy Goals
- **Safety**: Prevent generation of harmful, illegal, or sexually explicit content.
- **Compliance**: Adhere to provider (OpenRouter/Anthropic) terms of service.
- **Simplicity**: Use a "cheap, weak" filter (regex/keywords) for MVP instead of expensive ML APIs.
- **Transparency**: Provide clear feedback when a prompt is blocked.

## 2. Blocked Categories

### A. Sexually Explicit Content (NSFW)
**Rationale**: Slopcade is for children ages 6-14. Zero tolerance for adult content.
- **Keywords**: `porn`, `nsfw`, `naked`, `nude`, `sex`, `erotic`, `hentai`, `fetish`
- **Regex**: `\b(s[e3]x|p[o0]rn|n[u0]de)\b`

### B. Extreme Violence & Gore
**Rationale**: Prevent generation of disturbing or traumatizing imagery/scenarios.
- **Keywords**: `gore`, `blood`, `murder`, `kill`, `suicide`, `torture`, `decapitate`, `mutilate`
- **Regex**: `\b(k[i1]ll|m[u0]rd[e3]r|bl[o0][o0]d)\b`

### C. Hate Speech & Harassment
**Rationale**: Maintain a positive, inclusive environment.
- **Keywords**: [Standard list of slurs and hate speech terms]
- **Regex**: `\b(nigger|faggot|kike|chink|spic)\b` (and common variations)

### D. Illegal Acts & Dangerous Activities
**Rationale**: Prevent the app from being used to facilitate or promote crime.
- **Keywords**: `drugs`, `cocaine`, `heroin`, `meth`, `bomb`, `explosive`, `terrorist`, `hack`
- **Regex**: `\b(dr[u0]gs|b[o0]mb|h[a4]ck)\b`

### E. PII Requests (Personal Identifiable Information)
**Rationale**: Prevent users from trying to trick the AI into revealing or collecting private data.
- **Keywords**: `address`, `phone number`, `social security`, `credit card`, `password`, `email`
- **Regex**: `\b(ssn|credit\s*card|password)\b`

## 3. Implementation Strategy (MVP)

1. **Pre-flight Check**: Run the prompt through a combined regex/keyword filter before calling the LLM.
2. **Normalization**: Lowercase and strip special characters from the prompt before checking.
3. **Error Handling**: Return a standard `TRPCError` with code `BAD_REQUEST` and a message like: "Your prompt contains content that violates our safety guidelines."
4. **Logging**: Log blocked prompts (anonymized) to monitor for false positives and policy evasion.

## 4. Versioning
- **Current Version**: 1.0.0 (MVP Baseline)
- **Last Updated**: 2026-02-15

---
*Note: This list is intentionally minimal and will be expanded based on real-world usage patterns.*
