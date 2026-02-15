# Slopcade Party Games Roadmap

## Executive Summary
We're building 50+ original party games inspired by proven mechanics. Our platform (PartyRoomDO + content pipeline) already supports text/choice/drawing/buzzer input, real-time sync, and AI content generation. The goal is to rapidly expand the catalog by leveraging existing infrastructure and a robust content generation pipeline.

## Infrastructure Capability Map

| Capability | Status | Notes |
|---|---|---|
| Party room (PartyRoomDO) | ✅ BUILT | Durable Object room lifecycle, state sync, WebSocket |
| Template runner pattern | ✅ BUILT | async (room) => {} with phase machine |
| Timer/countdown sync | ✅ BUILT | startCountdown() synced to all clients |
| Scoring/leaderboard | ✅ BUILT | updatePlayerScore() + buildScoreboard() |
| Text input | ✅ BUILT | Production-ready |
| Choice/voting input | ✅ BUILT | Head-to-head and group voting proven |
| Buzzer input | ⚠️ PARTIAL | Exists, needs speed/lockout UX |
| Drawing input | ⚠️ PARTIAL | Pixel buffer exists, needs template conventions |
| Content generation CLI | ✅ BUILT | OpenRouter + moderation pipeline |
| Quip/trivia/drawing/WYR/estimation schemas | ✅ BUILT | Ready to generate |
| Fibbage/caption/word schemas | ⚠️ PARTIAL | Defined, generation not wired |
| TTS/SFX (ElevenLabs) | ✅ BUILT | Voice + sound effects |
| Mic capture + STT | ✅ BUILT | Web + Native, needs game wrappers |
| Team support | 🔴 NEEDS BUILDING | Team assignment, team scoring |
| Hidden roles / secret state | 🔴 NEEDS BUILDING | Per-player payload filtering |
| Private messaging | 🔴 NEEDS BUILDING | DM channels for social games |
| Simultaneous editing (text/canvas) | 🔴 NEEDS BUILDING | CRDT-lite for concurrent input |
| Bracket/tournament engine | 🔴 NEEDS BUILDING | Elimination bracket + voting |
| Prediction/betting system | 🔴 NEEDS BUILDING | Confidence wagers, payouts |
| Auction/economy engine | 🔴 NEEDS BUILDING | Blind bids, loans, net worth |
| Audio-as-input gameplay | 🔴 NEEDS BUILDING | Volume, timing, beat detection |
| Real-time physics/action | 🔴 NEEDS BUILDING | For action minigames |
| Mass audience mode (100+) | ⚠️ PARTIAL | Needs scale hardening |

## Game Catalog Overview

