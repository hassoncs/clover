# Identity: Slopcade

Brand bible for the Slopcade product. Every UI decision, generated content, and user-facing copy should be measured against this document.

---

## One Line

**An AI-powered game engine where anyone can create, remix, and play infinite games.**

## Tagline

Make games. Break games. Play games.

## What It Is

Slopcade is a physics-based game engine and AI-powered game creation platform. Users describe a game in natural language, and the platform generates the logic, assets, and sounds. Games are remixable — fork any game, swap themes, modify scripts, and publish. Everything is composable: scripts, physics, prefabs, and visuals are independent layers that can be mixed and matched.

## What It Is Not

- Not a casual mobile game (it's a creation platform)
- Not a code-free toy (real scripting power under the hood)
- Not just for kids (the engine is genuinely capable)

## Relationship to Amen

Slopcade is the platform. Amen is one product built on it. Slopcade users may never know Amen exists, and vice versa. They share infrastructure but nothing user-facing. The codebase lives in `apps/slopcade/`. The brand enum is `"slopcade"` in content pipeline routes.

---

## Audience

| Segment | Entry Point | Why They Stay |
|---------|-------------|---------------|
| **Casual Creators** | "Make me a Flappy Bird" prompt | See their game come alive in seconds |
| **Tinkerers** | Fork an existing game, tweak scripts | Real scripting gives depth beyond templates |
| **Party Gamers** | Host a multiplayer session | Instant fun with friends, no setup |
| **Game Jam Enthusiasts** | Rapid prototyping | Engine handles the boring parts |

**Primary user**: Someone who has an idea for a game but doesn't want to learn Unity. They describe what they want, the AI builds it, and they iterate from there.

---

## Visual Identity

### Colors

| Role | Color | Hex |
|------|-------|-----|
| Primary | Sky Blue | `#0ea5e9` |
| Secondary | Slate | `#64748b` |
| Accent | Electric Purple | `#8B5CF6` |
| Background | Near Black | `#0F172A` |
| Surface | Dark Slate | `#1E293B` |
| Text | White | `#F8FAFC` |
| Success | Emerald | `#10B981` |
| Error | Red | `#EF4444` |
| Warning | Amber | `#F59E0B` |

### Typography

| Role | Font | Weight |
|------|------|--------|
| Headings | Inter | Bold / Black |
| Body | Inter | Regular |
| Code / Editor | JetBrains Mono | Regular |

### Design Principles

- **Dark-first.** The editor, game player, and creation tools are all dark-themed. Games pop against dark backgrounds.
- **Energetic, not chaotic.** Bright accents on dark surfaces. Motion and animation should feel snappy and intentional, not random.
- **Tool-forward.** The UI should feel like a creative tool (VS Code, Figma) — not a toy. Power users should feel at home.
- **Playful with an edge.** Slopcade has personality. Irreverent copy, bold colors, and a "we don't take ourselves too seriously" vibe.
- **Information-dense when needed.** The editor can show lots of data. Don't sacrifice utility for aesthetics.

### Do's and Don'ts

| Do | Don't |
|----|-------|
| Use neon accents on dark surfaces | Make it look like a children's toy |
| Celebrate chaos and creativity | Be sterile or corporate |
| Show the engine's power | Oversimplify what the platform can do |
| Use sharp, modern typography | Use rounded, bubbly fonts |

---

## Voice & Tone

### Character

Slopcade talks like **a friend who's really into game dev and wants to show you something cool.** Enthusiastic, slightly irreverent, technical when it matters, casual always.

### Writing Style

- **Energetic over calm.** "Let's go!" not "Proceed to the next step."
- **Irreverent over polished.** "This game is pure slop and we love it" not "Your creation has been saved."
- **Direct over formal.** "Fork it. Break it. Ship it." not "Utilize our remix capabilities."
- **Inclusive over gatekeepy.** Anyone can make games. No prerequisites. No "you should already know..."

### Voice Examples

| Context | Slopcade Says | Slopcade Never Says |
|---------|--------------|-------------------|
| Game created | "It's alive!" | "Your game has been created successfully." |
| Player wins | "DESTROYED!" | "Congratulations, you win." |
| Error | "Something broke. Here's what happened:" | "An unexpected error has occurred." |
| Empty state | "Nothing here yet. Make something." | "No content to display." |
| Fork action | "Yoink. It's yours now." | "A copy has been created." |

---

## Platforms

| Platform | URL / Identifier | Port (Dev) |
|----------|-----------------|------------|
| Web | [slopcade.com](https://slopcade.com) | 8085 |
| iOS | `com.slopcade.app` (bundle ID) | — |
| Android | `com.slopcade.app` (package) | — |
| Landing | [slopcade.com](https://slopcade.com) | — |
| Admin | admin.slopcade.localhost:1355 (dev) | dynamic |
| Storybook | storybook.slopcade.localhost:1355 (dev) | dynamic |

**Metro port**: 8085 (can run simultaneously with Amen on 8086).

---

## Core Concepts

| Concept | What It Is |
|---------|-----------|
| **Game** | A playable thing: scripts + prefabs + physics + assets |
| **Prefab** | An entity archetype (ball, paddle, brick) — the blueprint |
| **Script** | JS logic attached to prefabs via `scriptRef` |
| **Theme** | A reusable aesthetic direction ("Halloween", "Pixel Sci-Fi") |
| **Asset Pack** | A complete set of generated images for one game + one theme |
| **Fork** | A copy of a game you can modify freely |

### The Composability Equation

```
GAME = LOGIC (scripts, physics, prefabs) + VISUALS (theme, asset pack)
```

Logic and visuals are independent layers. Fork a game and get all its asset packs. Apply a theme to any game. Mix and match.

---

## Pricing

### Individual

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | 3 party hostings/month, 4 players max, 80/20 creator split |
| Pro | $4.99/mo or $39.99/yr | Unlimited hosting, 12 players max, 85/15 split, cloud sync |

### Sparks (AI Credits)

| Pack | Price | Sparks | Bonus |
|------|-------|--------|-------|
| Starter | $0.99 | 50 | 0% |
| Creator | $4.99 | 275 | 10% |
| Studio | $19.99 | 1,200 | 20% |

1 Spark = $0.01. Signup bonus: 500 Sparks ($5.00 value).

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Rendering | Godot 4 (WASM + Native) + React Native + Skia |
| Game Logic | QuickJS sandbox (server-authoritative) |
| Multiplayer | Cloudflare Durable Objects (WebSocket) |
| API | Cloudflare Workers + tRPC |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 (content-addressed blobs) |
| Auth | Supabase (Google, Apple, Email) |
| Billing | Stripe (web) + RevenueCat (iOS/Android) |
| AI Assets | Scenario.com (images), ElevenLabs (audio) |
| AI Logic | OpenRouter (game generation, content) |
| Mobile | Expo + React Native |

---

## Content Pipeline

- **Brand enum**: `"slopcade"` in `partyContent` API routes
- **Content types**: Same format types as Amen, but with secular/general themes
- **Tone**: Irreverent, chaotic, funny — nothing off-limits except hate speech and illegal content
- **Generation**: AI-generated game logic, assets, and sounds from natural language prompts