| Working Title | Wave | Tier | Effort | Mechanic Category |
|---|---|---|---|---|
| Punchline Duel | 1 | 1 | S | Comedy/Writing |
| Open Mic Frenzy | 1 | 1 | S | Comedy/Writing |
| Quickfire Q&A | 1 | 1 | S | Trivia |
| Ruin and Redeem | 2 | 2 | M | Comedy/Writing |
| Out of Context | 2 | 2 | M | Comedy/Writing |
| Half and Half | 2 | 2 | M | Social/Voting |
| Lexicon Ladder | 2 | 2 | M | Word Game |
| Role Replay | 2 | 2 | M | Social/Roleplay |
| Chain Reaction | 2 | 2 | M | Word Game |
| About You Bluff | 2 | 2 | M | Bluffing/Social |
| Clue Builder | 3 | 3 | M | Word Game |
| Consensus Mine | 3 | 3 | M | Consensus |
| Drawful Animate | 3 | 3 | L | Drawing/Animation |
| Fortune Wheel | 3 | 3 | M | Trivia/Luck |
| Matchmaker Grid | 3 | 3 | M | Social |
| Oddity Appraiser | 3 | 3 | M | Estimation |
| Percent Panic | 3 | 3 | M | Estimation |
| Rival Roster | 3 | 3 | M | Drafting |
| Shirt Clash | 3 | 3 | L | Design |
| Sketch Bluff | 3 | 3 | M | Drawing/Bluffing |
| Sound Slam | 3 | 3 | M | Sound |
| Spectrum Guess | 3 | 3 | M | Spectrum |
| Truth Trap | 3 | 3 | M | Social |
| Year Jinx | 3 | 3 | M | Trivia/Time |
| Alien Audit | 4 | 4 | L | Social Deduction |
| Auction Arena | 4 | 4 | L | Bidding |
| Bake Battle | 4 | 4 | L | Design/Voting |
| Borrowed Words | 4 | 4 | M | Word Game |
| Bracket Bet | 4 | 4 | M | Tournament |
| Caption Clash Live | 4 | 4 | M | Writing |
| Chaos Edit | 4 | 4 | L | Chaos Edit |
| Deadly Quizhouse | 4 | 4 | L | Trivia/Elimination |
| Defuse Hotline | 4 | 4 | L | Cooperative |
| Faux Signal | 4 | 4 | M | Faux Signal |
| Flip Sketch Bluff | 4 | 4 | M | Drawing |
| Hidden Glyph Hunt | 4 | 4 | M | Hidden Glyph |
| Midnight Match | 4 | 4 | M | Memory |
| Persona Outlier | 4 | 4 | M | Persona Outlier |
| Pitch Factory | 4 | 4 | L | Pitch Factory |
| Punchline Ferry | 4 | 4 | M | Writing |
| Relay Canvas | 4 | 4 | L | Drawing |
| Robo Rumble Rhymes | 4 | 4 | L | Writing/Music |
| Slide Improv | 4 | 4 | L | Improv |
| Snark Quiz Show | 4 | 4 | L | Trivia |
| Sound Remix Show | 4 | 4 | L | Sound |
| Survey Sleuth | 4 | 4 | M | Survey |
| Truth Swarm | 4 | 4 | M | Truth Swarm |
| Beat Brigade | 5 | 5 | XL | Rhythm |
| Drop Sort | 5 | 5 | L | Sorting |
| Family Frenzy | 5 | 5 | L | Survey |
| Slingshot Dome | 5 | 5 | XL | Physics |
| Trivia Quest | 5 | 5 | XL | RPG Trivia |

## Build Waves

### Wave 1 (Week 1-2): Content Refresh
- **Deliverables**: 3 games using existing templates (`quiplash.ts`, `crowd-comedy.ts`, `question-answer.ts`).
- **Focus**: Validating the content pipeline and ensuring high-quality AI-generated prompts.

### Wave 2 (Week 3-4): Minor Template Modifications
- **Deliverables**: 7 games requiring small tweaks to existing logic (e.g., different scoring, minor phase changes).
- **Focus**: Expanding the variety of gameplay without major infrastructure work.

### Wave 3 (Month 2): New Templates, Existing Inputs
- **Deliverables**: 14 games using new template logic but relying on proven input types (text, choice, drawing).
- **Focus**: Scaling the catalog and introducing more diverse mechanics like drafting and estimation.

### Wave 4 (Month 3): New Input Types/Features
- **Deliverables**: ~20 games introducing more complex features like hidden roles, brackets, and auctions.
- **Focus**: Deepening the platform's capabilities and supporting more advanced social mechanics.

### Wave 5 (Month 4+): Major Infrastructure
- **Deliverables**: 5 high-effort games requiring significant new systems (physics, rhythm, RPG elements).
- **Focus**: Pushing the boundaries of the platform with unique, high-production-value experiences.

## Content Pipeline Expansion
Priority-ordered list of new content schemas needed:
1. **Fibbage/Bluffing Schema**: For "About You Bluff" and similar games.
2. **Word/Definition Schema**: For "Lexicon Ladder" and "Borrowed Words".
3. **Caption Schema**: For "Caption Clash Live".
4. **Survey Schema**: For "Survey Sleuth" and "Family Frenzy".
5. **Estimation/Statistic Schema**: For "Oddity Appraiser" and "Percent Panic".

## Platform Feature Roadmap
Priority-ordered list of new platform capabilities needed:
1. **Team Support**: Assignment and scoring logic.
2. **Hidden Roles / Secret State**: Per-player data filtering.
3. **Bracket/Tournament Engine**: Automated elimination flows.
4. **Auction/Economy Engine**: Bidding and currency management.
5. **Simultaneous Editing**: CRDT-lite for shared canvases or text.
